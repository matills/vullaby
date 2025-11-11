import { supabase } from '../config/database';
import { AppError, NotFoundError, ConflictError } from '../middlewares/error.middleware';
import { TimeSlot, WorkingHours, Appointment } from '../types';
import { addMinutes, startOfDay, endOfDay, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import logger from '../utils/logger';
import { scheduleReminder, cancelReminder } from '../jobs/reminder.processor';
import { TIME_CONSTANTS, DB_QUERIES, APPOINTMENT_STATUS, AppointmentStatus } from '../constants';

interface CreateAppointmentData {
  businessId: string;
  employeeId: string;
  customerId: string;
  serviceId: string;
  startTime: Date;
  notes?: string;
}

interface GetAvailabilityParams {
  businessId: string;
  employeeId: string;
  date: Date;
  serviceId: string;
}

const APPOINTMENT_SELECT_QUERY = DB_QUERIES.APPOINTMENT_SELECT;

/**
 * Service class for managing appointments
 * Handles appointment creation, availability checking, and scheduling
 */
export class AppointmentService {
  /**
   * Retrieves the duration of a service in minutes
   * @param serviceId - UUID of the service
   * @returns Duration in minutes
   * @throws {NotFoundError} If service is not found
   */
  private async getServiceDuration(serviceId: string): Promise<number> {
    const { data: service, error } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single();

    if (error || !service) {
      throw new NotFoundError('Service');
    }

    return service.duration_minutes;
  }

  /**
   * Retrieves the timezone for a business
   * @param businessId - UUID of the business
   * @returns Timezone string (defaults to Buenos Aires)
   */
  private async getBusinessTimezone(businessId: string): Promise<string> {
    const { data: business } = await supabase
      .from('businesses')
      .select('timezone')
      .eq('id', businessId)
      .single();

    return business?.timezone || TIME_CONSTANTS.DEFAULT_TIMEZONE;
  }

  /**
   * Checks if an employee is available for a given time slot
   * @param employeeId - UUID of the employee
   * @param startTime - Start time of the slot
   * @param endTime - End time of the slot
   * @returns True if available, false otherwise
   */
  async checkAvailability(
    employeeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('employee_id', employeeId)
      .in('status', [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED])
      .or(`start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()}`);

    return !conflicts || conflicts.length === 0;
  }

  /**
   * Creates a new appointment
   * @param data - Appointment creation data
   * @returns Created appointment with related data
   * @throws {ConflictError} If time slot is not available
   * @throws {AppError} If creation fails
   */
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    try {
      const durationMinutes = await this.getServiceDuration(data.serviceId);
      const endTime = addMinutes(data.startTime, durationMinutes);

      const isAvailable = await this.checkAvailability(
        data.employeeId,
        data.startTime,
        endTime
      );

      if (!isAvailable) {
        throw new ConflictError('Time slot not available');
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          business_id: data.businessId,
          employee_id: data.employeeId,
          customer_id: data.customerId,
          service_id: data.serviceId,
          start_time: data.startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: APPOINTMENT_STATUS.PENDING,
          notes: data.notes,
        })
        .select(APPOINTMENT_SELECT_QUERY)
        .single();

      if (error) {
        logger.error('Failed to create appointment:', error);
        throw new AppError('Failed to create appointment', 500);
      }

      logger.info(`Appointment created: ${appointment.id}`);

      await scheduleReminder({
        id: appointment.id,
        customerId: data.customerId,
        serviceId: data.serviceId,
        startTime: data.startTime,
        businessId: data.businessId,
      });

      return appointment;
    } catch (error) {
      logger.error('Create appointment error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create appointment', 500);
    }
  }

  /**
   * Gets available time slots for a given employee, date, and service
   * @param params - Parameters including businessId, employeeId, date, and serviceId
   * @returns Array of time slots with availability status
   * @throws {AppError} If fetching slots fails
   */
  async getAvailableSlots(params: GetAvailabilityParams): Promise<TimeSlot[]> {
    try {
      const timezone = await this.getBusinessTimezone(params.businessId);
      const zonedDate = utcToZonedTime(params.date, timezone);

      const { data: workingHours } = await supabase
        .from('working_hours')
        .select('*')
        .eq('employee_id', params.employeeId)
        .eq('day_of_week', zonedDate.getDay())
        .eq('is_available', true)
        .single();

      if (!workingHours) {
        return [];
      }

      const durationMinutes = await this.getServiceDuration(params.serviceId);

      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('employee_id', params.employeeId)
        .in('status', [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED])
        .gte('start_time', startOfDay(zonedDate).toISOString())
        .lte('end_time', endOfDay(zonedDate).toISOString());

      return this.generateTimeSlots(
        zonedDate,
        workingHours,
        durationMinutes,
        appointments || [],
        timezone
      );
    } catch (error) {
      logger.error('Get available slots error:', error);
      throw new AppError('Failed to get available slots', 500);
    }
  }

  /**
   * Generates time slots for a given day based on working hours
   * @param date - Date to generate slots for
   * @param workingHours - Employee's working hours for the day
   * @param durationMinutes - Duration of the service
   * @param appointments - Existing appointments for the day
   * @param timezone - Business timezone
   * @returns Array of time slots
   */
  private generateTimeSlots(
    date: Date,
    workingHours: WorkingHours,
    durationMinutes: number,
    appointments: Partial<Appointment>[],
    timezone: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = workingHours.start_time.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end_time.split(':').map(Number);

    let currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    while (currentSlot < dayEnd) {
      const slotEnd = addMinutes(currentSlot, durationMinutes);

      if (slotEnd <= dayEnd) {
        const isOccupied = appointments.some(apt => {
          if (!apt.start_time || !apt.end_time) return false;
          const aptStart = parseISO(apt.start_time.toString());
          const aptEnd = parseISO(apt.end_time.toString());
          return currentSlot < aptEnd && slotEnd > aptStart;
        });

        slots.push({
          start: zonedTimeToUtc(currentSlot, timezone),
          end: zonedTimeToUtc(slotEnd, timezone),
          available: !isOccupied,
        });
      }

      currentSlot = addMinutes(currentSlot, TIME_CONSTANTS.SLOT_INTERVAL_MINUTES);
    }

    return slots;
  }

  /**
   * Retrieves an appointment by ID
   * @param id - UUID of the appointment
   * @param businessId - UUID of the business
   * @returns Appointment with related data
   * @throws {NotFoundError} If appointment is not found
   */
  async getAppointmentById(id: string, businessId: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT_QUERY)
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Appointment');
    }

    return data;
  }

  /**
   * Updates the status of an appointment
   * @param id - UUID of the appointment
   * @param businessId - UUID of the business
   * @param status - New status for the appointment
   * @returns Updated appointment
   * @throws {AppError} If update fails
   */
  async updateAppointmentStatus(
    id: string,
    businessId: string,
    status: AppointmentStatus
  ): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      throw new AppError('Failed to update appointment', 500);
    }

    if (status === APPOINTMENT_STATUS.CANCELLED || status === APPOINTMENT_STATUS.COMPLETED) {
      await cancelReminder(id);
    }

    logger.info(`Appointment ${id} status updated to ${status}`);
    return data;
  }

  /**
   * Retrieves all appointments for a business within a date range
   * @param businessId - UUID of the business
   * @param startDate - Optional start date filter
   * @param endDate - Optional end date filter
   * @returns Array of appointments
   * @throws {AppError} If fetching fails
   */
  async getAppointmentsByBusiness(
    businessId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(APPOINTMENT_SELECT_QUERY)
      .eq('business_id', businessId)
      .order('start_time', { ascending: true });

    if (startDate) {
      query = query.gte('start_time', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('start_time', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new AppError('Failed to fetch appointments', 500);
    }

    return data;
  }

  /**
   * Cancels an appointment
   * @param id - UUID of the appointment
   * @param businessId - UUID of the business
   * @returns Cancelled appointment
   */
  async cancelAppointment(id: string, businessId: string): Promise<Appointment> {
    return this.updateAppointmentStatus(id, businessId, APPOINTMENT_STATUS.CANCELLED);
  }
}