import { client as twilioClient } from '../../config/twilio';
import { config } from '../../config/env';
import { AppError } from '../../middlewares/error.middleware';
import { PhoneFormatter } from '../conversation/phone.formatter';
import logger from '../../utils/logger';

export class WhatsAppTransport {
  async sendMessage(to: string, message: string) {
    try {
      if (!twilioClient) {
        logger.warn('WhatsApp service not configured - message not sent');
        return { sid: 'mock-sid', status: 'mock', message: 'WhatsApp not configured' };
      }

      if (!config.twilio.whatsappNumber) {
        throw new AppError('WhatsApp number not configured', 503);
      }

      const formattedTo = PhoneFormatter.format(to);
      const formattedFrom = config.twilio.whatsappNumber.startsWith('whatsapp:')
        ? config.twilio.whatsappNumber
        : `whatsapp:${config.twilio.whatsappNumber}`;

      logger.info(`Sending WhatsApp from ${formattedFrom} to ${formattedTo}`);

      const result = await twilioClient.messages.create({
        from: formattedFrom,
        to: PhoneFormatter.toWhatsAppFormat(formattedTo),
        body: message,
      });

      logger.info(`WhatsApp message sent: ${result.sid}`);
      return result;
    } catch (error: any) {
      logger.error('Failed to send WhatsApp message:', {
        code: error.code,
        message: error.message,
      });

      if (error.code === 63007) {
        throw new AppError('WhatsApp sender not configured properly', 503);
      }

      throw new AppError(`Failed to send message: ${error.message}`, 500);
    }
  }
}