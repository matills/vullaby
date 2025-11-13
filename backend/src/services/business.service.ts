import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
  QueryBusinessesInput,
} from '../models';

export const businessService = {
  async createBusiness(data: CreateBusinessInput): Promise<Business> {
    try {
      const existing = await this.getBusinessByPhone(data.phone);

      if (existing) {
        logger.warn(`Business already exists with phone ${data.phone}`);
        throw new Error('Business with this phone number already exists');
      }

      const { data: business, error } = await supabase
        .from('businesses')
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error('Error creating business:', error);
        throw error;
      }

      logger.info(`Business created: ${business.name} (ID: ${business.id}, Phone: ${business.phone})`);
      return business;
    } catch (error) {
      logger.error('Error in createBusiness:', error);
      throw error;
    }
  },

  async getBusinessById(id: string): Promise<Business | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
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
      logger.error('Error in getBusinessById:', error);
      throw error;
    }
  },

  async getBusinessByPhone(phone: string): Promise<Business | null> {
    try {
      const { data, error } = await supabase
        .from('businesses')
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
  },

  async getAllBusinesses(
    filters?: QueryBusinessesInput
  ): Promise<Business[]> {
    try {
      let query = supabase.from('businesses').select('*');

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
        logger.error('Error getting all businesses:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAllBusinesses:', error);
      throw error;
    }
  },

  async updateBusiness(
    id: string,
    data: UpdateBusinessInput
  ): Promise<Business> {
    try {
      const existing = await this.getBusinessById(id);
      if (!existing) {
        throw new Error('Business not found');
      }

      if (data.phone && data.phone !== existing.phone) {
        const phoneExists = await this.getBusinessByPhone(data.phone);
        if (phoneExists) {
          throw new Error('Business with this phone number already exists');
        }
      }

      const { data: business, error } = await supabase
        .from('businesses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating business:', error);
        throw error;
      }

      logger.info(`Business updated: ${business.name} (ID: ${id})`);
      return business;
    } catch (error) {
      logger.error('Error in updateBusiness:', error);
      throw error;
    }
  },

  async deleteBusiness(id: string): Promise<boolean> {
    try {
      const existing = await this.getBusinessById(id);
      if (!existing) {
        throw new Error('Business not found');
      }

      const { error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting business:', error);
        throw error;
      }

      logger.info(`Business deleted: ${existing.name} (ID: ${id})`);
      return true;
    } catch (error) {
      logger.error('Error in deleteBusiness:', error);
      throw error;
    }
  },

  async searchBusinesses(query: string, limit: number = 10): Promise<Business[]> {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%,industry.ilike.%${query}%`)
        .limit(limit)
        .order('name', { ascending: true });

      if (error) {
        logger.error('Error searching businesses:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in searchBusinesses:', error);
      throw error;
    }
  },

  async getBusinessEmployees(businessId: string) {
    try {
      const { data, error } = await supabase
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
  },

  async getBusinessAppointments(
    businessId: string,
    startDate?: string,
    endDate?: string
  ) {
    try {
      let query = supabase
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
  },

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
  },
};
