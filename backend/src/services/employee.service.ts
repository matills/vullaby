import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  QueryEmployeesInput,
} from '../models';

export const employeeService = {
  async createEmployee(data: CreateEmployeeInput): Promise<Employee> {
    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', data.business_id)
        .single();

      if (businessError || !business) {
        throw new Error('Business not found');
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error('Error creating employee:', error);
        throw error;
      }

      logger.info(`Employee created: ${employee.name} (ID: ${employee.id}, Business: ${employee.business_id})`);
      return employee;
    } catch (error) {
      logger.error('Error in createEmployee:', error);
      throw error;
    }
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, businesses(name)')
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
      logger.error('Error in getEmployeeById:', error);
      throw error;
    }
  },

  async getAllEmployees(filters?: QueryEmployeesInput): Promise<Employee[]> {
    try {
      let query = supabase
        .from('employees')
        .select('*, businesses(name)');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%,role.ilike.%${filters.search}%`
        );
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1
        );
      }

      query = query.order('name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting all employees:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAllEmployees:', error);
      throw error;
    }
  },

  async getEmployeesByBusiness(businessId: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Error getting employees by business:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getEmployeesByBusiness:', error);
      throw error;
    }
  },

  async getActiveEmployeesByBusiness(businessId: string): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Error getting active employees:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getActiveEmployeesByBusiness:', error);
      throw error;
    }
  },

  async updateEmployee(
    id: string,
    data: UpdateEmployeeInput
  ): Promise<Employee> {
    try {
      const existing = await this.getEmployeeById(id);
      if (!existing) {
        throw new Error('Employee not found');
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating employee:', error);
        throw error;
      }

      logger.info(`Employee updated: ${employee.name} (ID: ${id})`);
      return employee;
    } catch (error) {
      logger.error('Error in updateEmployee:', error);
      throw error;
    }
  },

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      const existing = await this.getEmployeeById(id);
      if (!existing) {
        throw new Error('Employee not found');
      }

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting employee:', error);
        throw error;
      }

      logger.info(`Employee deleted: ${existing.name} (ID: ${id})`);
      return true;
    } catch (error) {
      logger.error('Error in deleteEmployee:', error);
      throw error;
    }
  },

  async activateEmployee(id: string): Promise<Employee> {
    try {
      return await this.updateEmployee(id, { is_active: true });
    } catch (error) {
      logger.error('Error in activateEmployee:', error);
      throw error;
    }
  },

  async deactivateEmployee(id: string): Promise<Employee> {
    try {
      return await this.updateEmployee(id, { is_active: false });
    } catch (error) {
      logger.error('Error in deactivateEmployee:', error);
      throw error;
    }
  },

  async searchEmployees(query: string, limit: number = 10): Promise<Employee[]> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, businesses(name)')
        .or(
          `name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`
        )
        .limit(limit)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Error searching employees:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in searchEmployees:', error);
      throw error;
    }
  },

  async getEmployeeAvailability(employeeId: string) {
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        logger.error('Error getting employee availability:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getEmployeeAvailability:', error);
      throw error;
    }
  },

  async getEmployeeAppointments(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      let query = supabase
        .from('appointments')
        .select('*, customers(name, phone)')
        .eq('employee_id', employeeId);

      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      query = query.order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting employee appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getEmployeeAppointments:', error);
      throw error;
    }
  },

  async getEmployeeStats(employeeId: string) {
    try {
      const appointments = await this.getEmployeeAppointments(employeeId);
      const availability = await this.getEmployeeAvailability(employeeId);

      const pendingAppointments = appointments.filter(
        (app: any) => app.status === 'pending'
      );
      const confirmedAppointments = appointments.filter(
        (app: any) => app.status === 'confirmed'
      );
      const completedAppointments = appointments.filter(
        (app: any) => app.status === 'completed'
      );
      const cancelledAppointments = appointments.filter(
        (app: any) => app.status === 'cancelled'
      );

      return {
        totalAppointments: appointments.length,
        pendingAppointments: pendingAppointments.length,
        confirmedAppointments: confirmedAppointments.length,
        completedAppointments: completedAppointments.length,
        cancelledAppointments: cancelledAppointments.length,
        availabilitySlots: availability.length,
      };
    } catch (error) {
      logger.error('Error in getEmployeeStats:', error);
      throw error;
    }
  },
};
