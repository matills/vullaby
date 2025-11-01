import { supabase } from '../config/database';
import { AppError, NotFoundError, ConflictError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

interface CreateEmployeeData {
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'employee';
}

interface WorkingHoursData {
  employeeId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

type UpdateEmployeeData = Partial<Omit<CreateEmployeeData, 'businessId'>>;

export class EmployeeService {
  private async checkDuplicateEmail(email: string): Promise<void> {
    const { data: existing } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      throw new ConflictError('Employee with this email already exists');
    }
  }

  async createEmployee(data: CreateEmployeeData) {
    try {
      await this.checkDuplicateEmail(data.email);

      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          business_id: data.businessId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          is_active: true,
        })
        .select()
        .single();

      if (error || !employee) {
        logger.error('Failed to create employee:', error);
        throw new AppError('Failed to create employee', 500);
      }

      logger.info(`Employee created: ${employee.id}`);
      return employee;
    } catch (error) {
      logger.error('Create employee error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create employee', 500);
    }
  }

  async getEmployeesByBusiness(businessId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .order('name');

    if (error) {
      logger.error('Failed to fetch employees:', error);
      throw new AppError('Failed to fetch employees', 500);
    }

    return data;
  }

  async getEmployeeById(id: string, businessId: string) {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Employee');
    }

    return data;
  }

  async updateEmployee(id: string, businessId: string, updates: UpdateEmployeeData) {
    const updateData: Record<string, any> = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.role) updateData.role = updates.role;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update employee:', error);
      throw new AppError('Failed to update employee', 500);
    }

    logger.info(`Employee updated: ${id}`);
    return data;
  }

  async toggleEmployeeStatus(id: string, businessId: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('employees')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update employee status:', error);
      throw new AppError('Failed to update employee status', 500);
    }

    logger.info(`Employee ${id} status changed to ${isActive}`);
    return data;
  }

  async deleteEmployee(id: string, businessId: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      logger.error('Failed to delete employee:', error);
      throw new AppError('Failed to delete employee', 500);
    }

    logger.info(`Employee deleted: ${id}`);
    return { success: true };
  }

  async setWorkingHours(data: WorkingHoursData) {
    try {
      const { data: existing } = await supabase
        .from('working_hours')
        .select('id')
        .eq('employee_id', data.employeeId)
        .eq('day_of_week', data.dayOfWeek)
        .single();

      if (existing) {
        return this.updateWorkingHours(existing.id, data);
      }

      return this.createWorkingHours(data);
    } catch (error) {
      logger.error('Set working hours error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to set working hours', 500);
    }
  }

  private async updateWorkingHours(id: string, data: WorkingHoursData) {
    const { data: updated, error } = await supabase
      .from('working_hours')
      .update({
        start_time: data.startTime,
        end_time: data.endTime,
        is_available: data.isAvailable,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new AppError('Failed to update working hours', 500);
    }

    return updated;
  }

  private async createWorkingHours(data: WorkingHoursData) {
    const { data: workingHours, error } = await supabase
      .from('working_hours')
      .insert({
        employee_id: data.employeeId,
        day_of_week: data.dayOfWeek,
        start_time: data.startTime,
        end_time: data.endTime,
        is_available: data.isAvailable,
      })
      .select()
      .single();

    if (error || !workingHours) {
      throw new AppError('Failed to create working hours', 500);
    }

    logger.info(`Working hours set for employee ${data.employeeId}`);
    return workingHours;
  }

  async getWorkingHours(employeeId: string) {
    const { data, error } = await supabase
      .from('working_hours')
      .select('*')
      .eq('employee_id', employeeId)
      .order('day_of_week');

    if (error) {
      logger.error('Failed to fetch working hours:', error);
      throw new AppError('Failed to fetch working hours', 500);
    }

    return data;
  }
}