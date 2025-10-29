import { supabase } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

interface CreateCustomerData {
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export class CustomerService {
  async createCustomer(data: CreateCustomerData) {
    try {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', data.businessId)
        .eq('phone', data.phone)
        .single();

      if (existing) {
        throw new AppError('Customer with this phone already exists', 409);
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          business_id: data.businessId,
          name: data.name,
          phone: data.phone,
          email: data.email,
          notes: data.notes,
        })
        .select()
        .single();

      if (error || !customer) {
        throw new AppError('Failed to create customer', 500);
      }

      logger.info(`Customer created: ${customer.id}`);
      return customer;
    } catch (error) {
      logger.error('Create customer error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create customer', 500);
    }
  }

  async getCustomersByBusiness(businessId: string, search?: string) {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new AppError('Failed to fetch customers', 500);
    }

    return data;
  }

  async getCustomerById(id: string, businessId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) {
      throw new AppError('Customer not found', 404);
    }

    return data;
  }

  async getCustomerByPhone(phone: string, businessId: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  async updateCustomer(
    id: string,
    businessId: string,
    updates: Partial<CreateCustomerData>
  ) {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      throw new AppError('Failed to update customer', 500);
    }

    logger.info(`Customer updated: ${id}`);
    return data;
  }

  async deleteCustomer(id: string, businessId: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('business_id', businessId);

    if (error) {
      throw new AppError('Failed to delete customer', 500);
    }

    logger.info(`Customer deleted: ${id}`);
    return { success: true };
  }

  async getCustomerAppointments(customerId: string, businessId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        employee:employees(*),
        service:services(*)
      `)
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .order('start_time', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch customer appointments', 500);
    }

    return data;
  }
}