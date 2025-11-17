import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Employee,
  CreateEmployeeInput,
  QueryEmployeesInput,
} from '../models';
import { BaseService } from '../core/base.service';
import { NotFoundError } from '../core/errors';

/**
 * EmployeeService extending BaseService
 * Reduces ~150 lines of boilerplate while maintaining custom functionality
 */
class EmployeeService extends BaseService<Employee> {
  protected tableName = 'employees';
  protected entityName = 'Employee';

  constructor() {
    super(supabase);
  }

  /**
   * Override create to validate business exists
   */
  async create(data: CreateEmployeeInput): Promise<Employee> {
    try {
      // Validate business exists
      const { data: business, error: businessError } = await this.supabase
        .from('businesses')
        .select('id')
        .eq('id', data.business_id)
        .single();

      if (businessError || !business) {
        throw new NotFoundError('Business');
      }

      // Call parent create
      return await super.create(data);
    } catch (error) {
      logger.error('Error in createEmployee:', error);
      throw error;
    }
  }

  /**
   * Override getById to include business info
   */
  async getById(id: string): Promise<Employee | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, businesses(name)')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(this.entityName);
        }
        logger.error(`Error getting ${this.entityName} by ID:`, error);
        throw error;
      }

      return data as Employee;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Error in get${this.entityName}ById:`, error);
      throw error;
    }
  }

  /**
   * Override getAll to include business info and support filtering
   */
  async getAll(filters?: QueryEmployeesInput): Promise<Employee[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
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
        logger.error(`Error getting all ${this.entityName}s:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error(`Error in getAll${this.entityName}s:`, error);
      throw error;
    }
  }

  /**
   * Override search to include business info
   */
  async search(query: string, limit: number = 10): Promise<Employee[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*, businesses(name)')
        .or(
          `name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`
        )
        .limit(limit)
        .order('name', { ascending: true });

      if (error) {
        logger.error(`Error searching ${this.entityName}s:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error(`Error in search${this.entityName}s:`, error);
      throw error;
    }
  }

  /**
   * Custom method: Get employees by business
   */
  async getEmployeesByBusiness(businessId: string): Promise<Employee[]> {
    return this.getAll({ business_id: businessId });
  }

  /**
   * Custom method: Get active employees by business
   */
  async getActiveEmployeesByBusiness(businessId: string): Promise<Employee[]> {
    return this.getAll({ business_id: businessId, is_active: true });
  }

  /**
   * Custom method: Activate employee
   */
  async activateEmployee(id: string): Promise<Employee> {
    return this.update(id, { is_active: true });
  }

  /**
   * Custom method: Deactivate employee
   */
  async deactivateEmployee(id: string): Promise<Employee> {
    return this.update(id, { is_active: false });
  }

  /**
   * Custom method: Get employee availability
   */
  async getEmployeeAvailability(employeeId: string) {
    try {
      const { data, error } = await this.supabase
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
  }

  /**
   * Custom method: Get employee appointments
   */
  async getEmployeeAppointments(
    employeeId: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      let query = this.supabase
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

      const { data, error} = await query;

      if (error) {
        logger.error('Error getting employee appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getEmployeeAppointments:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get employee statistics
   */
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
  }

  // Alias methods for backward compatibility
  createEmployee = this.create;
  getEmployeeById = this.getById;
  getAllEmployees = this.getAll;
  updateEmployee = this.update;
  deleteEmployee = this.delete;
  searchEmployees = this.search;
}

// Export class and singleton instance
export { EmployeeService };
export const employeeService = new EmployeeService();
