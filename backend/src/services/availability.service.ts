import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Availability,
  TimeSlot,
} from '../models';
import { BaseService } from '../core/base.service';
import { appointmentService } from './appointment.service';

/**
 * AvailabilityService extending BaseService
 * Reduces ~100 lines of boilerplate while maintaining complex slot calculation logic
 */
class AvailabilityService extends BaseService<Availability> {
  protected tableName = 'availability';
  protected entityName = 'Availability';

  constructor() {
    super(supabase);
  }

  /**
   * Custom method: Get availability by employee
   */
  async getAvailabilityByEmployee(employeeId: string): Promise<Availability[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
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
  }

  /**
   * Custom method: Get available time slots for an employee on a specific date
   * Complex business logic for slot calculation
   */
  async getAvailableSlots(
    employeeId: string,
    date: Date,
    duration: number = 60
  ): Promise<TimeSlot[]> {
    try {
      const dayOfWeek = date.getDay();

      // Get employee's availability for this day
      const { data: availabilityRecords, error: availError } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('employee_id', employeeId)
        .eq('day_of_week', dayOfWeek);

      if (availError) {
        logger.error('Error getting availability records:', availError);
        throw availError;
      }

      if (!availabilityRecords || availabilityRecords.length === 0) {
        return [];
      }

      // Get existing appointments for this date
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);

      const appointments = await appointmentService.getAppointmentsByDateRange(
        employeeId,
        dateStart.toISOString(),
        dateEnd.toISOString()
      );

      // Calculate available slots
      const slots: TimeSlot[] = [];

      for (const availability of availabilityRecords) {
        const startTime = this.parseTimeToMinutes(availability.start_time);
        const endTime = this.parseTimeToMinutes(availability.end_time);

        // Generate time slots
        for (let time = startTime; time + duration <= endTime; time += duration) {
          const slotStart = this.minutesToTime(time);
          const slotEnd = this.minutesToTime(time + duration);

          // Check if slot conflicts with any appointment
          const hasConflict = appointments.some((apt: any) => {
            if (apt.status === 'cancelled') return false;

            const aptStart = new Date(apt.start_time);
            const aptEnd = new Date(apt.end_time);

            const slotStartDate = new Date(date);
            const [slotStartHours, slotStartMinutes] = slotStart.split(':').map(Number);
            slotStartDate.setHours(slotStartHours, slotStartMinutes, 0, 0);

            const slotEndDate = new Date(date);
            const [slotEndHours, slotEndMinutes] = slotEnd.split(':').map(Number);
            slotEndDate.setHours(slotEndHours, slotEndMinutes, 0, 0);

            return (
              slotStartDate < aptEnd && slotEndDate > aptStart
            );
          });

          if (!hasConflict) {
            // Create datetime strings for start and end
            const slotStartDate = new Date(date);
            const [slotStartHours, slotStartMinutes] = slotStart.split(':').map(Number);
            slotStartDate.setHours(slotStartHours, slotStartMinutes, 0, 0);

            const slotEndDate = new Date(date);
            const [slotEndHours, slotEndMinutes] = slotEnd.split(':').map(Number);
            slotEndDate.setHours(slotEndHours, slotEndMinutes, 0, 0);

            slots.push({
              employee_id: employeeId,
              start_time: slotStartDate.toISOString(),
              end_time: slotEndDate.toISOString(),
              available: true,
            });
          }
        }
      }

      return slots.sort((a, b) => a.start_time.localeCompare(b.start_time));
    } catch (error) {
      logger.error('Error in getAvailableSlots:', error);
      throw error;
    }
  }

  /**
   * Custom method: Check if employee is available at a specific time
   */
  async isEmployeeAvailable(
    employeeId: string,
    startTime: Date,
    endTime: Date
  ): Promise<boolean> {
    try {
      const dayOfWeek = startTime.getDay();
      const timeStart = this.formatTime(startTime);
      const timeEnd = this.formatTime(endTime);

      // Check if within availability hours
      const { data: availabilityRecords, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('employee_id', employeeId)
        .eq('day_of_week', dayOfWeek)
        .lte('start_time', timeStart)
        .gte('end_time', timeEnd);

      if (error) {
        logger.error('Error checking employee availability:', error);
        throw error;
      }

      if (!availabilityRecords || availabilityRecords.length === 0) {
        return false;
      }

      // Check for appointment conflicts
      const hasConflict = await appointmentService.checkConflict(
        employeeId,
        startTime.toISOString(),
        endTime.toISOString()
      );

      return !hasConflict;
    } catch (error) {
      logger.error('Error in isEmployeeAvailable:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get next available slot for an employee
   */
  async getNextAvailableSlot(
    employeeId: string,
    fromDate: Date,
    duration: number = 60,
    maxDays: number = 14
  ): Promise<TimeSlot | null> {
    try {
      const currentDate = new Date(fromDate);

      for (let day = 0; day < maxDays; day++) {
        const slots = await this.getAvailableSlots(employeeId, currentDate, duration);

        if (slots.length > 0) {
          return slots[0];
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return null;
    } catch (error) {
      logger.error('Error in getNextAvailableSlot:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get availability summary for an employee
   */
  async getAvailabilitySummary(employeeId: string) {
    try {
      const availabilities = await this.getAvailabilityByEmployee(employeeId);

      const summary = availabilities.reduce((acc: any, avail) => {
        const day = this.getDayName(avail.day_of_week);
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push({
          start: avail.start_time,
          end: avail.end_time,
        });
        return acc;
      }, {});

      return summary;
    } catch (error) {
      logger.error('Error in getAvailabilitySummary:', error);
      throw error;
    }
  }

  /**
   * Helper: Parse time string (HH:MM) to minutes
   */
  private parseTimeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Helper: Convert minutes to time string (HH:MM)
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Helper: Format Date to time string (HH:MM)
   */
  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Helper: Get day name from number (0-6)
   */
  private getDayName(dayNumber: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNumber] || 'Unknown';
  }

  // Alias methods for backward compatibility
  createAvailability = this.create;
  updateAvailability = this.update;
  deleteAvailability = this.delete;
}

// Export class and singleton instance
export { AvailabilityService };
export const availabilityService = new AvailabilityService();
