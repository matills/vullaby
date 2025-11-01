import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  supabase: {
    url: string;
    anonKey: string;
    serviceKey: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    whatsappNumber: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  redis: {
    host: string;
    port: number;
  };
  frontend: {
    url: string;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required`);
  }
  return value;
};

export const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  supabase: {
    url: getEnvVar('SUPABASE_URL'),
    anonKey: getEnvVar('SUPABASE_ANON_KEY'),
    serviceKey: getEnvVar('SUPABASE_SERVICE_KEY', ''),
  },
  
  twilio: {
    accountSid: getEnvVar('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnvVar('TWILIO_AUTH_TOKEN', ''),
    whatsappNumber: getEnvVar('TWILIO_WHATSAPP_NUMBER', ''),
  },
  
  jwt: {
    secret: getEnvVar('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};

export const validateConfig = (): void => {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'JWT_SECRET'];
  
  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};