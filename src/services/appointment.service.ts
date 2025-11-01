import { supabase } from '../config/database';
import { AppError, NotFoundError, ConflictError } from '../middlewares/error.middleware';
import { TimeSlot } from '../types';
import { addMinutes, startOfDay, endOfDay, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import logger from '../utils/logger';
import { scheduleReminder, cancelReminder } from '../jobs/reminder.processor';

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

const APPOINTMENT_SELECT_QUERY = `
  *,
  employee:employees(*),
  customer:customers(*),
  service:services(*)
`;

export class AppointmentService {
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

  private async getBusinessTimezone(businessId: string): Promise<string> {
    const { data: business } = await supabase
      .from('businesses')
      .select('timezone')
      .eq('id', businessId)
      .single();

    return business?.timezone || 'America/Argentina/Buenos_Aires';
  }

  async checkAvailability(
    employeeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('employee_id', employeeId)
      .in('status', ['pending', 'confirmed'])
      .or(`start_time.lt.${endTime.toISOString()},end_time.gt.${startTime.toISOString()}`);

    return !conflicts || conflicts.length === 0;
  }

  async createAppointment(data: CreateAppointmentData) {
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
          status: 'pending',
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
        .in('status', ['pending', 'confirmed'])
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

  private generateTimeSlots(
    date: Date,
    workingHours: any,
    durationMinutes: number,
    appointments: any[],
    timezone: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = workingHours.start_time.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end_time.split(':').map(Number);

    let currentSlot = new Date(date);
    currentSlot.setHours(startHour, startMinute, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    const SLOT_INTERVAL = 30;

    while (currentSlot < dayEnd) {
      const slotEnd = addMinutes(currentSlot, durationMinutes);

      if (slotEnd <= dayEnd) {
        const isOccupied = appointments.some(apt => {
          const aptStart = parseISO(apt.start_time);
          const aptEnd = parseISO(apt.end_time);
          return currentSlot < aptEnd && slotEnd > aptStart;
        });

        slots.push({
          start: zonedTimeToUtc(currentSlot, timezone),
          end: zonedTimeToUtc(slotEnd, timezone),
          available: !isOccupied,
        });
      }

      currentSlot = addMinutes(currentSlot, SLOT_INTERVAL);
    }

    return slots;
  }

  async getAppointmentById(id: string, businessId: string) {
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

  async updateAppointmentStatus(id: string, businessId: string, status: string) {
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

    if (status === 'cancelled' || status === 'completed') {
      await cancelReminder(id);
    }

    logger.info(`Appointment ${id} status updated to ${status}`);
    return data;
  }

  async getAppointmentsByBusiness(businessId: string, startDate?: Date, endDate?: Date) {
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

  async cancelAppointment(id: string, businessId: string) {
    return this.updateAppointmentStatus(id, businessId, 'cancelled');
  }
}