import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  QueryAppointmentsInput,
} from '../models';
import { reminderService } from './reminder.service';

export const appointmentService = {
  async createAppointment(data: CreateAppointmentInput): Promise<Appointment> {
    try {
      const hasConflict = await this.checkConflict(
        data.employee_id,
        data.start_time,
        data.end_time
      );

      if (hasConflict) {
        throw new Error('Time slot is already booked');
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          business_id: data.business_id,
          employee_id: data.employee_id,
          customer_id: data.customer_id,
          start_time: data.start_time,
          end_time: data.end_time,
          status: 'pending',
          notes: data.notes,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating appointment:', error);
        throw error;
      }

      logger.info('Appointment created:', appointment.id);
      return appointment;
    } catch (error) {
      logger.error('Error in createAppointment:', error);
      throw error;
    }
  },

  async getAppointmentById(id: string): Promise<Appointment | null> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getAppointmentById:', error);
      throw error;
    }
  },

  async queryAppointments(filters: QueryAppointmentsInput): Promise<Appointment[]> {
    try {
      let query = supabase.from('appointments').select('*');

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
  },

  async updateAppointment(
    id: string,
    data: UpdateAppointmentInput
  ): Promise<Appointment> {
    try {
      if (data.start_time || data.end_time) {
        const existing = await this.getAppointmentById(id);
        if (!existing) {
          throw new Error('Appointment not found');
        }

        const hasConflict = await this.checkConflict(
          data.employee_id || existing.employee_id,
          data.start_time || existing.start_time,
          data.end_time || existing.end_time,
          id
        );

        if (hasConflict) {
          throw new Error('Time slot is already booked');
        }
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating appointment:', error);
        throw error;
      }

      logger.info('Appointment updated:', id);
      return appointment;
    } catch (error) {
      logger.error('Error in updateAppointment:', error);
      throw error;
    }
  },

  async cancelAppointment(id: string): Promise<Appointment> {
    try {
      const result = await this.updateAppointment(id, { status: 'cancelled' });

      // Cancelar recordatorios programados
      try {
        await reminderService.cancelReminders(id);
        logger.info(`Reminders cancelled for appointment ${id}`);
      } catch (reminderError) {
        logger.error('Error cancelling reminders:', reminderError);
        // No fallar la cancelación de la cita si los recordatorios fallan
      }

      return result;
    } catch (error) {
      logger.error('Error in cancelAppointment:', error);
      throw error;
    }
  },

  async confirmAppointment(id: string): Promise<Appointment> {
    try {
      return await this.updateAppointment(id, { status: 'confirmed' });
    } catch (error) {
      logger.error('Error in confirmAppointment:', error);
      throw error;
    }
  },

  async completeAppointment(id: string): Promise<Appointment> {
    try {
      return await this.updateAppointment(id, { status: 'completed' });
    } catch (error) {
      logger.error('Error in completeAppointment:', error);
      throw error;
    }
  },

  async markNoShow(id: string): Promise<Appointment> {
    try {
      return await this.updateAppointment(id, { status: 'no_show' });
    } catch (error) {
      logger.error('Error in markNoShow:', error);
      throw error;
    }
  },

  async deleteAppointment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting appointment:', error);
        throw error;
      }

      logger.info('Appointment deleted:', id);
      return true;
    } catch (error) {
      logger.error('Error in deleteAppointment:', error);
      throw error;
    }
  },

  async checkConflict(
    employeeId: string,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('appointments')
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
  },

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
  },

  async getUpcomingAppointments(
    businessId?: string,
    limit: number = 10
  ): Promise<Appointment[]> {
    try {
      const now = new Date().toISOString();
      let query = supabase
        .from('appointments')
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
  },

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
      const { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd);

      if (todayError) throw todayError;

      // Get this week's appointments
      const { data: weekData, error: weekError } = await supabase
        .from('appointments')
        .select('id')
        .eq('business_id', businessId)
        .gte('start_time', weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString());

      if (weekError) throw weekError;

      // Get pending appointments
      const { data: pendingData, error: pendingError } = await supabase
        .from('appointments')
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
  },
};
