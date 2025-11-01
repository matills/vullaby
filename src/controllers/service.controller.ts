import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { ServiceService } from '../services/service.service';
import { z } from 'zod';

const serviceService = new ServiceService();

export const createServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255),
    description: z.string().optional(),
    durationMinutes: z.number().min(5).max(480),
    price: z.number().min(0),
  }),
});

export const updateServiceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    description: z.string().optional(),
    durationMinutes: z.number().min(5).max(480).optional(),
    price: z.number().min(0).optional(),
  }),
});

export class ServiceController {
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.createService({
        businessId: req.user!.businessId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const services = await serviceService.getServicesByBusiness(
        req.user!.businessId
      );

      res.json({
        success: true,
        data: services,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.getServiceById(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.updateService(
        req.params.id,
        req.user!.businessId,
        req.body
      );

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await serviceService.deleteService(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      next(error);
    }
  }
}