import { Request, Response } from 'express';
import { businessService } from '../services';
import {
  CreateBusinessSchema,
  UpdateBusinessSchema,
  QueryBusinessesSchema,
} from '../models';
import { logger } from '../config/logger';

export const businessController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CreateBusinessSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const business = await businessService.createBusiness(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        data: business,
      });
    } catch (error: any) {
      logger.error('Error creating business:', error);

      if (error.message === 'Business with this phone number already exists') {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create business',
      });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const business = await businessService.getBusinessById(id);

      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      res.json({
        success: true,
        data: business,
      });
    } catch (error) {
      logger.error('Error getting business:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business',
      });
    }
  },

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = QueryBusinessesSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        });
        return;
      }

      const businesses = await businessService.getAllBusinesses(
        validationResult.data
      );

      res.json({
        success: true,
        data: businesses,
        count: businesses.length,
      });
    } catch (error) {
      logger.error('Error getting businesses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get businesses',
      });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = UpdateBusinessSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const business = await businessService.updateBusiness(
        id,
        validationResult.data
      );

      res.json({
        success: true,
        data: business,
      });
    } catch (error: any) {
      logger.error('Error updating business:', error);

      if (error.message === 'Business not found') {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      if (error.message === 'Business with this phone number already exists') {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update business',
      });
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await businessService.deleteBusiness(id);

      res.json({
        success: true,
        message: 'Business deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting business:', error);

      if (error.message === 'Business not found') {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete business',
      });
    }
  },

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query (q) is required',
        });
        return;
      }

      const businesses = await businessService.searchBusinesses(
        q,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: businesses,
        count: businesses.length,
      });
    } catch (error) {
      logger.error('Error searching businesses:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search businesses',
      });
    }
  },

  async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const business = await businessService.getBusinessById(id);
      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      const employees = await businessService.getBusinessEmployees(id);

      res.json({
        success: true,
        data: employees,
        count: employees.length,
      });
    } catch (error) {
      logger.error('Error getting business employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business employees',
      });
    }
  },

  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      const business = await businessService.getBusinessById(id);
      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      const appointments = await businessService.getBusinessAppointments(
        id,
        start_date as string,
        end_date as string
      );

      res.json({
        success: true,
        data: appointments,
        count: appointments.length,
      });
    } catch (error) {
      logger.error('Error getting business appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business appointments',
      });
    }
  },

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const business = await businessService.getBusinessById(id);
      if (!business) {
        res.status(404).json({
          success: false,
          error: 'Business not found',
        });
        return;
      }

      const stats = await businessService.getBusinessStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting business stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business statistics',
      });
    }
  },
};
