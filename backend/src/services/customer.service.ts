import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../models';
import { BaseService } from '../core/base.service';

/**
 * Customer service extending BaseService
 * Reduces ~100 lines of boilerplate code while maintaining custom functionality
 */
class CustomerService extends BaseService<Customer> {
  protected tableName = 'customers';
  protected entityName = 'Customer';

  constructor() {
    super(supabase);
  }

  /**
   * Override create to check for existing customer by phone
   */
  async create(data: CreateCustomerInput): Promise<Customer> {
    try {
      const existing = await this.getCustomerByPhone(data.phone);

      if (existing) {
        logger.info(`Customer already exists with phone ${data.phone}`);
        return existing;
      }

      // Call parent create method
      return await super.create(data);
    } catch (error) {
      logger.error('Error in createCustomer:', error);
      throw error;
    }
  }

  /**
   * Override search for specific customer search fields
   */
  async search(query: string, limit: number = 10): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
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
  }

  /**
   * Custom method: Get customer by phone number
   */
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
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
  }

  /**
   * Custom method: Get or create customer by phone
   */
  async getOrCreateCustomer(phone: string, name?: string): Promise<Customer> {
    try {
      const existing = await this.getCustomerByPhone(phone);

      if (existing) {
        return existing;
      }

      return await this.create({ phone, name });
    } catch (error) {
      logger.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get all customers for a specific business
   */
  async getCustomersByBusiness(businessId: string, limit?: number): Promise<any[]> {
    try {
      let query = this.supabase
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
  }

  /**
   * Custom method: Get customer appointment history
   */
  async getCustomerHistory(customerId: string) {
    try {
      const { data, error } = await this.supabase
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
  }

  // Alias methods for backward compatibility
  createCustomer = this.create;
  getCustomerById = this.getById;
  updateCustomer = this.update;
  deleteCustomer = this.delete;
  searchCustomers = this.search;
}

// Export class and singleton instance
export { CustomerService };
export const customerService = new CustomerService();
