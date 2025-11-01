import { supabase } from '../config/database';
import { AppError, NotFoundError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

interface CreateServiceData {
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

type UpdateServiceData = Partial<Omit<CreateServiceData, 'businessId'>>;

export class ServiceService {
  async createService(data: CreateServiceData) {
    try {
      logger.info('Creating service:', { businessId: data.businessId, name: data.name });

      const { data: service, error } = await supabase
        .from('services')
        .insert({
          business_id: data.businessId,
          name: data.name,
          description: data.description,
          duration_minutes: data.durationMinutes,
          price: data.price,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error('Supabase error creating service:', error);
        throw new AppError(error.message || 'Failed to create service', 500);
      }

      if (!service) {
        throw new AppError('Failed to create service', 500);
      }

      logger.info(`Service created: ${service.id}`);
      return service;
    } catch (error) {
      logger.error('Create service error:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create service', 500);
    }
  }

  async getServicesByBusiness(businessId: string) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      logger.error('Error fetching services:', error);
      throw new AppError('Failed to fetch services', 500);
    }

    return data;
  }

  async getServiceById(id: string, businessId: string) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Service');
    }

    return data;
  }

  async updateService(id: string, businessId: string, updates: UpdateServiceData) {
    const updateData: Record<string, any> = {};
    
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes;
    if (updates.price !== undefined) updateData.price = updates.price;

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Error updating service:', error);
      throw new AppError('Failed to update service', 500);
    }

    logger.info(`Service updated: ${id}`);
    return data;
  }

  async deleteService(id: string, businessId: string) {
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
      logger.error('Error deleting service:', error);
      throw new AppError('Failed to delete service', 500);
    }

    logger.info(`Service deleted: ${id}`);
    return data;
  }
}