/**
 * Jest setup file
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DEFAULT_BUSINESS_ID = 'test-business-id';

// Mock Supabase client
jest.mock('../config/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
}));

// Mock Twilio
jest.mock('../config/twilio', () => ({
  sendWhatsAppMessage: jest.fn(),
}));

// Mock logger to reduce noise in tests
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
