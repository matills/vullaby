import { Request, Response } from 'express';
import { customerService } from '../services';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
} from '../models';
import { logger } from '../config/logger';

export const customerController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CreateCustomerSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const customer = await customerService.createCustomer(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      logger.error('Error creating customer:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to create customer',
      });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const customer = await customerService.getCustomerById(id);

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
      logger.error('Error getting customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get customer',
      });
    }
  },

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
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = UpdateCustomerSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const customer = await customerService.updateCustomer(
        id,
        validationResult.data
      );

      res.json({
        success: true,
        data: customer,
      });
    } catch (error: any) {
      logger.error('Error updating customer:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to update customer',
      });
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await customerService.deleteCustomer(id);

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting customer:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to delete customer',
      });
    }
  },

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

      const customers = await customerService.searchCustomers(
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
  },

  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const customer = await customerService.getCustomerById(id);
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
  },
};
