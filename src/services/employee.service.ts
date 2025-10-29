import { supabase } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
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

export class EmployeeService {
  async createEmployee(data: CreateEmployeeData) {
    try {
      const { data: existing } = await supabase
        .from('employees')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existing) {
        throw new AppError('Employee with this email already exists', 409);
      }

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
      throw new AppError('Employee not found', 404);
    }

    return data;
  }

  async updateEmployee(
    id: string,
    businessId: string,
    updates: Partial<CreateEmployeeData>
  ) {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.email) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.role) updateData.role = updates.role;

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
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
        const { data: updated, error } = await supabase
          .from('working_hours')
          .update({
            start_time: data.startTime,
            end_time: data.endTime,
            is_available: data.isAvailable,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error || !updated) {
          throw new AppError('Failed to update working hours', 500);
        }

        return updated;
      }

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
    } catch (error) {
      logger.error('Set working hours error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to set working hours', 500);
    }
  }

  async getWorkingHours(employeeId: string) {
    const { data, error } = await supabase
      .from('working_hours')
      .select('*')
      .eq('employee_id', employeeId)
      .order('day_of_week');

    if (error) {
      throw new AppError('Failed to fetch working hours', 500);
    }

    return data;
  }
}