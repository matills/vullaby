import { supabaseAdmin } from '../../config/database';
import { ConversationManager, ConversationContext } from './conversation.manager';
import { scheduleReminder } from '../../jobs/reminder.processor';
import { TimeSlot } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logger from '../../utils/logger';

export interface MessageHandler {
  sendMessage(phone: string, message: string): Promise<any>;
  sendAppointmentConfirmation(phone: string, data: any): Promise<any>;
}

export class ConversationHandler {
  private conversationManager: ConversationManager;
  private messageHandler: MessageHandler;

  constructor(messageHandler: MessageHandler) {
    this.conversationManager = new ConversationManager();
    this.messageHandler = messageHandler;
  }

  async handleMessage(
    phone: string,
    messageBody: string,
    customer: any,
    business: any
  ): Promise<void> {
    const context = await this.conversationManager.get(phone);
    context.businessId = business.id;
    context.customerId = customer.id;

    const handlers = {
      awaiting_service: () => this.handleServiceSelection(phone, messageBody, context, business),
      awaiting_slot: () => this.handleSlotSelection(phone, messageBody, context, customer, business),
      awaiting_cancellation: () => this.handleCancellationSelection(phone, messageBody, context),
      idle: () => this.handleInitialMessage(phone, messageBody, context, customer, business),
    };

    await handlers[context.state]();
  }

  private async handleInitialMessage(
    phone: string,
    messageBody: string,
    context: ConversationContext,
    customer: any,
    business: any
  ): Promise<void> {
    const message = messageBody.toLowerCase().trim();

    const actions: Record<string, () => Promise<void>> = {
      turno: () => this.startAppointmentFlow(phone, context, business),
      reserva: () => this.startAppointmentFlow(phone, context, business),
      agendar: () => this.startAppointmentFlow(phone, context, business),
      cancelar: () => this.startCancellationFlow(phone, context, customer.id, business.id),
      horarios: () => this.sendAvailabilityMessage(phone),
      disponibilidad: () => this.sendAvailabilityMessage(phone),
    };

    for (const [keyword, action] of Object.entries(actions)) {
      if (message.includes(keyword)) {
        await action();
        return;
      }
    }

    await this.sendWelcomeMessage(phone, business.name);
  }

  private async sendWelcomeMessage(phone: string, businessName: string): Promise<void> {
    const message = `¡Hola! Bienvenido a ${businessName} 👋

Puedo ayudarte con:
📅 Agendar turno
❌ Cancelar turno

¿Qué necesitas?`;

    await this.messageHandler.sendMessage(phone, message);
  }

  private async sendAvailabilityMessage(phone: string): Promise<void> {
    await this.messageHandler.sendMessage(
      phone,
      'Para consultar disponibilidad, escribe "agendar turno" y te mostraré los horarios disponibles. 📅'
    );
  }

  private async startAppointmentFlow(
    phone: string,
    context: ConversationContext,
    business: any
  ): Promise<void> {
    const { data: services } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true);

    if (!services || services.length === 0) {
      await this.messageHandler.sendMessage(phone, 'Lo siento, no hay servicios disponibles en este momento.');
      await this.conversationManager.reset(phone);
      return;
    }

    const servicesList = services
      .map((s, i) => `${i + 1}. ${s.name} - $${s.price} (${s.duration_minutes} min)`)
      .join('\n');

    context.state = 'awaiting_service';
    await this.conversationManager.set(phone, context);

