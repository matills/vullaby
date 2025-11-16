import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  QueryAppointmentsInput,
} from '../models';
import { BaseService } from '../core/base.service';
import { ConflictError, NotFoundError } from '../core/errors';
import { reminderService } from './reminder.service';

/**
 * AppointmentService extending BaseService
 * Reduces ~100 lines of boilerplate while maintaining complex business logic
 */
class AppointmentService extends BaseService<Appointment> {
  protected tableName = 'appointments';
  protected entityName = 'Appointment';

  constructor() {
    super(supabase);
  }

  /**
   * Override create to check for conflicts
   */
  async create(data: CreateAppointmentInput): Promise<Appointment> {
    try {
      const hasConflict = await this.checkConflict(
        data.employee_id,
        data.start_time,
        data.end_time
      );

      if (hasConflict) {
        throw new ConflictError('Time slot is already booked');
      }

      // Set default status to pending
      const appointmentData = {
        ...data,
        status: data.status || 'pending',
      };

      return await super.create(appointmentData);
    } catch (error) {
      logger.error('Error in createAppointment:', error);
      throw error;
    }
  }

  /**
   * Override update to check for conflicts when time/employee changes
   */
  async update(id: string, data: UpdateAppointmentInput): Promise<Appointment> {
    try {
      if (data.start_time || data.end_time || data.employee_id) {
        const existing = await this.getById(id);
        if (!existing) {
          throw new NotFoundError(this.entityName);
        }

        const hasConflict = await this.checkConflict(
          data.employee_id || existing.employee_id,
          data.start_time || existing.start_time,
          data.end_time || existing.end_time,
          id
        );

        if (hasConflict) {
          throw new ConflictError('Time slot is already booked');
        }
      }

      return await super.update(id, data);
    } catch (error) {
      logger.error('Error in updateAppointment:', error);
      throw error;
    }
  }

  /**
   * Custom method: Cancel appointment and its reminders
   */
  async cancelAppointment(id: string): Promise<Appointment> {
    try {
      const result = await this.update(id, { status: 'cancelled' });

      // Cancel scheduled reminders
      try {
        await reminderService.cancelReminders(id);
        logger.info(`Reminders cancelled for appointment ${id}`);
      } catch (reminderError) {
        logger.error('Error cancelling reminders:', reminderError);
        // Don't fail appointment cancellation if reminders fail
      }

      return result;
    } catch (error) {
      logger.error('Error in cancelAppointment:', error);
      throw error;
    }
  }

  /**
   * Custom method: Confirm appointment
   */
  async confirmAppointment(id: string): Promise<Appointment> {
    return this.update(id, { status: 'confirmed' });
  }

  /**
   * Custom method: Complete appointment
   */
  async completeAppointment(id: string): Promise<Appointment> {
    return this.update(id, { status: 'completed' });
  }

  /**
   * Custom method: Mark appointment as no-show
   */
  async markNoShow(id: string): Promise<Appointment> {
    return this.update(id, { status: 'no_show' });
  }

  /**
   * Custom method: Check for appointment conflicts
   */
  async checkConflict(
    employeeId: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('id')
        .eq('employee_id', employeeId)
        .neq('status', 'cancelled')
        .or(`and(start_time.lt.${endTime},end_time.gt.${startTime})`);

      if (excludeAppointmentId) {
        query = query.neq('id', excludeAppointmentId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error checking conflicts:', error);
        throw error;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      logger.error('Error in checkConflict:', error);
      throw error;
    }
  }

  /**
   * Custom method: Query appointments with filters
   */
  async queryAppointments(filters: QueryAppointmentsInput): Promise<Appointment[]> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      if (filters.business_id) {
        query = query.eq('business_id', filters.business_id);
      }

      if (filters.employee_id) {
        query = query.eq('employee_id', filters.employee_id);
      }

      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.start_date) {
        query = query.gte('start_time', filters.start_date);
      }

      if (filters.end_date) {
        query = query.lte('start_time', filters.end_date);
      }

      const { data, error } = await query.order('start_time', { ascending: true });

      if (error) {
        logger.error('Error querying appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in queryAppointments:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get appointments by date range
   */
  async getAppointmentsByDateRange(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<Appointment[]> {
    return this.queryAppointments({
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate,
    });
  }

  /**
   * Custom method: Get appointments by customer
   */
  async getAppointmentsByCustomer(customerId: string): Promise<Appointment[]> {
    return this.queryAppointments({
      customer_id: customerId,
    });
  }

  /**
   * Custom method: Get upcoming appointments
   */
  async getUpcomingAppointments(
    businessId?: string,
    limit: number = 10
  ): Promise<Appointment[]> {
    try {
      const now = new Date().toISOString();
      let query = this.supabase
        .from(this.tableName)
        .select(`
          *,
          customer:customers(id, name, phone, email),
          employee:employees(id, name, phone, email)
        `)
        .gte('start_time', now)
        .in('status', ['pending', 'confirmed'])
        .order('start_time', { ascending: true })
        .limit(limit);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting upcoming appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getUpcomingAppointments:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get appointment statistics
   */
  async getStats(businessId: string, startDate?: string, endDate?: string) {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Get today's appointments
      const { data: todayData, error: todayError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('business_id', businessId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd);

      if (todayError) throw todayError;

      // Get this week's appointments
      const { data: weekData, error: weekError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('business_id', businessId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      if (weekError) throw weekError;

      // Get pending appointments
      const { data: pendingData, error: pendingError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('business_id', businessId)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      return {
        todayCount: todayData?.length || 0,
        weekCount: weekData?.length || 0,
        pendingCount: pendingData?.length || 0,
      };
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  }

  // Alias methods for backward compatibility
  createAppointment = this.create;
  getAppointmentById = this.getById;
  updateAppointment = this.update;
  deleteAppointment = this.delete;
}

// Export class and singleton instance
export { AppointmentService };
export const appointmentService = new AppointmentService();
