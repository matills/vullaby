import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
  QueryBusinessesInput,
} from '../models';
import { BaseService } from '../core/base.service';
import { NotFoundError, ConflictError } from '../core/errors';

/**
 * BusinessService extending BaseService
 * Reduces ~150 lines of boilerplate while maintaining custom functionality
 */
class BusinessService extends BaseService<Business> {
  protected tableName = 'businesses';
  protected entityName = 'Business';

  constructor() {
    super(supabase);
  }

  /**
   * Override create to ensure unique phone number
   */
  async create(data: CreateBusinessInput): Promise<Business> {
    try {
      const existing = await this.getBusinessByPhone(data.phone);

      if (existing) {
        logger.warn(`Business already exists with phone ${data.phone}`);
        throw new ConflictError('Business with this phone number already exists');
      }

      return await super.create(data);
    } catch (error) {
      logger.error('Error in createBusiness:', error);
      throw error;
    }
  }

  /**
   * Override update to validate phone uniqueness
   */
  async update(id: string, data: UpdateBusinessInput): Promise<Business> {
    try {
      // Check if business exists
      const existing = await this.getById(id);
      if (!existing) {
        throw new NotFoundError(this.entityName);
      }

      // If phone is being updated, check for conflicts
      if (data.phone && data.phone !== existing.phone) {
        const phoneExists = await this.getBusinessByPhone(data.phone);
        if (phoneExists) {
          throw new ConflictError('Business with this phone number already exists');
        }
      }

      return await super.update(id, data);
    } catch (error) {
      logger.error('Error in updateBusiness:', error);
      throw error;
    }
  }

  /**
   * Override getAll to support custom filtering
   */
  async getAll(filters?: QueryBusinessesInput): Promise<Business[]> {
    try {
      let query = this.supabase.from(this.tableName).select('*');

      if (filters?.industry) {
        query = query.eq('industry', filters.industry);
      }

      if (filters?.plan) {
        query = query.eq('plan', filters.plan);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error(`Error getting all ${this.entityName}es:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error(`Error in getAll${this.entityName}es:`, error);
      throw error;
    }
  }

  /**
   * Override search to include industry
   */
  async search(query: string, limit: number = 10): Promise<Business[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,industry.ilike.%${query}%`)
        .limit(limit)
        .order('name', { ascending: true });

      if (error) {
        logger.error(`Error searching ${this.entityName}es:`, error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error(`Error in search${this.entityName}es:`, error);
      throw error;
    }
  }

  /**
   * Custom method: Get business by phone number
   */
  async getBusinessByPhone(phone: string): Promise<Business | null> {
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
      logger.error('Error in getBusinessByPhone:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get business by WhatsApp phone number
   * Used for routing incoming WhatsApp messages to the correct business
   */
  async getBusinessByWhatsAppPhone(whatsappPhone: string): Promise<Business | null> {
    try {
      // Remove whatsapp: prefix if present
      const cleanPhone = whatsappPhone.replace('whatsapp:', '');

      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('whatsapp_phone_number', cleanPhone)
        .eq('whatsapp_enabled', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getBusinessByWhatsAppPhone:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get all employees for a business
   */
  async getBusinessEmployees(businessId: string) {
    try {
      const { data, error } = await this.supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Error getting business employees:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getBusinessEmployees:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get all appointments for a business
   */
  async getBusinessAppointments(
    businessId: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      let query = this.supabase
        .from('appointments')
        .select('*, employees(name), customers(name, phone)')
        .eq('business_id', businessId);

      if (startDate) {
        query = query.gte('start_time', startDate);
      }

      if (endDate) {
        query = query.lte('start_time', endDate);
      }

      query = query.order('start_time', { ascending: true });

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting business appointments:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getBusinessAppointments:', error);
      throw error;
    }
  }

  /**
   * Custom method: Get business statistics
   */
  async getBusinessStats(businessId: string) {
    try {
      const [employees, appointments] = await Promise.all([
        this.getBusinessEmployees(businessId),
        this.getBusinessAppointments(businessId),
      ]);

      const activeEmployees = employees.filter((emp: any) => emp.is_active);
      const pendingAppointments = appointments.filter(
        (app: any) => app.status === 'pending'
      );
      const confirmedAppointments = appointments.filter(
        (app: any) => app.status === 'confirmed'
      );
      const completedAppointments = appointments.filter(
        (app: any) => app.status === 'completed'
      );

      return {
        totalEmployees: employees.length,
        activeEmployees: activeEmployees.length,
        totalAppointments: appointments.length,
        pendingAppointments: pendingAppointments.length,
        confirmedAppointments: confirmedAppointments.length,
        completedAppointments: completedAppointments.length,
      };
    } catch (error) {
      logger.error('Error in getBusinessStats:', error);
      throw error;
    }
  }

  // Alias methods for backward compatibility
  createBusiness = this.create;
  getBusinessById = this.getById;
  getAllBusinesses = this.getAll;
  updateBusiness = this.update;
  deleteBusiness = this.delete;
  searchBusinesses = this.search;
}

// Export class and singleton instance
export { BusinessService };
export const businessService = new BusinessService();
