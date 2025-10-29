import twilio from 'twilio';
import { config } from './env';

const accountSid = config.twilio.accountSid;
const authToken = config.twilio.authToken;

let twilioClient: twilio.Twilio | null = null;

if (accountSid && authToken && accountSid.startsWith('AC')) {
  twilioClient = twilio(accountSid, authToken);
} else {
  console.warn('Twilio credentials not configured. WhatsApp features will be disabled.');
}

export { twilioClient };
export const client = twilioClient;