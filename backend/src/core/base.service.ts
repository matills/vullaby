import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../config/logger';
import { NotFoundError } from './errors';

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
 *
 * @template T - The entity type
 */
export abstract class BaseService<T> implements ICrudService<T> {
  protected abstract tableName: string;
  protected abstract entityName: string;

  constructor(protected supabase: SupabaseClient) {}

  /**
   * Create a new entity
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert(data)
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
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

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
      // First check if entity exists
      await this.getById(id);

      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

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
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false });

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
  async search(query: string, limit: number = 10): Promise<T[]> {
    try {
      // Default search implementation - override in subclass for specific search fields
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
