import { WhatsAppMessage } from '../types';
import { WhatsAppTransport } from './whatsapp/whatsapp.transport';
import { ConversationHandler, MessageHandler } from './conversation/conversation.handler';
import { BusinessResolver } from './conversation/business.resolver';
import { CustomerResolver } from './conversation/customer.resolver';
import { PhoneFormatter } from './conversation/phone.formatter';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import logger from '../utils/logger';

export class WhatsAppService implements MessageHandler {
  private transport: WhatsAppTransport;
  private conversationHandler: ConversationHandler;
  private businessResolver: BusinessResolver;
  private customerResolver: CustomerResolver;

  constructor() {
    this.transport = new WhatsAppTransport();
    this.conversationHandler = new ConversationHandler(this);
    this.businessResolver = new BusinessResolver();
    this.customerResolver = new CustomerResolver();
  }

  async sendMessage(to: string, message: string) {
    return this.transport.sendMessage(to, message);
  }

  async sendAppointmentConfirmation(phone: string, data: {
    customerName: string;
    serviceName: string;
    employeeName: string;
    startTime: Date;
    businessName: string;
  }) {
    const dateStr = format(data.startTime, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = format(data.startTime, 'HH:mm');

    const message = `¡Hola ${data.customerName}! ✅

Tu turno ha sido confirmado:

📅 ${dateStr}
🕐 ${timeStr}
💈 ${data.serviceName}
👤 con ${data.employeeName}

📍 ${data.businessName}

Si necesitas cancelar o reprogramar, responde a este mensaje.`;

    return this.sendMessage(phone, message);
  }

  async sendAppointmentReminder(phone: string, data: {
    customerName: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
  }) {
    const dateStr = format(data.startTime, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = format(data.startTime, 'HH:mm');

    const message = `Hola ${data.customerName} 👋

Te recordamos tu turno para mañana:

📅 ${dateStr}
🕐 ${timeStr}
💈 ${data.serviceName}

📍 ${data.businessName}

¡Te esperamos!`;

    return this.sendMessage(phone, message);
  }

  async handleIncomingMessage(message: WhatsAppMessage) {
    try {
      const normalizedPhone = PhoneFormatter.normalize(message.from);
      const messageBody = message.body.trim();

      logger.info(`Processing message from: ${normalizedPhone}`);

      const business = await this.businessResolver.findByPhone(message.to);
      if (!business) {
        logger.warn(`No business configured for number: ${message.to}`);
        return;
      }

      const customer = await this.customerResolver.findOrCreate(normalizedPhone, business.id);

      await this.conversationHandler.handleMessage(
        normalizedPhone,
        messageBody,
        customer,
        business
      );
    } catch (error) {
      logger.error('Error handling incoming message:', error);
      await this.sendMessage(message.from, 'Disculpa, ocurrió un error. Por favor intenta más tarde.');
    }
  }
}