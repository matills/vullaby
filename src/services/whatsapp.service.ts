import { client as twilioClient } from '../config/twilio';
import { config } from '../config/env';
import { supabase } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { WhatsAppMessage, TimeSlot } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logger from '../utils/logger';

export class WhatsAppService {
  async sendMessage(to: string, message: string) {
    try {
      if (!twilioClient) {
        throw new AppError('WhatsApp service not configured', 503);
      }

      const result = await twilioClient.messages.create({
        from: config.twilio.whatsappNumber,
        to: `whatsapp:${to}`,
        body: message,
      });

      logger.info(`WhatsApp message sent to ${to}: ${result.sid}`);
      return result;
    } catch (error) {
      logger.error('Failed to send WhatsApp message:', error);
      throw new AppError('Failed to send message', 500);
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

  async sendAvailableSlots(phone: string, slots: TimeSlot[], serviceName: string) {
    if (slots.length === 0) {
      const message = `Lo siento, no hay horarios disponibles para ${serviceName} en la fecha solicitada. 

¿Te gustaría consultar otra fecha?`;
      return this.sendMessage(phone, message);
    }

    const availableSlots = slots.filter(slot => slot.available).slice(0, 5);
    
    if (availableSlots.length === 0) {
      const message = `Lo siento, todos los horarios están ocupados para ${serviceName}.

¿Te gustaría ver otra fecha?`;
      return this.sendMessage(phone, message);
    }

    const slotsList = availableSlots
      .map((slot, index) => `${index + 1}. ${format(slot.start, 'HH:mm')}`)
      .join('\n');

    const message = `Horarios disponibles para ${serviceName}:

${slotsList}

Responde con el número del horario que prefieres.`;

    return this.sendMessage(phone, message);
  }

  async handleIncomingMessage(message: WhatsAppMessage) {
    try {
      const phoneNumber = message.from.replace('whatsapp:', '');
      const messageBody = message.body.toLowerCase().trim();

      const { data: business } = await supabase
        .from('businesses')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (!business) {
        logger.warn(`Message from unregistered business: ${phoneNumber}`);
        return;
      }

      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .eq('phone', phoneNumber)
        .single();

      if (messageBody.includes('turno') || messageBody.includes('reserva')) {
        await this.handleAppointmentRequest(phoneNumber, business);
      } else if (messageBody.includes('cancelar')) {
        await this.handleCancellationRequest(phoneNumber, customer?.id, business.id);
      } else if (messageBody.includes('horarios') || messageBody.includes('disponibilidad')) {
        await this.handleAvailabilityRequest(phoneNumber, business);
      } else {
        await this.sendWelcomeMessage(phoneNumber, business.name);
      }
    } catch (error) {
      logger.error('Error handling incoming message:', error);
    }
  }

  private async handleAppointmentRequest(phone: string, business: any) {
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true);

    if (!services || services.length === 0) {
      await this.sendMessage(phone, 'Lo siento, no hay servicios disponibles en este momento.');
      return;
    }

    const servicesList = services
      .map((service, index) => `${index + 1}. ${service.name} - $${service.price} (${service.duration_minutes} min)`)
      .join('\n');

    const message = `¡Hola! Para agendar un turno, elige un servicio:

${servicesList}

Responde con el número del servicio que deseas.`;

    await this.sendMessage(phone, message);
  }

  private async handleCancellationRequest(phone: string, customerId: string | undefined, businessId: string) {
    if (!customerId) {
      await this.sendMessage(phone, 'No encontramos turnos asociados a este número.');
      return;
    }

    const { data: appointments } = await supabase
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

    const appointmentsList = appointments
      .map((apt, index) => {
        const dateStr = format(new Date(apt.start_time), "d 'de' MMMM, HH:mm", { locale: es });
        return `${index + 1}. ${apt.service.name} - ${dateStr}`;
      })
      .join('\n');

    const message = `Tus próximos turnos:

${appointmentsList}

Responde con el número del turno que deseas cancelar.`;

    await this.sendMessage(phone, message);
  }

  private async handleAvailabilityRequest(phone: string, business: any) {
    const message = `Para consultar disponibilidad, por favor indícame:

1. ¿Qué servicio necesitas?
2. ¿Qué día prefieres?

Ejemplo: "Necesito corte de pelo para el jueves"`;

    await this.sendMessage(phone, message);
  }

  private async sendWelcomeMessage(phone: string, businessName: string) {
    const message = `¡Hola! Bienvenido a ${businessName} 👋

Puedo ayudarte con:
📅 Agendar un turno
🔍 Consultar horarios disponibles
❌ Cancelar un turno

¿Qué necesitas?`;

    await this.sendMessage(phone, message);
  }

  async sendCancellationConfirmation(phone: string, customerName: string) {
    const message = `Hola ${customerName},

Tu turno ha sido cancelado exitosamente.

Si deseas agendar otro turno, no dudes en escribirnos.`;

    return this.sendMessage(phone, message);
  }
}