import { supabaseAdmin } from '../../config/database';
import { ConversationManager, ConversationContext } from './conversation.manager';
import { scheduleReminder } from '../../jobs/reminder.processor';
import { TimeSlot } from '../../types';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DateParser } from '../../utils/date.parser';
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

    // Check if user wants to restart the flow with keywords
    const message = messageBody.toLowerCase().trim();
    const restartKeywords = ['turno', 'reserva', 'agendar', 'cancelar'];
    const wantsToRestart = restartKeywords.some(kw => message.includes(kw));

    // If user is in a flow but uses restart keywords, reset and handle as initial message
    if (context.state !== 'idle' && wantsToRestart) {
      await this.conversationManager.reset(phone);
      const newContext = await this.conversationManager.get(phone);
      newContext.businessId = business.id;
      newContext.customerId = customer.id;
      await this.handleInitialMessage(phone, messageBody, newContext, customer, business);
      return;
    }

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

    if (message.includes('cancelar')) {
      await this.startCancellationFlow(phone, context, customer.id, business.id);
      return;
    }

    if (message.includes('horarios') || message.includes('disponibilidad')) {
      await this.sendAvailabilityMessage(phone);
      return;
    }

    const hasAppointmentKeyword = ['turno', 'reserva', 'agendar'].some(kw => message.includes(kw));
    
    if (hasAppointmentKeyword) {
      const parsedDate = DateParser.extractDateFromMessage(messageBody, business.timezone);
      
      if (parsedDate) {
        logger.whatsapp('date_parsed', phone, {
          customerId: customer.id,
          businessId: business.id,
          parsedDate: parsedDate.date.toISOString(),
          pattern: parsedDate.matchedText,
          confidence: parsedDate.confidence,
        });

        context.selectedDate = parsedDate.date;
        await this.conversationManager.set(phone, context);
        await this.startAppointmentFlow(phone, context, business);
      } else {
        await this.startAppointmentFlow(phone, context, business);
      }
      return;
    }

    await this.sendWelcomeMessage(phone, business.name);
  }

  private async sendWelcomeMessage(phone: string, businessName: string): Promise<void> {
    const message = `Hola! Bienvenido a ${businessName}

Puedo ayudarte con:
- Agendar turno
- Cancelar turno

Que necesitas?`;

    await this.messageHandler.sendMessage(phone, message);
  }

  private async sendAvailabilityMessage(phone: string): Promise<void> {
    await this.messageHandler.sendMessage(
      phone,
      'Para consultar disponibilidad, escribe "agendar turno" y te mostrare los horarios disponibles.'
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

    const dateInfo = context.selectedDate 
      ? `\nFecha: ${format(typeof context.selectedDate === 'string' ? parseISO(context.selectedDate) : context.selectedDate, "EEEE d 'de' MMMM", { locale: es })}`
      : '';

    await this.messageHandler.sendMessage(
      phone,
      `Perfecto! Elige un servicio:\n\n${servicesList}${dateInfo}\n\nResponde con el numero del servicio (ejemplo: 1)`
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
      await this.messageHandler.sendMessage(phone, 'Por favor responde con el numero del servicio (ejemplo: 1)');
      return;
    }

    const { data: services } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true);

    if (!services || selection < 1 || selection > services.length) {
      await this.messageHandler.sendMessage(phone, 'Numero invalido. Por favor elige un servicio de la lista.');
      return;
    }

    const selectedService = services[selection - 1];
    context.selectedServiceId = selectedService.id;

    const targetDate = context.selectedDate || new Date();
    const slots = await this.generateAvailableSlots(business.id, selectedService, targetDate);
    
    context.availableSlots = slots;
    context.state = 'awaiting_slot';
    await this.conversationManager.set(phone, context);

    // Ensure targetDate is a Date object for formatting
    const dateObj = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;

    if (slots.length === 0) {
      const dateStr = format(dateObj, "EEEE d 'de' MMMM", { locale: es });
      await this.messageHandler.sendMessage(
        phone,
        `Lo siento, no hay horarios disponibles el ${dateStr} para ${selectedService.name}.\n\nEscribe "turno" para intentar otro dia.`
      );
      await this.conversationManager.reset(phone);
      return;
    }

    const dateStr = format(dateObj, "EEEE d 'de' MMMM", { locale: es });
    const slotsList = slots
      .slice(0, 5)
      .map((slot, i) => `${i + 1}. ${format(slot.start, 'HH:mm')}`)
      .join('\n');

    await this.messageHandler.sendMessage(
      phone,
      `Horarios disponibles el ${dateStr} para ${selectedService.name}:\n\n${slotsList}\n\nResponde con el numero del horario (ejemplo: 1)`
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
      await this.messageHandler.sendMessage(phone, 'Numero invalido. Por favor elige un horario de la lista.');
      return;
    }

    const selectedSlot = context.availableSlots[selection - 1];

    // Convert slot times back to Date objects (they're serialized as strings in Redis)
    const startTime = typeof selectedSlot.start === 'string' ? new Date(selectedSlot.start) : selectedSlot.start;
    const endTime = typeof selectedSlot.end === 'string' ? new Date(selectedSlot.end) : selectedSlot.end;

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
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating appointment', error, {
        customerId: customer.id,
        businessId: context.businessId,
        serviceId: context.selectedServiceId,
      });
      throw error;
    }

    logger.appointment('created', appointment.id, {
      businessId: context.businessId,
      customerId: customer.id,
      serviceId: context.selectedServiceId,
      startTime: startTime.toISOString(),
    });

    await scheduleReminder({
      id: appointment.id,
      customerId: customer.id,
      serviceId: context.selectedServiceId!,
      startTime: startTime,
      businessId: context.businessId!,
    });

    await this.messageHandler.sendAppointmentConfirmation(phone, {
      customerName: customer.name,
      serviceName: service.name,
      employeeName: employee.name,
      startTime: startTime,
      businessName: service.business.name,
    });

    await this.conversationManager.reset(phone);
  }

  private async generateAvailableSlots(businessId: string, service: any, targetDate: Date | string): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    // Ensure targetDate is a Date object
    const dateObj = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate;
    const dayStart = startOfDay(dateObj);
    const dayEnd = endOfDay(dateObj);
    
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', dayStart.toISOString())
      .lte('start_time', dayEnd.toISOString());

    const currentTime = new Date(dayStart);
    currentTime.setHours(9, 0, 0, 0);

    const endTime = new Date(dayStart);
    endTime.setHours(20, 0, 0, 0);

    const now = new Date();

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + service.duration_minutes * 60000);
      
      if (currentTime > now) {
        const isOccupied = appointments?.some(apt => {
          const aptStart = new Date(apt.start_time);
          const aptEnd = new Date(apt.end_time);
          return currentTime < aptEnd && slotEnd > aptStart;
        });

        if (!isOccupied) {
          slots.push({
            start: new Date(currentTime),
            end: slotEnd,
            available: true,
          });
        }
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
      await this.messageHandler.sendMessage(phone, 'No tienes turnos proximos para cancelar.');
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
      `Tus proximos turnos:\n\n${appointmentsList}\n\nResponde con el numero del turno a cancelar (ejemplo: 1)`
    );
  }

  private async handleCancellationSelection(
    phone: string,
    messageBody: string,
    context: ConversationContext
  ): Promise<void> {
    const selection = parseInt(messageBody);

    if (isNaN(selection) || !context.pendingAppointments || selection < 1 || selection > context.pendingAppointments.length) {
      await this.messageHandler.sendMessage(phone, 'Numero invalido. Por favor elige un turno de la lista.');
      return;
    }

    const appointmentToCancel = context.pendingAppointments[selection - 1];

    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentToCancel.id);

    if (error) throw error;

    logger.appointment('cancelled', appointmentToCancel.id, {
      businessId: context.businessId,
      customerId: context.customerId,
    });

    const dateStr = format(new Date(appointmentToCancel.start_time), "d 'de' MMMM 'a las' HH:mm", { locale: es });
    await this.messageHandler.sendMessage(phone, `Tu turno del ${dateStr} ha sido cancelado exitosamente.`);

    await this.conversationManager.reset(phone);
  }
}