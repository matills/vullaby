import { supabase } from '../config/database';
import { AppError, NotFoundError, ConflictError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

interface CreateCustomerData {
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

type UpdateCustomerData = Partial<Omit<CreateCustomerData, 'businessId'>>;

const APPOINTMENTS_SELECT_QUERY = `
  *,
  employee:employees(*),
  service:services(*)
`;

export class CustomerService {
  private async checkDuplicatePhone(businessId: string, phone: string): Promise<void> {
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    if (existing) {
      throw new ConflictError('Customer with this phone already exists');
    }
  }

  async createCustomer(data: CreateCustomerData) {
    try {
      await this.checkDuplicatePhone(data.businessId, data.phone);

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
        logger.error('Failed to create customer:', error);
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
      .eq('business_id', businessId)
      .order('name');

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Failed to fetch customers:', error);
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
      throw new NotFoundError('Customer');
    }

    return data;
  }

  async getCustomerByPhone(phone: string, businessId: string) {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    return data || null;
  }

  async updateCustomer(id: string, businessId: string, updates: UpdateCustomerData) {
    const updateData: Record<string, any> = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.phone) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Failed to update customer:', error);
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
      logger.error('Failed to delete customer:', error);
      throw new AppError('Failed to delete customer', 500);
    }

    logger.info(`Customer deleted: ${id}`);
    return { success: true };
  }

  async getCustomerAppointments(customerId: string, businessId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select(APPOINTMENTS_SELECT_QUERY)
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .order('start_time', { ascending: false });

    if (error) {
      logger.error('Failed to fetch customer appointments:', error);
      throw new AppError('Failed to fetch customer appointments', 500);
    }

    return data;
  }
}