import { supabase } from '../config/database';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

interface CreateServiceData {
  businessId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}

export class ServiceService {
  async createService(data: CreateServiceData) {
    try {
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

      if (error || !service) {
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
      .order('name');

    if (error) {
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
      throw new AppError('Service not found', 404);
    }

    return data;
  }

  async updateService(
    id: string,
    businessId: string,
    updates: Partial<CreateServiceData>
  ) {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes;
    if (updates.price) updateData.price = updates.price;

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error || !data) {
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
      throw new AppError('Failed to delete service', 500);
    }

    logger.info(`Service deleted: ${id}`);
    return data;
  }
}