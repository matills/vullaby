import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';
import { NotFoundError } from './errors';
import { requestContext } from './request-context';

/**
 * Generic interface for CRUD operations
 * Services can implement this to ensure consistent API
 */
export interface ICrudService<T> {
  create(data: Partial<T>): Promise<T>;
  getById(id: string): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  getAll(): Promise<T[]>;
}

/**
 * Base service class for Supabase CRUD operations
 * Eliminates code duplication across entity services
 * Automatically filters by businessId from request context when enableMultiTenancy is true
 *
 * @template T - The entity type
 */
export abstract class BaseService<T> implements ICrudService<T> {
  protected abstract tableName: string;
  protected abstract entityName: string;

  /**
   * Enable multi-tenancy filtering by businessId
   * Set to false for tables that don't have business_id column (e.g., businesses table)
   */
  protected enableMultiTenancy: boolean = true;

  constructor(protected supabase: SupabaseClient) {}

  /**
   * Get the current business ID from request context
   * Returns undefined if context is not available or multi-tenancy is disabled
   */
  protected getBusinessId(): string | undefined {
    if (!this.enableMultiTenancy) {
      return undefined;
    }

    return requestContext.getBusinessIdOrUndefined();
  }

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      // Add business_id if multi-tenancy is enabled and not already set
      const businessId = this.getBusinessId();
      const dataWithBusinessId = businessId && !('business_id' in data)
        ? { ...data, business_id: businessId }
        : data;

      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(dataWithBusinessId)
        .select()
        .single();

      if (error) {
        logger.error(`Error creating ${this.entityName}:`, error);
        throw error;
      }

      logger.info(`${this.entityName} created successfully: ${result.id}`);
      return result as T;
    } catch (error) {
      logger.error(`Error in create${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id);

      // Filter by businessId if multi-tenancy is enabled
      const businessId = this.getBusinessId();
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError(this.entityName);
        }
        logger.error(`Error getting ${this.entityName} by ID:`, error);
        throw error;
      }

      return data as T;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Error in get${this.entityName}ById:`, error);
      throw error;
    }
  }

  /**
   * Update an existing entity
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      // First check if entity exists
      await this.getById(id);

      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error(`Error updating ${this.entityName}:`, error);
        throw error;
      }

      logger.info(`${this.entityName} updated successfully: ${id}`);
      return result as T;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Error in update${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Delete an entity
   */
  async delete(id: string): Promise<void> {
    try {
      // First check if entity exists (this also validates business_id)
      await this.getById(id);

      let query = this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      // Filter by businessId if multi-tenancy is enabled (extra safety)
      const businessId = this.getBusinessId();
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { error } = await query;

      if (error) {
        logger.error(`Error deleting ${this.entityName}:`, error);
        throw error;
      }

      logger.info(`${this.entityName} deleted successfully: ${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error(`Error in delete${this.entityName}:`, error);
      throw error;
    }
  }

  /**
   * Get all entities (consider adding pagination in the future)
   */
  async getAll(): Promise<T[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*');

      // Filter by businessId if multi-tenancy is enabled
      const businessId = this.getBusinessId();
      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error(`Error getting all ${this.entityName}s:`, error);
        throw error;
      }

      return data as T[];
    } catch (error) {
      logger.error(`Error in getAll${this.entityName}s:`, error);
      throw error;
    }
  }

  /**
   * Generic search method (can be overridden in subclasses for specific search logic)
   */
  async search(_query: string, limit: number = 10): Promise<T[]> {
    try {
      // Default search implementation - override in subclass for specific search fields
      // Note: _query parameter is unused in base implementation but required for interface
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .limit(limit);

      if (error) {
        logger.error(`Error searching ${this.entityName}s:`, error);
        throw error;
      }

      return data as T[];
    } catch (error) {
      logger.error(`Error in search${this.entityName}s:`, error);
      throw error;
    }
  }
}
