import { Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { logger } from '../config/logger';

/**
 * Base controller class that provides generic CRUD operations
 * Eliminates code duplication across all entity controllers
 *
 * @template T - The entity type
 * @template CreateDTO - The DTO for creating entities
 * @template UpdateDTO - The DTO for updating entities
 */
export abstract class BaseController<T, CreateDTO, UpdateDTO> {
  protected abstract entityName: string;
  protected abstract service: any; // TODO: Type this with BaseService<T> interface
  protected abstract createSchema: ZodSchema<CreateDTO>;
  protected abstract updateSchema: ZodSchema<UpdateDTO>;

  /**
   * Generic create handler
   * Validates request body and delegates to service
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = this.createSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const result = await this.service.create(validationResult.data);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Error creating ${this.entityName}:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to create ${this.entityName}`,
      });
    }
  }

  /**
   * Generic get by ID handler
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.getById(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: `${this.entityName} not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Error getting ${this.entityName} by ID:`, error);

      if (error instanceof Error && error.message === `${this.entityName} not found`) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: `Failed to get ${this.entityName}`,
      });
    }
  }

  /**
   * Generic update handler
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validationResult = this.updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
        return;
      }

      const result = await this.service.update(id, validationResult.data);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Error updating ${this.entityName}:`, error);

      if (error instanceof Error && error.message === `${this.entityName} not found`) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: `Failed to update ${this.entityName}`,
      });
    }
  }

  /**
   * Generic delete handler
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.service.delete(id);

      res.status(200).json({
        success: true,
        message: `${this.entityName} deleted successfully`,
      });
    } catch (error) {
      logger.error(`Error deleting ${this.entityName}:`, error);

      if (error instanceof Error && error.message === `${this.entityName} not found`) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: `Failed to delete ${this.entityName}`,
      });
    }
  }

  /**
   * Generic get all handler
   */
  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.service.getAll();

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Error getting all ${this.entityName}s:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to get ${this.entityName}s`,
      });
    }
  }

  /**
   * Generic search handler (optional - override in subclass if needed)
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, limit } = req.query;

      if (!this.service.search) {
        res.status(501).json({
          success: false,
          error: 'Search not implemented for this resource',
        });
        return;
      }

      const result = await this.service.search(
        query as string,
        limit ? parseInt(limit as string, 10) : 10
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error(`Error searching ${this.entityName}s:`, error);
      res.status(500).json({
        success: false,
        error: `Failed to search ${this.entityName}s`,
      });
    }
  }
}
