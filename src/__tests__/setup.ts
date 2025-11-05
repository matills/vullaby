process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
process.env.TWILIO_AUTH_TOKEN = 'test-auth-token';
process.env.TWILIO_WHATSAPP_NUMBER = 'whatsapp:+1234567890';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.FRONTEND_URL = 'http://localhost:3000';

jest.setTimeout(10000);