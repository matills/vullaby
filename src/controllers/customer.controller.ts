import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { CustomerService } from '../services/customer.service';
import { z } from 'zod';

const customerService = new CustomerService();

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255),
    phone: z.string().min(10).max(20),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  }),
});

export const updateCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    phone: z.string().min(10).max(20).optional(),
    email: z.string().email().optional(),
    notes: z.string().optional(),
  }),
});

export class CustomerController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.createCustomer({
        businessId: req.user!.businessId,
        name: req.body.name,
        phone: req.body.phone,
        email: req.body.email,
        notes: req.body.notes,
      });

      res.status(201).json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const customers = await customerService.getCustomersByBusiness(
        req.user!.businessId,
        search
      );

      res.json({
        success: true,
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.getCustomerById(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = await customerService.updateCustomer(
        req.params.id,
        req.user!.businessId,
        req.body
      );

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await customerService.deleteCustomer(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAppointments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const appointments = await customerService.getCustomerAppointments(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }
}