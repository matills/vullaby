import { WhatsAppClient } from '@kapso/whatsapp-cloud-api';
import { logger } from './logger';

if (!process.env.KAPSO_API_KEY) {
  logger.warn('Missing KAPSO_API_KEY - WhatsApp features will be disabled');
}

/**
 * Kapso WhatsApp Cloud API Client
 * Uses Kapso's proxy for simplified WhatsApp Business API access
 */
export const kapsoClient = process.env.KAPSO_API_KEY
  ? new WhatsAppClient({
      baseUrl: 'https://api.kapso.ai/meta/whatsapp',
      kapsoApiKey: process.env.KAPSO_API_KEY,
    })
  : null;

/**
 * Default phone number ID for fallback (optional)
 * Individual businesses should have their own phone_number_id
 */
export const DEFAULT_PHONE_NUMBER_ID = process.env.KAPSO_DEFAULT_PHONE_NUMBER_ID || '';

/**
 * Send WhatsApp message using a specific business's phone number
 *
 * @param phoneNumberId - The WhatsApp phone number ID for the business
 * @param to - Customer phone number (with or without whatsapp: prefix)
 * @param message - Message body
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  message: string
) {
  if (!kapsoClient) {
    logger.error('Kapso client not initialized');
    throw new Error('Kapso client not configured');
  }

  // Remove whatsapp: prefix if present, Kapso uses plain phone numbers
  const phoneNumber = to.replace('whatsapp:', '');

  try {
    const result = await kapsoClient.messages.sendText({
      phoneNumberId,
      to: phoneNumber,
      body: message,
    });

    logger.info(`WhatsApp message sent to ${phoneNumber}`, {
      phoneNumberId,
      messageId: result
    });
    return result;
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error);
    throw error;
  }
}

/**
 * Legacy function for backward compatibility
 * Uses default phone number ID - should be replaced with business-specific calls
 *
 * @deprecated Use sendWhatsAppMessage with phoneNumberId instead
 */
export async function sendWhatsAppMessageLegacy(to: string, message: string) {
  if (!DEFAULT_PHONE_NUMBER_ID) {
    throw new Error('No default phone number ID configured');
  }
  return sendWhatsAppMessage(DEFAULT_PHONE_NUMBER_ID, to, message);
}
