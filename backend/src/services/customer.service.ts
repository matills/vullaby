import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../models';

export const customerService = {
  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    try {
      const existing = await this.getCustomerByPhone(data.phone);

      if (existing) {
        logger.info(`Customer already exists with phone ${data.phone}`);
        return existing;
      }

      const { data: customer, error } = await supabase
        .from('customers')
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error('Error creating customer:', error);
        throw error;
      }

      logger.info('Customer created:', customer.id);
      return customer;
    } catch (error) {
      logger.error('Error in createCustomer:', error);
      throw error;
    }
  },

  async getCustomerById(id: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
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
      logger.error('Error in getCustomerById:', error);
      throw error;
    }
  },

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getCustomerByPhone:', error);
      throw error;
    }
  },

  async getOrCreateCustomer(phone: string, name?: string): Promise<Customer> {
    try {
      const existing = await this.getCustomerByPhone(phone);

      if (existing) {
        return existing;
      }

      return await this.createCustomer({ phone, name });
    } catch (error) {
      logger.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  },

  async updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer> {
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating customer:', error);
        throw error;
      }

      logger.info('Customer updated:', id);
      return customer;
    } catch (error) {
      logger.error('Error in updateCustomer:', error);
      throw error;
    }
  },

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting customer:', error);
        throw error;
      }

      logger.info('Customer deleted:', id);
      return true;
    } catch (error) {
      logger.error('Error in deleteCustomer:', error);
      throw error;
    }
  },

  async getCustomersByBusiness(businessId: string, limit?: number): Promise<any[]> {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          customer_id,
          customers (
            id,
            phone,
            name,
            email
          )
        `)
        .eq('business_id', businessId);

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting customers by business:', error);
        throw error;
      }

      // Get unique customers with appointment count
      const customerMap = new Map();
      data?.forEach((appointment: any) => {
        if (appointment.customers) {
          const customerId = appointment.customers.id;
          if (customerMap.has(customerId)) {
            customerMap.get(customerId).appointmentCount += 1;
          } else {
            customerMap.set(customerId, {
              ...appointment.customers,
              appointmentCount: 1,
            });
          }
        }
      });

      return Array.from(customerMap.values());
    } catch (error) {
      logger.error('Error in getCustomersByBusiness:', error);
      throw error;
    }
  },

  async searchCustomers(query: string, limit: number = 10): Promise<Customer[]> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(limit);

      if (error) {
        logger.error('Error searching customers:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in searchCustomers:', error);
      throw error;
    }
  },

  async getCustomerHistory(customerId: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*, employees(name), businesses(name)')
        .eq('customer_id', customerId)
        .order('start_time', { ascending: false });

      if (error) {
        logger.error('Error getting customer history:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getCustomerHistory:', error);
      throw error;
    }
  },
};
