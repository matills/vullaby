import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../models';

/**
 * Customer service for managing customers
 */
export const customerService = {
  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    try {
      // Check if customer already exists with this phone
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

  /**
   * Get customer by ID
   */
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

  /**
   * Get customer by phone number
   */
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

  /**
   * Get or create customer by phone
   */
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

  /**
   * Update customer
   */
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

  /**
   * Delete customer
   */
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

  /**
   * Search customers
   */
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

  /**
   * Get customer appointment history
   */
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
