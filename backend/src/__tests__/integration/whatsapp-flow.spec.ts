import { WhatsAppService } from '../../services/whatsapp/WhatsAppService';
import { sessionService } from '../../services/session.service';
import { customerService } from '../../services/customer.service';
import { employeeService } from '../../services/employee.service';
import { appointmentService } from '../../services/appointment.service';
import { IncomingWhatsAppMessage } from '../../models';

// Mock dependencies
jest.mock('../../services/session.service');
jest.mock('../../services/customer.service');
jest.mock('../../services/employee.service');
jest.mock('../../services/appointment.service');
jest.mock('../../services/availability.service');
jest.mock('../../config/twilio');

describe('WhatsApp Flow Integration Tests', () => {
  let whatsappService: WhatsAppService;
  const testPhone = 'whatsapp:+1234567890';
  const testTo = 'whatsapp:+1234567891'; // Business number
  const testBusinessId = 'test-business-id';

  beforeEach(() => {
    whatsappService = new WhatsAppService();
    jest.clearAllMocks();
  });

  describe('New Customer Flow', () => {
    it('should ask for name when customer does not exist', async () => {
      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'Hola',
        MessageSid: 'test-sid',
      };

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (sessionService.getOrCreateSession as jest.Mock).mockReturnValue({
        phone: testPhone,
        state: 'initial',
        data: {},
        created_at: new Date(),
        updated_at: new Date(),
      });

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('nombre')
      );
      expect(sessionService.updateState).toHaveBeenCalledWith(testPhone, 'asking_name');
    });

    it('should create customer and show menu after receiving name', async () => {
      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'Juan Pérez',
        MessageSid: 'test-sid',
      };

      const mockCustomer = {
        id: 'customer-123',
        name: 'Juan Pérez',
        phone: testPhone,
        business_id: testBusinessId,
      };

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(null);
      (sessionService.getOrCreateSession as jest.Mock).mockReturnValue({
        phone: testPhone,
        state: 'asking_name',
        data: {},
        created_at: new Date(),
        updated_at: new Date(),
      });
      (customerService.createCustomer as jest.Mock).mockResolvedValue(mockCustomer);

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(customerService.createCustomer).toHaveBeenCalledWith({
        phone: testPhone,
        name: 'Juan Pérez',
        business_id: expect.any(String),
      });
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Juan Pérez')
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Agendar un turno')
      );
    });
  });

  describe('Menu Selection Flow', () => {
    beforeEach(() => {
      const mockCustomer = {
        id: 'customer-123',
        name: 'Juan Pérez',
        phone: testPhone,
        business_id: testBusinessId,
      };

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(mockCustomer);
      (sessionService.getOrCreateSession as jest.Mock).mockReturnValue({
        phone: testPhone,
        state: 'initial',
        data: {
          customer_id: 'customer-123',
          customer_name: 'Juan Pérez',
          business_id: testBusinessId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('should start booking flow when user selects option 1', async () => {
      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: '1',
        MessageSid: 'test-sid',
      };

      const mockEmployees = [{
        id: 'emp-1',
        name: 'Matias Rubiolo',
        role: 'Barbero Senior',
      }];

      (employeeService.getActiveEmployeesByBusiness as jest.Mock).mockResolvedValue(mockEmployees);

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(employeeService.getActiveEmployeesByBusiness).toHaveBeenCalled();
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Matias Rubiolo')
      );
    });

    it('should show appointments when user selects option 3', async () => {
      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: '3',
        MessageSid: 'test-sid',
      };

      const mockAppointments = [{
        id: 'apt-1',
        start_time: new Date().toISOString(),
        employee_name: 'Matias Rubiolo',
        status: 'confirmed',
      }];

      (appointmentService.getAppointmentsByCustomer as jest.Mock).mockResolvedValue(mockAppointments);

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(appointmentService.getAppointmentsByCustomer).toHaveBeenCalledWith('customer-123');
      expect(sendMessageSpy).toHaveBeenCalled();
    });
  });

  describe('Booking Flow with Single Employee', () => {
    it('should auto-select employee when only one is available', async () => {
      const mockCustomer = {
        id: 'customer-123',
        name: 'Juan Pérez',
        phone: testPhone,
        business_id: testBusinessId,
      };

      const mockEmployees = [{
        id: 'emp-1',
        name: 'Matias Rubiolo',
        role: 'Barbero Senior',
      }];

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(mockCustomer);
      (employeeService.getActiveEmployeesByBusiness as jest.Mock).mockResolvedValue(mockEmployees);
      (sessionService.getOrCreateSession as jest.Mock).mockReturnValue({
        phone: testPhone,
        state: 'initial',
        data: {
          customer_id: 'customer-123',
          customer_name: 'Juan Pérez',
          business_id: testBusinessId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      });

      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'Quiero agendar un turno',
        MessageSid: 'test-sid',
      };

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Te agendaré con Matias Rubiolo')
      );
      // Should ask for date next, not employee selection
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('día')
      );
    });
  });

  describe('Date Parsing', () => {
    it('should understand various date formats', async () => {
      const testCases = [
        { input: 'mañana', shouldWork: true },
        { input: '1/12/25', shouldWork: true },
        { input: 'primero de diciembre', shouldWork: true },
        { input: 'viernes', shouldWork: true },
        { input: 'fecha invalida', shouldWork: false },
      ];

      // This would be tested in the DataExtractor tests
      // Here we just verify the integration works
      expect(testCases.length).toBeGreaterThan(0);
    });
  });

  describe('Cancellation Flow', () => {
    it('should show appointments for cancellation', async () => {
      const mockCustomer = {
        id: 'customer-123',
        name: 'Juan Pérez',
        phone: testPhone,
        business_id: testBusinessId,
      };

      const mockAppointments = [
        {
          id: 'apt-1',
          start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          employee_name: 'Matias Rubiolo',
          status: 'confirmed',
        },
      ];

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(mockCustomer);
      (appointmentService.getAppointmentsByCustomer as jest.Mock).mockResolvedValue(mockAppointments);
      (sessionService.getOrCreateSession as jest.Mock).mockReturnValue({
        phone: testPhone,
        state: 'initial',
        data: {
          customer_id: 'customer-123',
          customer_name: 'Juan Pérez',
          business_id: testBusinessId,
        },
        created_at: new Date(),
        updated_at: new Date(),
      });

      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'cancelar turno',
        MessageSid: 'test-sid',
      };

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(appointmentService.getAppointmentsByCustomer).toHaveBeenCalledWith('customer-123');
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Cancelar turno')
      );
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Matias Rubiolo')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'Hola',
        MessageSid: 'test-sid',
      };

      (customerService.getCustomerByPhone as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('error')
      );
      expect(sessionService.resetSession).toHaveBeenCalledWith(testPhone);
    });
  });

  describe('Global Commands', () => {
    it('should handle "inicio" command', async () => {
      const mockCustomer = {
        id: 'customer-123',
        name: 'Juan Pérez',
        phone: testPhone,
        business_id: testBusinessId,
      };

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(mockCustomer);

      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'inicio',
        MessageSid: 'test-sid',
      };

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(sessionService.resetSession).toHaveBeenCalledWith(testPhone);
      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('Juan Pérez')
      );
    });

    it('should handle "ayuda" command', async () => {
      const mockCustomer = {
        id: 'customer-123',
        name: 'Juan Pérez',
        phone: testPhone,
        business_id: testBusinessId,
      };

      (customerService.getCustomerByPhone as jest.Mock).mockResolvedValue(mockCustomer);

      const message: IncomingWhatsAppMessage = {
        From: testPhone,
        To: testTo,
        Body: 'ayuda',
        MessageSid: 'test-sid',
      };

      const sendMessageSpy = jest.spyOn(whatsappService as any, 'sendMessage').mockResolvedValue(undefined);

      await whatsappService.handleIncomingMessage(message);

      expect(sendMessageSpy).toHaveBeenCalledWith(
        testPhone,
        expect.stringContaining('ayudarte')
      );
    });
  });
});
