import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Availability,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  TimeSlot,
  GetAvailableSlotsInput,
} from '../models';
import { appointmentService } from './appointment.service';

export const availabilityService = {
  async createAvailability(data: CreateAvailabilityInput): Promise<Availability> {
    try {
      const { data: availability, error } = await supabase
        .from('availability')
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error('Error creating availability:', error);
        throw error;
      }

      logger.info('Availability created:', availability.id);
      return availability;
    } catch (error) {
      logger.error('Error in createAvailability:', error);
      throw error;
    }
  },

  async getAvailabilityByEmployee(employeeId: string): Promise<Availability[]> {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week', { ascending: true });

      if (error) {
        logger.error('Error getting availability:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAvailabilityByEmployee:', error);
      throw error;
    }
  },

  async updateAvailability(
    id: string,
    data: UpdateAvailabilityInput
  ): Promise<Availability> {
    try {
      const { data: availability, error } = await supabase
        .from('availability')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating availability:', error);
        throw error;
      }

      logger.info('Availability updated:', id);
      return availability;
    } catch (error) {
      logger.error('Error in updateAvailability:', error);
      throw error;
    }
  },

  async deleteAvailability(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('availability')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting availability:', error);
        throw error;
      }

      logger.info('Availability deleted:', id);
      return true;
    } catch (error) {
      logger.error('Error in deleteAvailability:', error);
      throw error;
    }
  },

  async getAvailableSlots(params: GetAvailableSlotsInput): Promise<TimeSlot[]> {
    try {
      const { business_id, employee_id, date, duration } = params;

      const targetDate = new Date(date);
      const dayOfWeek = targetDate.getDay();

      let query = supabase
        .from('availability')
        .select('*')
        .eq('day_of_week', dayOfWeek);

      if (employee_id) {
        query = query.eq('employee_id', employee_id);
      } else {
        const { data: employees } = await supabase
          .from('employees')
          .select('id')
          .eq('business_id', business_id);

        if (employees && employees.length > 0) {
          const employeeIds = employees.map((e) => e.id);
          query = query.in('employee_id', employeeIds);
        }
      }

      const { data: availabilities, error } = await query;

      if (error) {
        throw error;
      }

      if (!availabilities || availabilities.length === 0) {
        return [];
      }

      const allSlots: TimeSlot[] = [];

      for (const availability of availabilities) {
        const slots = this.generateTimeSlots(
          targetDate,
          availability.start_time,
          availability.end_time,
          duration,
          availability.employee_id
        );
        allSlots.push(...slots);
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await appointmentService.queryAppointments({
        business_id,
        employee_id,
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
      });

      const availableSlots = allSlots.map((slot) => {
        const slotStart = new Date(slot.start_time);
        const slotEnd = new Date(slot.end_time);

        const hasConflict = appointments.some((appointment) => {
          if (
            appointment.status === 'cancelled' ||
            appointment.employee_id !== slot.employee_id
          ) {
            return false;
          }

          const appointmentStart = new Date(appointment.start_time);
          const appointmentEnd = new Date(appointment.end_time);

          return (
            (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
          );
        });

        return {
          ...slot,
          available: !hasConflict,
        };
      });

      const now = new Date();
      const futureSlots = availableSlots.filter(
        (slot) => new Date(slot.start_time) > now
      );

      return futureSlots;
    } catch (error) {
      logger.error('Error in getAvailableSlots:', error);
      throw error;
    }
  },

  generateTimeSlots(
    date: Date,
    startTime: string,
    endTime: string,
    duration: number,
    employeeId: string
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const current = new Date(date);
    current.setHours(startHour, startMin, 0, 0);

    const end = new Date(date);
    end.setHours(endHour, endMin, 0, 0);

    while (current < end) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      if (slotEnd <= end) {
        slots.push({
          start_time: slotStart.toISOString(),
          end_time: slotEnd.toISOString(),
          available: true,
          employee_id: employeeId,
        });
      }

      current.setMinutes(current.getMinutes() + duration);
    }

    return slots;
  },

  async isEmployeeAvailable(
    employeeId: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const start = new Date(startTime);
      const dayOfWeek = start.getDay();
      const timeString = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;

      const { data: availabilities, error } = await supabase
        .from('availability')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('day_of_week', dayOfWeek);

      if (error) {
        throw error;
      }

      if (!availabilities || availabilities.length === 0) {
        return false;
      }

      const isWithinWindow = availabilities.some((availability) => {
        return (
          timeString >= availability.start_time &&
          timeString < availability.end_time
        );
      });

      if (!isWithinWindow) {
        return false;
      }

      const hasConflict = await appointmentService.checkConflict(
        employeeId,
        startTime,
        endTime
      );

      return !hasConflict;
    } catch (error) {
      logger.error('Error in isEmployeeAvailable:', error);
      throw error;
    }
  },

  async getNextAvailableSlot(
    employeeId: string,
    businessId: string,
    duration: number = 60,
    daysAhead: number = 30
  ): Promise<TimeSlot | null> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < daysAhead; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + i);

        const slots = await this.getAvailableSlots({
          business_id: businessId,
          employee_id: employeeId,
          date: checkDate.toISOString(),
          duration,
        });

        const availableSlot = slots.find((slot) => slot.available);

        if (availableSlot) {
          return availableSlot;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error in getNextAvailableSlot:', error);
      throw error;
    }
  },

  async getAvailabilitySummary(
    businessId: string,
    date: string,
    duration: number = 60
  ): Promise<Record<string, TimeSlot[]>> {
    try {
      const { data: employees, error } = await supabase
        .from('employees')
        .select('id, name')
        .eq('business_id', businessId);

      if (error) {
        throw error;
      }

      if (!employees || employees.length === 0) {
        return {};
      }

      const summary: Record<string, TimeSlot[]> = {};

      for (const employee of employees) {
        const slots = await this.getAvailableSlots({
          business_id: businessId,
          employee_id: employee.id,
          date,
          duration,
        });

        summary[employee.id] = slots.filter((slot) => slot.available);
      }

      return summary;
    } catch (error) {
      logger.error('Error in getAvailabilitySummary:', error);
      throw error;
    }
  },
};
