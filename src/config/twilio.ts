import twilio, { Twilio } from 'twilio';
import { config } from './env';
import logger from '../utils/logger';

const createTwilioClient = (): Twilio | null => {
  const { accountSid, authToken } = config.twilio;

  if (!accountSid || !authToken) {
    logger.warn('Twilio credentials not configured. WhatsApp features will be disabled.');
    return null;
  }

  if (!accountSid.startsWith('AC')) {
    logger.warn('Invalid Twilio Account SID format. WhatsApp features will be disabled.');
    return null;
  }

  try {
    return twilio(accountSid, authToken);
  } catch (error) {
    logger.error('Failed to initialize Twilio client:', error);
    return null;
  }
};

export const twilioClient = createTwilioClient();
export const client = twilioClient;