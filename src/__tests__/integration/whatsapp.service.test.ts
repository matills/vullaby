import { WhatsAppService } from '../../services/whatsapp.service';
import { TestFactory } from '../helpers/test-factory';
import { createMockSupabase, MockSupabaseClient } from '../helpers/supabase.mock';
import { addDays } from 'date-fns';

jest.mock('../../config/database', () => {
  const mockClient = createMockSupabase();
  return {
    supabase: mockClient,
    supabaseAdmin: mockClient,
  };
});

jest.mock('../../config/twilio', () => ({
  twilioClient: {
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-sid',
        status: 'sent',
      }),
    },
  },
  client: {
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'test-sid',
        status: 'sent',
      }),
    },
  },
}));

jest.mock('../../jobs/reminder.processor', () => ({
  scheduleReminder: jest.fn(),
  cancelReminder: jest.fn(),
}));

describe('WhatsAppService', () => {
  let whatsappService: WhatsAppService;
  let mockSupabase: MockSupabaseClient;
  let business: any;
  let employee: any;
  let customer: any;
  let service: any;

  beforeEach(() => {
    const { supabaseAdmin } = require('../../config/database');
    mockSupabase = supabaseAdmin;
    mockSupabase.clearData();
    whatsappService = new WhatsAppService();

    business = TestFactory.createBusiness();
    employee = TestFactory.createEmployee(business.id);
    customer = TestFactory.createCustomer(business.id);
    service = TestFactory.createService(business.id);

    mockSupabase.seedData('businesses', [business]);
    mockSupabase.seedData('employees', [employee]);
    mockSupabase.seedData('customers', [customer]);
    mockSupabase.seedData('services', [service]);
  });

  describe('sendMessage', () => {
    it('should send WhatsApp message successfully', async () => {
      const result = await whatsappService.sendMessage('+5491234567890', 'Test message');

      expect(result).toHaveProperty('sid');
      expect(result.status).toBeDefined();
    });

    it('should format phone number correctly', async () => {
      const { twilioClient } = require('../../config/twilio');

      await whatsappService.sendMessage('1234567890', 'Test');

      expect(twilioClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          to: expect.stringContaining('whatsapp:'),
        })
      );
    });
  });

  describe('sendAppointmentConfirmation', () => {
    it('should send confirmation message with appointment details', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);

      const result = await whatsappService.sendAppointmentConfirmation('+5491234567890', {
        customerName: 'John Doe',
        serviceName: 'Haircut',
        employeeName: 'Jane Smith',
        startTime,
        businessName: 'Test Salon',
      });

      expect(result).toHaveProperty('sid');
    });

    it('should format date in Spanish locale', async () => {
      const { twilioClient } = require('../../config/twilio');
      const startTime = TestFactory.generateFutureDate(1, 10);

      await whatsappService.sendAppointmentConfirmation('+5491234567890', {
        customerName: 'John',
        serviceName: 'Service',
        employeeName: 'Employee',
        startTime,
        businessName: 'Business',
      });

      const call = twilioClient.messages.create.mock.calls[0][0];
      expect(call.body).toContain('confirmado');
    });
  });

  describe('sendAppointmentReminder', () => {
    it('should send reminder message', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);

      const result = await whatsappService.sendAppointmentReminder('+5491234567890', {
        customerName: 'John Doe',
        serviceName: 'Haircut',
        startTime,
        businessName: 'Test Salon',
      });

      expect(result).toHaveProperty('sid');
    });
  });

  describe('handleIncomingMessage', () => {
    beforeEach(() => {
      const workingHours = TestFactory.createWorkingHours(employee.id, 1);
      mockSupabase.seedData('working_hours', [workingHours]);
    });

    it('should process initial greeting message', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Hola',
      });

      const { twilioClient } = require('../../config/twilio');
      expect(twilioClient.messages.create).toHaveBeenCalled();
    });

    it('should handle appointment request', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Quiero agendar un turno',
      });

      const { twilioClient } = require('../../config/twilio');
      const lastCall = twilioClient.messages.create.mock.calls[
        twilioClient.messages.create.mock.calls.length - 1
      ][0];

      expect(lastCall.body).toContain('servicio');
    });

    it('should parse date from natural language', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Turno para mañana',
      });

      const { twilioClient } = require('../../config/twilio');
      expect(twilioClient.messages.create).toHaveBeenCalled();
    });

    it('should handle service selection', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Turno',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '1',
      });

      const { twilioClient } = require('../../config/twilio');
      const lastCall = twilioClient.messages.create.mock.calls[
        twilioClient.messages.create.mock.calls.length - 1
      ][0];

      expect(lastCall.body).toContain('Horarios disponibles');
    });

    it('should complete appointment booking flow', async () => {
      const { scheduleReminder } = require('../../jobs/reminder.processor');

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Quiero turno',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '1',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '1',
      });

      expect(scheduleReminder).toHaveBeenCalled();
    });

    it('should handle cancellation request', async () => {
      const tomorrow = addDays(new Date(), 1);
      const appointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id,
        { start_time: tomorrow, status: 'confirmed' }
      );

      mockSupabase.seedData('appointments', [appointment]);

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Cancelar turno',
      });

      const { twilioClient } = require('../../config/twilio');
      const lastCall = twilioClient.messages.create.mock.calls[
        twilioClient.messages.create.mock.calls.length - 1
      ][0];

      expect(lastCall.body).toContain('proximos turnos');
    });

    it('should handle invalid service selection', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Turno',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '999',
      });

      const { twilioClient } = require('../../config/twilio');
      const lastCall = twilioClient.messages.create.mock.calls[
        twilioClient.messages.create.mock.calls.length - 1
      ][0];

      expect(lastCall.body).toContain('invalido');
    });

    it('should create new customer if not exists', async () => {
      const newPhone = '+5499999999999';

      await whatsappService.handleIncomingMessage({
        from: newPhone,
        to: business.phone,
        body: 'Hola',
      });

      const customers = await mockSupabase.from('customers').select();
      const newCustomer = customers.data.find((c: any) => c.phone.includes('9999999999'));

      expect(newCustomer).toBeDefined();
    });

    it('should send rate limit message', async () => {
      await whatsappService.sendRateLimitMessage(customer.phone);

      const { twilioClient } = require('../../config/twilio');
      const lastCall = twilioClient.messages.create.mock.calls[
        twilioClient.messages.create.mock.calls.length - 1
      ][0];

      expect(lastCall.body).toContain('límite de mensajes');
    });

    it('should handle errors gracefully', async () => {
      const { twilioClient } = require('../../config/twilio');
      twilioClient.messages.create.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        whatsappService.handleIncomingMessage({
          from: customer.phone,
          to: 'invalid-phone',
          body: 'Test',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('conversation flow', () => {
    it('should maintain conversation state', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Turno',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '1',
      });

      const { twilioClient } = require('../../config/twilio');
      expect(twilioClient.messages.create.mock.calls.length).toBeGreaterThan(1);
    });

    it('should reset conversation after completion', async () => {
      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Turno',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '1',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: '1',
      });

      await whatsappService.handleIncomingMessage({
        from: customer.phone,
        to: business.phone,
        body: 'Hola',
      });

      const { twilioClient } = require('../../config/twilio');
      const lastCall = twilioClient.messages.create.mock.calls[
        twilioClient.messages.create.mock.calls.length - 1
      ][0];

      expect(lastCall.body).toContain('Bienvenido');
    });
  });
});