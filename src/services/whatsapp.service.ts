import { client as twilioClient } from '../config/twilio';
import { config } from '../config/env';
import { supabaseAdmin } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { WhatsAppMessage, TimeSlot } from '../types';
import { format, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import logger from '../utils/logger';

interface ConversationContext {
  state: 'idle' | 'awaiting_service' | 'awaiting_slot' | 'awaiting_cancellation';
  businessId?: string;
  customerId?: string;
  selectedServiceId?: string;
  availableSlots?: TimeSlot[];
  pendingAppointments?: any[];
}

class PhoneFormatter {
  static normalize(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  static format(phone: string): string {
    let cleaned = this.normalize(phone);
    
    if (!cleaned.startsWith('549')) {
      if (cleaned.startsWith('54')) {
        cleaned = '549' + cleaned.substring(2);
      } else if (cleaned.startsWith('9')) {
        cleaned = '54' + cleaned;
      } else {
        cleaned = '549' + cleaned;
      }
    }
    
    return `+${cleaned}`;
  }

  static generatePatterns(phone: string): string[] {
    const normalized = this.normalize(phone);
    
    return [
      phone,
      `+${normalized}`,
      normalized,
      `+549${normalized.replace(/^549/, '')}`,
      `549${normalized.replace(/^549/, '')}`,
      normalized.replace(/^549/, ''),
    ];
  }
}

class ConversationManager {
  private contexts: Map<string, ConversationContext> = new Map();

  get(phone: string): ConversationContext {
    const normalized = PhoneFormatter.normalize(phone);
    if (!this.contexts.has(normalized)) {
      this.contexts.set(normalized, { state: 'idle' });
    }
    return this.contexts.get(normalized)!;
  }

  set(phone: string, context: ConversationContext): void {
    const normalized = PhoneFormatter.normalize(phone);
    this.contexts.set(normalized, context);
  }

  reset(phone: string): void {
    const normalized = PhoneFormatter.normalize(phone);
    this.contexts.set(normalized, { state: 'idle' });
  }
}

class BusinessResolver {
  async findByPhone(toNumber: string): Promise<any> {
    const cleanedNumber = toNumber.replace('whatsapp:', '').trim();
    
    logger.info(`🔍 Looking for business with phone: ${cleanedNumber}`);

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('phone', cleanedNumber)
      .maybeSingle();

    if (business) {
      logger.info(`✅ Business found: ${business.name} (${business.id})`);
      return business;
    }

    const patterns = PhoneFormatter.generatePatterns(cleanedNumber);
    logger.info(`🔄 Trying additional patterns:`, patterns);

    for (const pattern of patterns) {
      const { data: businessByPattern } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('phone', pattern)
        .maybeSingle();

      if (businessByPattern) {
        logger.info(`✅ Business found with pattern ${pattern}: ${businessByPattern.name}`);
        return businessByPattern;
      }
    }

    logger.warn(`❌ No business found for phone: ${toNumber}`);
    return null;
  }
}

class CustomerManager {
  async findOrCreate(normalizedPhone: string, businessId: string): Promise<any> {
    const patterns = PhoneFormatter.generatePatterns(normalizedPhone);

    for (const pattern of patterns) {
      const { data } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('phone', pattern)
        .maybeSingle();

      if (data) {
        logger.info(`✅ Customer found: ${data.name} (${data.id})`);
        return data;
      }
    }

    logger.info(`➕ Creating new customer for: ${normalizedPhone}`);
    const { data: newCustomer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        business_id: businessId,
        phone: `+${normalizedPhone}`,
        name: 'Cliente WhatsApp',
        email: `whatsapp_${normalizedPhone}@placeholder.com`,
      })
      .select()
      .single();

    if (error || !newCustomer) {
      logger.error('❌ Error creating customer:', error);
      throw new Error('Failed to create customer');
    }

    logger.info(`✅ New customer created: ${newCustomer.id}`);
    return newCustomer;
  }
}

export class WhatsAppService {
  private conversationManager = new ConversationManager();
  private businessResolver = new BusinessResolver();
  private customerManager = new CustomerManager();

  async sendMessage(to: string, message: string) {
    try {
      if (!twilioClient) {
        logger.warn('⚠️ WhatsApp service not configured - message not sent');
        return {
          sid: 'mock-sid',
          status: 'mock',
          message: 'WhatsApp not configured',
        };
      }

      if (!config.twilio.whatsappNumber) {
        throw new AppError('WhatsApp number not configured', 503);
      }

      const formattedTo = PhoneFormatter.format(to);
      const formattedFrom = config.twilio.whatsappNumber.startsWith('whatsapp:')
        ? config.twilio.whatsappNumber
        : `whatsapp:${config.twilio.whatsappNumber}`;

      logger.info(`📤 Sending WhatsApp from ${formattedFrom} to ${formattedTo}`);

      const result = await twilioClient.messages.create({
        from: formattedFrom,
        to: `whatsapp:${formattedTo}`,
        body: message,
      });

      logger.info(`✅ WhatsApp message sent: ${result.sid}`);
      return result;
    } catch (error: any) {
      logger.error('❌ Failed to send WhatsApp message:', {
        code: error.code,
        status: error.status,
        message: error.message,
        moreInfo: error.moreInfo,
      });

      if (error.code === 63007) {
        throw new AppError(
          'WhatsApp sender not configured. Please verify your Twilio WhatsApp sandbox or production number.',
          503
        );
      }

      throw new AppError(`Failed to send message: ${error.message}`, 500);
    }
  }

  async sendAppointmentConfirmation(
    phone: string,
    appointmentData: {
      customerName: string;
      serviceName: string;
      employeeName: string;
      startTime: Date;
      businessName: string;
    }
  ) {
    const dateStr = format(appointmentData.startTime, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = format(appointmentData.startTime, 'HH:mm');

    const message = `¡Hola ${appointmentData.customerName}! ✅

Tu turno ha sido confirmado:

📅 ${dateStr}
🕐 ${timeStr}
💈 ${appointmentData.serviceName}
👤 con ${appointmentData.employeeName}

📍 ${appointmentData.businessName}

Si necesitas cancelar o reprogramar, responde a este mensaje.`;

    return this.sendMessage(phone, message);
  }

  async sendAppointmentReminder(
    phone: string,
    appointmentData: {
      customerName: string;
      serviceName: string;
      startTime: Date;
      businessName: string;
    }
  ) {
    const dateStr = format(appointmentData.startTime, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = format(appointmentData.startTime, 'HH:mm');

    const message = `Hola ${appointmentData.customerName} 👋

Te recordamos tu turno para mañana:

📅 ${dateStr}
🕐 ${timeStr}
💈 ${appointmentData.serviceName}

📍 ${appointmentData.businessName}

¡Te esperamos!`;

    return this.sendMessage(phone, message);
  }

  async handleIncomingMessage(message: WhatsAppMessage) {
    try {
      const normalizedPhone = PhoneFormatter.normalize(message.from);
      const messageBody = message.body.toLowerCase().trim();
      const context = this.conversationManager.get(normalizedPhone);

      logger.info(`📨 Processing message from: ${normalizedPhone}, State: ${context.state}`);

      const business = await this.businessResolver.findByPhone(message.to);
      if (!business) {
        logger.warn(`⚠️ No business configured for number: ${message.to}`);
        return;
      }

      const customer = await this.customerManager.findOrCreate(normalizedPhone, business.id);
      context.businessId = business.id;
      context.customerId = customer.id;

      if (context.state === 'awaiting_service') {
        await this.handleServiceSelection(normalizedPhone, messageBody, context, business);
      } else if (context.state === 'awaiting_slot') {
        await this.handleSlotSelection(normalizedPhone, messageBody, context, customer, business);
      } else if (context.state === 'awaiting_cancellation') {
        await this.handleCancellationSelection(normalizedPhone, messageBody, context);
      } else {
        await this.handleInitialMessage(normalizedPhone, messageBody, context, customer, business);
      }
    } catch (error) {
      logger.error('❌ Error handling incoming message:', error);
      await this.sendMessage(message.from, 'Disculpa, ocurrió un error. Por favor intenta más tarde.');
    }
  }

  private async handleInitialMessage(
    phone: string,
    messageBody: string,
    context: ConversationContext,
    customer: any,
    business: any
  ) {
    if (messageBody.includes('turno') || messageBody.includes('reserva') || messageBody.includes('agendar')) {
      await this.startAppointmentFlow(phone, context, business);
    } else if (messageBody.includes('cancelar')) {
      await this.startCancellationFlow(phone, context, customer.id, business.id);
    } else if (messageBody.includes('horarios') || messageBody.includes('disponibilidad')) {
      await this.sendMessage(phone, `Para consultar disponibilidad, escribe "agendar turno" y te mostraré los horarios disponibles. 📅`);
    } else {
      await this.sendWelcomeMessage(phone, business.name);
    }
  }

  private async startAppointmentFlow(phone: string, context: ConversationContext, business: any) {
    try {
      const { data: services, error } = await supabaseAdmin
        .from('services')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true);

      if (error || !services || services.length === 0) {
        await this.sendMessage(phone, 'Lo siento, no hay servicios disponibles en este momento.');
        this.conversationManager.reset(phone);
        return;
      }

      const servicesList = services
        .map((service, index) => `${index + 1}. ${service.name} - $${service.price} (${service.duration_minutes} min)`)
        .join('\n');

      const message = `¡Perfecto! Elige un servicio:

${servicesList}

Responde con el número del servicio (ejemplo: 1)`;

      context.state = 'awaiting_service';
      this.conversationManager.set(phone, context);

      await this.sendMessage(phone, message);
    } catch (error) {
      logger.error('❌ Error in startAppointmentFlow:', error);
      await this.sendMessage(phone, 'Disculpa, ocurrió un error. Por favor intenta más tarde.');
    }
  }

  private async handleServiceSelection(
    phone: string,
    messageBody: string,
    context: ConversationContext,
    business: any
  ) {
    const selection = parseInt(messageBody);

    if (isNaN(selection)) {
      await this.sendMessage(phone, 'Por favor responde con el número del servicio (ejemplo: 1)');
      return;
    }

    const { data: services } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true);

    if (!services || selection < 1 || selection > services.length) {
      await this.sendMessage(phone, 'Número inválido. Por favor elige un servicio de la lista.');
      return;
    }

    const selectedService = services[selection - 1];
    context.selectedServiceId = selectedService.id;

    const slots = await this.generateAvailableSlots(business.id, selectedService);
    context.availableSlots = slots;
    context.state = 'awaiting_slot';
    this.conversationManager.set(phone, context);

    if (slots.length === 0) {
      await this.sendMessage(phone, `Lo siento, no hay horarios disponibles hoy para ${selectedService.name}.

Escribe "turno" para intentar otro día.`);
      this.conversationManager.reset(phone);
      return;
    }

    const slotsList = slots
      .slice(0, 5)
      .map((slot, index) => `${index + 1}. ${format(slot.start, 'HH:mm')}`)
      .join('\n');

    const message = `Horarios disponibles hoy para ${selectedService.name}:

${slotsList}

Responde con el número del horario (ejemplo: 1)`;

    await this.sendMessage(phone, message);
  }

  private async handleSlotSelection(
    phone: string,
    messageBody: string,
    context: ConversationContext,
    customer: any,
    business: any
  ) {
    const selection = parseInt(messageBody);

    if (isNaN(selection) || !context.availableSlots || selection < 1 || selection > context.availableSlots.length) {
      await this.sendMessage(phone, 'Número inválido. Por favor elige un horario de la lista.');
      return;
    }

    const selectedSlot = context.availableSlots[selection - 1];

    try {
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
        logger.error('❌ Error creating appointment:', error);
        throw error;
      }

      await this.sendAppointmentConfirmation(phone, {
        customerName: customer.name,
        serviceName: service.name,
        employeeName: employee.name,
        startTime: selectedSlot.start,
        businessName: service.business.name,
      });

      this.conversationManager.reset(phone);
    } catch (error) {
      logger.error('❌ Error creating appointment:', error);
      await this.sendMessage(phone, 'Disculpa, no pude confirmar el turno. Por favor intenta nuevamente.');
    }
  }

  private async generateAvailableSlots(businessId: string, service: any): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const now = new Date();
    let currentTime = new Date();
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

      currentTime = slotEnd;
    }

    return slots;
  }

  private async startCancellationFlow(phone: string, context: ConversationContext, customerId: string, businessId: string) {
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        service:services(name),
        employee:employees(name)
      `)
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (!appointments || appointments.length === 0) {
      await this.sendMessage(phone, 'No tienes turnos próximos para cancelar.');
      return;
    }

    context.pendingAppointments = appointments;
    context.state = 'awaiting_cancellation';
    this.conversationManager.set(phone, context);

    const appointmentsList = appointments
      .map((apt, index) => {
        const dateStr = format(new Date(apt.start_time), "d 'de' MMMM, HH:mm", { locale: es });
        return `${index + 1}. ${apt.service.name} - ${dateStr}`;
      })
      .join('\n');

    const message = `Tus próximos turnos:

${appointmentsList}

Responde con el número del turno a cancelar (ejemplo: 1)`;

    await this.sendMessage(phone, message);
  }

  private async handleCancellationSelection(phone: string, messageBody: string, context: ConversationContext) {
    const selection = parseInt(messageBody);

    if (isNaN(selection) || !context.pendingAppointments || selection < 1 || selection > context.pendingAppointments.length) {
      await this.sendMessage(phone, 'Número inválido. Por favor elige un turno de la lista.');
      return;
    }

    const appointmentToCancel = context.pendingAppointments[selection - 1];

    try {
      const { error } = await supabaseAdmin
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentToCancel.id);

      if (error) throw error;

      await this.sendMessage(phone, `✅ Tu turno del ${format(new Date(appointmentToCancel.start_time), "d 'de' MMMM 'a las' HH:mm", { locale: es })} ha sido cancelado exitosamente.`);

      this.conversationManager.reset(phone);
    } catch (error) {
      logger.error('❌ Error cancelling appointment:', error);
      await this.sendMessage(phone, 'Disculpa, no pude cancelar el turno. Por favor intenta nuevamente.');
    }
  }

  private async sendWelcomeMessage(phone: string, businessName: string) {
    const message = `¡Hola! Bienvenido a ${businessName} 👋

Puedo ayudarte con:
📅 Agendar turno
❌ Cancelar turno

¿Qué necesitas?`;

    await this.sendMessage(phone, message);
  }

  async sendCancellationConfirmation(phone: string, customerName: string) {
    const message = `Hola ${customerName},

Tu turno ha sido cancelado exitosamente.

Si deseas agendar otro turno, escribe "turno".`;

    return this.sendMessage(phone, message);
  }
}