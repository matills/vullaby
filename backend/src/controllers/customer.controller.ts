import { Request, Response } from 'express';
import { customerService } from '../services/customer.service';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
} from '../models';
import { logger } from '../config/logger';
import { BaseController } from '../core/base.controller';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../models';

/**
 * Customer controller extending BaseController
 * Reduces ~150 lines of boilerplate code while maintaining custom endpoints
 */
class CustomerController extends BaseController<Customer, CreateCustomerInput, UpdateCustomerInput> {
  protected entityName = 'Customer';
  protected service = customerService;
  protected createSchema = CreateCustomerSchema;
  protected updateSchema = UpdateCustomerSchema;

  /**
   * Custom endpoint: Get customer by phone number
   */
  async getByPhone(req: Request, res: Response): Promise<void> {
    try {
      const { phone } = req.params;

      const customer = await customerService.getCustomerByPhone(phone);

      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
        return;
      }

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      logger.error('Error getting customer by phone:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get customer',
      });
    }
  }

  /**
   * Override search to support business filtering
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, business_id, limit } = req.query;

      // If no search query provided but business_id exists, return all customers for that business
      if (!q || typeof q !== 'string') {
        if (business_id && typeof business_id === 'string') {
          const customers = await customerService.getCustomersByBusiness(
            business_id,
            limit ? parseInt(limit as string) : undefined
          );
          res.json({
            success: true,
            data: customers,
            count: customers.length,
          });
          return;
        }

        res.status(400).json({
          success: false,
          error: 'Search query (q) or business_id is required',
        });
        return;
      }

      const customers = await customerService.search(
        q,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: customers,
        count: customers.length,
      });
    } catch (error) {
      logger.error('Error searching customers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search customers',
      });
    }
  }

  /**
   * Custom endpoint: Get customer appointment history
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const customer = await customerService.getById(id);
      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
        return;
      }

      const history = await customerService.getCustomerHistory(id);

      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error) {
      logger.error('Error getting customer history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get customer history',
      });
    }
  }
}

// Export singleton instance configured as object for backward compatibility
const controller = new CustomerController();
export const customerController = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
  getByPhone: controller.getByPhone.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  search: controller.search.bind(controller),
  getHistory: controller.getHistory.bind(controller),
};
