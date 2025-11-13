import { Request, Response } from 'express';
import { businessUserService } from '../services';
import {
  CreateBusinessUserSchema,
  UpdateBusinessUserSchema,
  QueryBusinessUsersSchema,
} from '../models';
import { logger } from '../config/logger';

export const businessUserController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CreateBusinessUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const businessUser = await businessUserService.createBusinessUser(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        data: businessUser,
      });
    } catch (error: any) {
      logger.error('Error creating business user:', error);

      if (error.message === 'Business not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      if (error.message === 'User already has access to this business') {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create business user',
      });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const businessUser = await businessUserService.getBusinessUserById(id);

      if (!businessUser) {
        res.status(404).json({
          success: false,
          error: 'Business user not found',
        });
        return;
      }

      res.json({
        success: true,
        data: businessUser,
      });
    } catch (error) {
      logger.error('Error getting business user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business user',
      });
    }
  },

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = QueryBusinessUsersSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        });
        return;
      }

      const businessUsers = await businessUserService.getAllBusinessUsers(
        validationResult.data
      );

      res.json({
        success: true,
        data: businessUsers,
        count: businessUsers.length,
      });
    } catch (error) {
      logger.error('Error getting business users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get business users',
      });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = UpdateBusinessUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const businessUser = await businessUserService.updateBusinessUser(
        id,
        validationResult.data
      );

      res.json({
        success: true,
        data: businessUser,
      });
    } catch (error: any) {
      logger.error('Error updating business user:', error);

      if (error.message === 'Business user not found') {
        res.status(404).json({
          success: false,
          error: 'Business user not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update business user',
      });
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await businessUserService.deleteBusinessUser(id);

      res.json({
        success: true,
        message: 'Business user deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting business user:', error);

      if (error.message === 'Business user not found') {
        res.status(404).json({
          success: false,
          error: 'Business user not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete business user',
      });
    }
  },

  async getUsersByBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;

      const users = await businessUserService.getUsersByBusiness(businessId);

      res.json({
        success: true,
        data: users,
        count: users.length,
      });
    } catch (error) {
      logger.error('Error getting users by business:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get users by business',
      });
    }
  },

  async getBusinessesByUser(req: Request, res: Response): Promise<void> {
    try {
      const { authId } = req.params;

      const businesses = await businessUserService.getBusinessesByUser(authId);

      res.json({
        success: true,
        data: businesses,
        count: businesses.length,
      });
    } catch (error) {
      logger.error('Error getting businesses by user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get businesses by user',
      });
    }
  },

  async removeUserFromBusiness(req: Request, res: Response): Promise<void> {
    try {
      const { authId, businessId } = req.params;

      await businessUserService.removeUserFromBusiness(authId, businessId);

      res.json({
        success: true,
        message: 'User removed from business successfully',
      });
    } catch (error: any) {
      logger.error('Error removing user from business:', error);

      if (error.message === 'User access not found') {
        res.status(404).json({
          success: false,
          error: 'User access not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to remove user from business',
      });
    }
  },

  async checkUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const { authId, businessId } = req.params;

      const hasAccess = await businessUserService.checkUserAccess(authId, businessId);

      res.json({
        success: true,
        data: { hasAccess },
      });
    } catch (error) {
      logger.error('Error checking user access:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check user access',
      });
    }
  },

  async getUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { authId, businessId } = req.params;

      const role = await businessUserService.getUserRole(authId, businessId);

      if (!role) {
        res.status(404).json({
          success: false,
          error: 'User access not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { role },
      });
    } catch (error) {
      logger.error('Error getting user role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user role',
      });
    }
  },
};
