import twilio from 'twilio';
import { logger } from './logger';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  logger.warn('Missing Twilio environment variables - WhatsApp features will be disabled');
}

export const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || '';

export async function sendWhatsAppMessage(to: string, message: string) {
  if (!twilioClient) {
    logger.error('Twilio client not initialized');
    throw new Error('Twilio client not configured');
  }

  try {
    const result = await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body: message
    });

    logger.info(`WhatsApp message sent to ${to}`, { messageSid: result.sid });
    return result;
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    throw error;
  }
}