    await this.messageHandler.sendMessage(
      phone,
      `¡Perfecto! Elige un servicio:\n\n${servicesList}\n\nResponde con el número del servicio (ejemplo: 1)`
    );
  }

  private async handleServiceSelection(
    phone: string,
    messageBody: string,
    context: ConversationContext,
    business: any
  ): Promise<void> {
    const selection = parseInt(messageBody);

    if (isNaN(selection)) {
      await this.messageHandler.sendMessage(phone, 'Por favor responde con el número del servicio (ejemplo: 1)');
      return;
    }

    const { data: services } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true);

    if (!services || selection < 1 || selection > services.length) {
      await this.messageHandler.sendMessage(phone, 'Número inválido. Por favor elige un servicio de la lista.');
      return;
    }

    const selectedService = services[selection - 1];
    context.selectedServiceId = selectedService.id;

    const slots = await this.generateAvailableSlots(business.id, selectedService);
    context.availableSlots = slots;
    context.state = 'awaiting_slot';
    await this.conversationManager.set(phone, context);

    if (slots.length === 0) {
      await this.messageHandler.sendMessage(
        phone,
        `Lo siento, no hay horarios disponibles hoy para ${selectedService.name}.\n\nEscribe "turno" para intentar otro día.`
      );
      await this.conversationManager.reset(phone);
      return;
    }

    const slotsList = slots
      .slice(0, 5)
      .map((slot, i) => `${i + 1}. ${format(slot.start, 'HH:mm')}`)
      .join('\n');

    await this.messageHandler.sendMessage(
      phone,
      `Horarios disponibles hoy para ${selectedService.name}:\n\n${slotsList}\n\nResponde con el número del horario (ejemplo: 1)`
    );
  }

  private async handleSlotSelection(
    phone: string,
    messageBody: string,
    context: ConversationContext,
    customer: any,
    business: any
  ): Promise<void> {
    const selection = parseInt(messageBody);

    if (isNaN(selection) || !context.availableSlots || selection < 1 || selection > context.availableSlots.length) {
      await this.messageHandler.sendMessage(phone, 'Número inválido. Por favor elige un horario de la lista.');
      return;
    }

    const selectedSlot = context.availableSlots[selection - 1];

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('*, business:businesses(name)')
      .eq('id', context.selectedServiceId!)
      .single();

    const { data: employee } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('business_id', context.businessId!)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!service || !employee) {
      throw new Error('Service or employee not found');
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        business_id: context.businessId!,
        customer_id: customer.id,
        employee_id: employee.id,
        service_id: context.selectedServiceId!,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        status: 'confirmed',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating appointment:', error);
      throw error;
    }

    await scheduleReminder({
      id: appointment.id,
      customerId: customer.id,
      serviceId: context.selectedServiceId!,
      startTime: selectedSlot.start,
      businessId: context.businessId!,
    });

    await this.messageHandler.sendAppointmentConfirmation(phone, {
      customerName: customer.name,
      serviceName: service.name,
      employeeName: employee.name,
      startTime: selectedSlot.start,
      businessName: service.business.name,
    });

    await this.conversationManager.reset(phone);
  }

  private async generateAvailableSlots(businessId: string, service: any): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const currentTime = new Date();
    currentTime.setHours(9, 0, 0, 0);

    const endTime = new Date();
    endTime.setHours(20, 0, 0, 0);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + service.duration_minutes * 60000);
      
      if (currentTime > now) {
        slots.push({
          start: new Date(currentTime),
          end: slotEnd,
          available: true,
        });
      }

      currentTime.setTime(slotEnd.getTime());
    }

    return slots;
  }

  private async startCancellationFlow(
    phone: string,
    context: ConversationContext,
    customerId: string,
    businessId: string
  ): Promise<void> {
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('*, service:services(name), employee:employees(name)')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (!appointments || appointments.length === 0) {
      await this.messageHandler.sendMessage(phone, 'No tienes turnos próximos para cancelar.');
      return;
    }

    context.pendingAppointments = appointments;
    context.state = 'awaiting_cancellation';
    await this.conversationManager.set(phone, context);

    const appointmentsList = appointments
      .map((apt, i) => {
        const dateStr = format(new Date(apt.start_time), "d 'de' MMMM, HH:mm", { locale: es });
        return `${i + 1}. ${apt.service.name} - ${dateStr}`;
      })
      .join('\n');

    await this.messageHandler.sendMessage(
      phone,
      `Tus próximos turnos:\n\n${appointmentsList}\n\nResponde con el número del turno a cancelar (ejemplo: 1)`
    );
  }

  private async handleCancellationSelection(
    phone: string,
    messageBody: string,
    context: ConversationContext
  ): Promise<void> {
    const selection = parseInt(messageBody);

    if (isNaN(selection) || !context.pendingAppointments || selection < 1 || selection > context.pendingAppointments.length) {
      await this.messageHandler.sendMessage(phone, 'Número inválido. Por favor elige un turno de la lista.');
      return;
    }

    const appointmentToCancel = context.pendingAppointments[selection - 1];

    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentToCancel.id);

    if (error) throw error;

    const dateStr = format(new Date(appointmentToCancel.start_time), "d 'de' MMMM 'a las' HH:mm", { locale: es });
    await this.messageHandler.sendMessage(phone, `✅ Tu turno del ${dateStr} ha sido cancelado exitosamente.`);

    await this.conversationManager.reset(phone);
  }
}