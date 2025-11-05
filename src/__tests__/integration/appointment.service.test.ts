import { AppointmentService } from '../../services/appointment.service';
import { TestFactory } from '../helpers/test-factory';
import { createMockSupabase, MockSupabaseClient } from '../helpers/supabase.mock';
import { ConflictError, NotFoundError } from '../../middlewares/error.middleware';
import { addMinutes, addDays, startOfDay } from 'date-fns';

jest.mock('../../config/database', () => {
  const mockClient = createMockSupabase();
  return {
    supabase: mockClient,
    supabaseAdmin: mockClient,
  };
});

jest.mock('../../jobs/reminder.processor', () => ({
  scheduleReminder: jest.fn(),
  cancelReminder: jest.fn(),
}));

describe('AppointmentService', () => {
  let appointmentService: AppointmentService;
  let mockSupabase: MockSupabaseClient;
  let business: any;
  let employee: any;
  let customer: any;
  let service: any;

  beforeEach(() => {
    const { supabase } = require('../../config/database');
    mockSupabase = supabase;
    mockSupabase.clearData();
    appointmentService = new AppointmentService();

    business = TestFactory.createBusiness();
    employee = TestFactory.createEmployee(business.id);
    customer = TestFactory.createCustomer(business.id);
    service = TestFactory.createService(business.id, { duration_minutes: 60 });

    mockSupabase.seedData('businesses', [business]);
    mockSupabase.seedData('employees', [employee]);
    mockSupabase.seedData('customers', [customer]);
    mockSupabase.seedData('services', [service]);
  });

  describe('createAppointment', () => {
    it('should create appointment successfully', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);

      const appointment = await appointmentService.createAppointment({
        businessId: business.id,
        employeeId: employee.id,
        customerId: customer.id,
        serviceId: service.id,
        startTime,
        notes: 'Test appointment',
      });

      expect(appointment).toHaveProperty('id');
      expect(appointment.business_id).toBe(business.id);
      expect(appointment.status).toBe('pending');
      expect(new Date(appointment.start_time)).toEqual(startTime);
    });

    it('should calculate end time based on service duration', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);

      const appointment = await appointmentService.createAppointment({
        businessId: business.id,
        employeeId: employee.id,
        customerId: customer.id,
        serviceId: service.id,
        startTime,
      });

      const expectedEndTime = addMinutes(startTime, service.duration_minutes);
      expect(new Date(appointment.end_time)).toEqual(expectedEndTime);
    });

    it('should throw ConflictError if time slot not available', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);

      await appointmentService.createAppointment({
        businessId: business.id,
        employeeId: employee.id,
        customerId: customer.id,
        serviceId: service.id,
        startTime,
      });

      await expect(
        appointmentService.createAppointment({
          businessId: business.id,
          employeeId: employee.id,
          customerId: customer.id,
          serviceId: service.id,
          startTime,
        })
      ).rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError if service not found', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);

      await expect(
        appointmentService.createAppointment({
          businessId: business.id,
          employeeId: employee.id,
          customerId: customer.id,
          serviceId: 'invalid-service-id',
          startTime,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should schedule reminder after creation', async () => {
      const { scheduleReminder } = require('../../jobs/reminder.processor');
      const startTime = TestFactory.generateFutureDate(1, 10);

      await appointmentService.createAppointment({
        businessId: business.id,
        employeeId: employee.id,
        customerId: customer.id,
        serviceId: service.id,
        startTime,
      });

      expect(scheduleReminder).toHaveBeenCalled();
    });
  });

  describe('checkAvailability', () => {
    it('should return true when slot is available', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);
      const endTime = addMinutes(startTime, 60);

      const isAvailable = await appointmentService.checkAvailability(
        employee.id,
        startTime,
        endTime
      );

      expect(isAvailable).toBe(true);
    });

    it('should return false when slot conflicts with existing appointment', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);
      const endTime = addMinutes(startTime, 60);

      const existingAppointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id,
        { start_time: startTime, end_time: endTime, status: 'confirmed' }
      );

      mockSupabase.seedData('appointments', [existingAppointment]);

      const isAvailable = await appointmentService.checkAvailability(
        employee.id,
        startTime,
        endTime
      );

      expect(isAvailable).toBe(false);
    });

    it('should ignore cancelled appointments', async () => {
      const startTime = TestFactory.generateFutureDate(1, 10);
      const endTime = addMinutes(startTime, 60);

      const cancelledAppointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id,
        { start_time: startTime, end_time: endTime, status: 'cancelled' }
      );

      mockSupabase.seedData('appointments', [cancelledAppointment]);

      const isAvailable = await appointmentService.checkAvailability(
        employee.id,
        startTime,
        endTime
      );

      expect(isAvailable).toBe(true);
    });
  });

  describe('getAvailableSlots', () => {
    beforeEach(() => {
      const workingHours = TestFactory.createWorkingHours(employee.id, 1, {
        start_time: '09:00',
        end_time: '18:00',
      });
      mockSupabase.seedData('working_hours', [workingHours]);
    });

    it('should generate available time slots', async () => {
      const tomorrow = addDays(startOfDay(new Date()), 1);
      tomorrow.setDate(tomorrow.getDate() + (8 - tomorrow.getDay()) % 7);

      const slots = await appointmentService.getAvailableSlots({
        businessId: business.id,
        employeeId: employee.id,
        date: tomorrow,
        serviceId: service.id,
      });

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('start');
      expect(slots[0]).toHaveProperty('end');
      expect(slots[0]).toHaveProperty('available');
    });

    it('should mark occupied slots as unavailable', async () => {
      const tomorrow = addDays(startOfDay(new Date()), 1);
      tomorrow.setDate(tomorrow.getDate() + (8 - tomorrow.getDay()) % 7);
      
      const occupiedStart = new Date(tomorrow);
      occupiedStart.setHours(10, 0, 0, 0);

      const appointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id,
        {
          start_time: occupiedStart,
          end_time: addMinutes(occupiedStart, 60),
          status: 'confirmed',
        }
      );

      mockSupabase.seedData('appointments', [appointment]);

      const slots = await appointmentService.getAvailableSlots({
        businessId: business.id,
        employeeId: employee.id,
        date: tomorrow,
        serviceId: service.id,
      });

      const occupiedSlot = slots.find(slot => 
        slot.start.getHours() === 10 && slot.start.getMinutes() === 0
      );

      expect(occupiedSlot?.available).toBe(false);
    });

    it('should return empty array if no working hours defined', async () => {
      mockSupabase.clearData('working_hours');

      const tomorrow = addDays(new Date(), 1);

      const slots = await appointmentService.getAvailableSlots({
        businessId: business.id,
        employeeId: employee.id,
        date: tomorrow,
        serviceId: service.id,
      });

      expect(slots).toEqual([]);
    });
  });

  describe('updateAppointmentStatus', () => {
    it('should update appointment status successfully', async () => {
      const appointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id
      );

      mockSupabase.seedData('appointments', [appointment]);

      const updated = await appointmentService.updateAppointmentStatus(
        appointment.id,
        business.id,
        'confirmed'
      );

      expect(updated.status).toBe('confirmed');
    });

    it('should cancel reminder when status is cancelled', async () => {
      const { cancelReminder } = require('../../jobs/reminder.processor');
      
      const appointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id
      );

      mockSupabase.seedData('appointments', [appointment]);

      await appointmentService.updateAppointmentStatus(
        appointment.id,
        business.id,
        'cancelled'
      );

      expect(cancelReminder).toHaveBeenCalledWith(appointment.id);
    });

    it('should cancel reminder when status is completed', async () => {
      const { cancelReminder } = require('../../jobs/reminder.processor');
      
      const appointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id
      );

      mockSupabase.seedData('appointments', [appointment]);

      await appointmentService.updateAppointmentStatus(
        appointment.id,
        business.id,
        'completed'
      );

      expect(cancelReminder).toHaveBeenCalledWith(appointment.id);
    });
  });

  describe('getAppointmentsByBusiness', () => {
    it('should return all appointments for business', async () => {
      const appointments = [
        TestFactory.createAppointment(business.id, employee.id, customer.id, service.id),
        TestFactory.createAppointment(business.id, employee.id, customer.id, service.id),
      ];

      mockSupabase.seedData('appointments', appointments);

      const result = await appointmentService.getAppointmentsByBusiness(business.id);

      expect(result).toHaveLength(2);
    });

    it('should filter appointments by date range', async () => {
      const today = new Date();
      const tomorrow = addDays(today, 1);
      const nextWeek = addDays(today, 7);

      const appointments = [
        TestFactory.createAppointment(business.id, employee.id, customer.id, service.id, {
          start_time: today,
        }),
        TestFactory.createAppointment(business.id, employee.id, customer.id, service.id, {
          start_time: tomorrow,
        }),
        TestFactory.createAppointment(business.id, employee.id, customer.id, service.id, {
          start_time: nextWeek,
        }),
      ];

      mockSupabase.seedData('appointments', appointments);

      const result = await appointmentService.getAppointmentsByBusiness(
        business.id,
        today,
        addDays(today, 2)
      );

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      const appointment = TestFactory.createAppointment(
        business.id,
        employee.id,
        customer.id,
        service.id
      );

      mockSupabase.seedData('appointments', [appointment]);

      const cancelled = await appointmentService.cancelAppointment(
        appointment.id,
        business.id
      );

      expect(cancelled.status).toBe('cancelled');
    });
  });
});