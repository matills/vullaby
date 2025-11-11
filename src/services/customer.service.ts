import { supabase } from '../config/database';
import { AppError, NotFoundError, ConflictError } from '../middlewares/error.middleware';
import logger from '../utils/logger';
import { DB_QUERIES } from '../constants';
import { Customer } from '../types';

/**
 * Interface for customer creation data
 */
interface CreateCustomerData {
  /**
   * UUID of the business
   */
  businessId: string;
  /**
   * Customer name
   */
  name: string;
  /**
   * Customer phone number
   */
  phone: string;
  /**
   * Customer email (optional)
   */
  email?: string;
  /**
   * Customer notes (optional)
   */
  notes?: string;
}

/**
 * Type for customer update data
 */
type UpdateCustomerData = Partial<Omit<CreateCustomerData, 'businessId'>>;

/**
 * Constant for appointments select query
 */
const APPOINTMENTS_SELECT_QUERY = DB_QUERIES.APPOINTMENTS_SELECT;

/**
 * Service class for managing customers
 * Handles customer CRUD operations and related queries
 */
export class CustomerService {
  /**
   * Checks if a customer with the given phone already exists
   * @param businessId - UUID of the business
   * @param phone - Phone number to check
   * @throws {ConflictError} If customer with phone already exists
   */
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

  /**
   * Creates a new customer
   * @param data - Customer creation data
   * @returns Created customer
   * @throws {ConflictError} If phone already exists
   * @throws {AppError} If creation fails
   */
  async createCustomer(data: CreateCustomerData): Promise<Customer> {
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

  /**
   * Retrieves all customers for a business with optional search
   * @param businessId - UUID of the business
   * @param search - Optional search term for name or phone
   * @returns Array of customers
   * @throws {AppError} If fetching fails
   */
  async getCustomersByBusiness(businessId: string, search?: string): Promise<Customer[]> {
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

  /**
   * Retrieves a customer by ID
   * @param id - UUID of the customer
   * @param businessId - UUID of the business
   * @returns Customer data
   * @throws {NotFoundError} If customer is not found
   */
  async getCustomerById(id: string, businessId: string): Promise<Customer> {
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

  /**
   * Retrieves a customer by phone number
   * @param phone - Phone number to search for
   * @param businessId - UUID of the business
   * @returns Customer data or null if not found
   */
  async getCustomerByPhone(phone: string, businessId: string): Promise<Customer | null> {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .single();

    return data || null;
  }

  /**
   * Updates a customer's information
   * @param id - UUID of the customer
   * @param businessId - UUID of the business
   * @param updates - Fields to update
   * @returns Updated customer
   * @throws {AppError} If no fields to update or update fails
   */
  async updateCustomer(id: string, businessId: string, updates: UpdateCustomerData): Promise<Customer> {
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

  /**
   * Deletes a customer
   * @param id - UUID of the customer
   * @param businessId - UUID of the business
   * @returns Success status
   * @throws {AppError} If deletion fails
   */
  async deleteCustomer(id: string, businessId: string): Promise<{ success: boolean }> {
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

  /**
   * Retrieves all appointments for a customer
   * @param customerId - UUID of the customer
   * @param businessId - UUID of the business
   * @returns Array of appointments
   * @throws {AppError} If fetching fails
   */
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