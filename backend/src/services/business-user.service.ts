import { supabase } from '../config/supabase';
import { logger } from '../config/logger';
import {
  BusinessUser,
  CreateBusinessUserInput,
  UpdateBusinessUserInput,
  QueryBusinessUsersInput,
} from '../models';

export const businessUserService = {
  async createBusinessUser(data: CreateBusinessUserInput): Promise<BusinessUser> {
    try {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', data.business_id)
        .single();

      if (businessError || !business) {
        throw new Error('Business not found');
      }

      const existing = await this.getBusinessUserByAuthAndBusiness(
        data.auth_id,
        data.business_id
      );

      if (existing) {
        throw new Error('User already has access to this business');
      }

      const { data: businessUser, error } = await supabase
        .from('business_users')
        .insert(data)
        .select()
        .single();

      if (error) {
        logger.error('Error creating business user:', error);
        throw error;
      }

      logger.info(`Business user created: ${businessUser.id} (Business: ${businessUser.business_id}, Auth: ${businessUser.auth_id}, Role: ${businessUser.role})`);
      return businessUser;
    } catch (error) {
      logger.error('Error in createBusinessUser:', error);
      throw error;
    }
  },

  async getBusinessUserById(id: string): Promise<BusinessUser | null> {
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select('*, businesses(name)')
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
      logger.error('Error in getBusinessUserById:', error);
      throw error;
    }
  },

  async getBusinessUserByAuthAndBusiness(
    authId: string,
    businessId: string
  ): Promise<BusinessUser | null> {
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select('*')
        .eq('auth_id', authId)
        .eq('business_id', businessId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Error in getBusinessUserByAuthAndBusiness:', error);
      throw error;
    }
  },

  async getAllBusinessUsers(filters?: QueryBusinessUsersInput): Promise<BusinessUser[]> {
    try {
      let query = supabase
        .from('business_users')
        .select('*, businesses(name)');

      if (filters?.business_id) {
        query = query.eq('business_id', filters.business_id);
      }

      if (filters?.auth_id) {
        query = query.eq('auth_id', filters.auth_id);
      }

      if (filters?.role) {
        query = query.eq('role', filters.role);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(
          filters.offset,
          filters.offset + (filters.limit || 10) - 1
        );
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        logger.error('Error getting all business users:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getAllBusinessUsers:', error);
      throw error;
    }
  },

  async getUsersByBusiness(businessId: string): Promise<BusinessUser[]> {
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select('*')
        .eq('business_id', businessId)
        .order('role', { ascending: true });

      if (error) {
        logger.error('Error getting users by business:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getUsersByBusiness:', error);
      throw error;
    }
  },

  async getBusinessesByUser(authId: string): Promise<BusinessUser[]> {
    try {
      const { data, error } = await supabase
        .from('business_users')
        .select('*, businesses(*)')
        .eq('auth_id', authId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error getting businesses by user:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Error in getBusinessesByUser:', error);
      throw error;
    }
  },

  async updateBusinessUser(
    id: string,
    data: UpdateBusinessUserInput
  ): Promise<BusinessUser> {
    try {
      const existing = await this.getBusinessUserById(id);
      if (!existing) {
        throw new Error('Business user not found');
      }

      const { data: businessUser, error } = await supabase
        .from('business_users')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating business user:', error);
        throw error;
      }

      logger.info(`Business user updated: ${businessUser.id} (Role: ${businessUser.role})`);
      return businessUser;
    } catch (error) {
      logger.error('Error in updateBusinessUser:', error);
      throw error;
    }
  },

  async deleteBusinessUser(id: string): Promise<boolean> {
    try {
      const existing = await this.getBusinessUserById(id);
      if (!existing) {
        throw new Error('Business user not found');
      }

      const { error } = await supabase
        .from('business_users')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting business user:', error);
        throw error;
      }

      logger.info(`Business user deleted: ${id}`);
      return true;
    } catch (error) {
      logger.error('Error in deleteBusinessUser:', error);
      throw error;
    }
  },

  async removeUserFromBusiness(authId: string, businessId: string): Promise<boolean> {
    try {
      const existing = await this.getBusinessUserByAuthAndBusiness(authId, businessId);
      if (!existing) {
        throw new Error('User access not found');
      }

      const { error } = await supabase
        .from('business_users')
        .delete()
        .eq('auth_id', authId)
        .eq('business_id', businessId);

      if (error) {
        logger.error('Error removing user from business:', error);
        throw error;
      }

      logger.info(`User ${authId} removed from business ${businessId}`);
      return true;
    } catch (error) {
      logger.error('Error in removeUserFromBusiness:', error);
      throw error;
    }
  },

  async checkUserAccess(authId: string, businessId: string): Promise<boolean> {
    try {
      const businessUser = await this.getBusinessUserByAuthAndBusiness(authId, businessId);
      return !!businessUser;
    } catch (error) {
      logger.error('Error in checkUserAccess:', error);
      return false;
    }
  },

  async getUserRole(authId: string, businessId: string): Promise<string | null> {
    try {
      const businessUser = await this.getBusinessUserByAuthAndBusiness(authId, businessId);
      return businessUser ? businessUser.role : null;
    } catch (error) {
      logger.error('Error in getUserRole:', error);
      return null;
    }
  },
};
