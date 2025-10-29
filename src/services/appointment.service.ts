import { supabase } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import { Appointment, TimeSlot } from '../types';
import { addMinutes, startOfDay, endOfDay, parseISO } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import logger from '../utils/logger';

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

export class AppointmentService {
  async createAppointment(data: CreateAppointmentData) {
    try {
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', data.serviceId)
        .single();

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      const endTime = addMinutes(data.startTime, service.duration_minutes);

      const isAvailable = await this.checkAvailability(
        data.employeeId,
        data.startTime,
        endTime
      );

      if (!isAvailable) {
        throw new AppError('Time slot not available', 409);
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
        .select(`
          *,
          employee:employees(*),
          customer:customers(*),
          service:services(*)
        `)
        .single();

      if (error) {
        throw new AppError('Failed to create appointment', 500);
      }

      logger.info(`Appointment created: ${appointment.id}`);
      return appointment;
    } catch (error) {
      logger.error('Create appointment error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create appointment', 500);
    }
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

  async getAvailableSlots(params: GetAvailabilityParams): Promise<TimeSlot[]> {
    try {
      const { data: business } = await supabase
        .from('businesses')
        .select('timezone')
        .eq('id', params.businessId)
        .single();

      const timezone = business?.timezone || 'America/Argentina/Buenos_Aires';
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

      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', params.serviceId)
        .single();

      if (!service) {
        throw new AppError('Service not found', 404);
      }

      const { data: appointments } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('employee_id', params.employeeId)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', startOfDay(zonedDate).toISOString())
        .lte('end_time', endOfDay(zonedDate).toISOString());

      const slots: TimeSlot[] = [];
      const [startHour, startMinute] = workingHours.start_time.split(':').map(Number);
      const [endHour, endMinute] = workingHours.end_time.split(':').map(Number);

      let currentSlot = new Date(zonedDate);
      currentSlot.setHours(startHour, startMinute, 0, 0);

      const dayEnd = new Date(zonedDate);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      while (currentSlot < dayEnd) {
        const slotEnd = addMinutes(currentSlot, service.duration_minutes);

        if (slotEnd > dayEnd) break;

        const isOccupied = appointments?.some(apt => {
          const aptStart = parseISO(apt.start_time);
          const aptEnd = parseISO(apt.end_time);
          return currentSlot < aptEnd && slotEnd > aptStart;
        });

        slots.push({
          start: zonedTimeToUtc(currentSlot, timezone),
          end: zonedTimeToUtc(slotEnd, timezone),
          available: !isOccupied,
        });

        currentSlot = addMinutes(currentSlot, 30);
      }

      return slots;
    } catch (error) {
      logger.error('Get available slots error:', error);
      throw new AppError('Failed to get available slots', 500);
    }
  }

  async getAppointmentById(id: string, businessId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        employee:employees(*),
        customer:customers(*),
        service:services(*)
      `)
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) {
      throw new AppError('Appointment not found', 404);
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

    logger.info(`Appointment ${id} status updated to ${status}`);
    return data;
  }

  async getAppointmentsByBusiness(businessId: string, startDate?: Date, endDate?: Date) {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        employee:employees(*),
        customer:customers(*),
        service:services(*)
      `)
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