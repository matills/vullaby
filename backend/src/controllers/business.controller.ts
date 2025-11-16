import { Request, Response } from 'express';
import { businessService } from '../services/business.service';
import {
  CreateBusinessSchema,
  UpdateBusinessSchema,
  Business,
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../models';
import { logger } from '../config/logger';
import { BaseController } from '../core/base.controller';
import { ConflictError } from '../core/errors';

/**
 * BusinessController extending BaseController
 * Reduces ~180+ lines of boilerplate while maintaining custom endpoints
 */
class BusinessController extends BaseController<Business, CreateBusinessInput, UpdateBusinessInput> {
  protected entityName = 'Business';
  protected service = businessService;
  protected createSchema = CreateBusinessSchema;
  protected updateSchema = UpdateBusinessSchema;

  /**
   * Override create to handle phone conflict errors
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      await super.create(req, res);
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Override update to handle phone conflict errors
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      await super.update(req, res);
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Custom endpoint: Get business employees
   */
  async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employees = await businessService.getBusinessEmployees(id);

      res.status(200).json({
        success: true,
        data: employees,
        count: employees.length
      });
    } catch (error) {
      logger.error('Error getting business employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business employees',
      });
    }
  }

  /**
   * Custom endpoint: Get business appointments
   */
  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      const appointments = await businessService.getBusinessAppointments(
        id,
        start_date as string | undefined,
        end_date as string | undefined
      );

      res.status(200).json({
        success: true,
        data: appointments,
        count: appointments.length
      });
    } catch (error) {
      logger.error('Error getting business appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business appointments',
      });
    }
  }

  /**
   * Custom endpoint: Get business statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await businessService.getBusinessStats(id);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting business stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business stats',
      });
    }
  }
}

// Export singleton instance configured as object for backward compatibility
const controller = new BusinessController();
export const businessController = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
  getAll: controller.getAll.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  search: controller.search.bind(controller),
  getEmployees: controller.getEmployees.bind(controller),
  getAppointments: controller.getAppointments.bind(controller),
  getStats: controller.getStats.bind(controller),
};
