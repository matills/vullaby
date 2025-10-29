import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { EmployeeService } from '../services/employee.service';
import { z } from 'zod';

const employeeService = new EmployeeService();

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255),
    email: z.string().email(),
    phone: z.string().min(10).max(20).optional(),
    role: z.enum(['admin', 'employee']),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).max(20).optional(),
    role: z.enum(['admin', 'employee']).optional(),
  }),
});

export const setWorkingHoursSchema = z.object({
  body: z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isAvailable: z.boolean(),
  }),
});

export class EmployeeController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.createEmployee({
        businessId: req.user!.businessId,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        role: req.body.role,
      });

      res.status(201).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employees = await employeeService.getEmployeesByBusiness(
        req.user!.businessId
      );

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.getEmployeeById(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const employee = await employeeService.updateEmployee(
        req.params.id,
        req.user!.businessId,
        req.body
      );

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;
      const employee = await employeeService.toggleEmployeeStatus(
        req.params.id,
        req.user!.businessId,
        isActive
      );

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await employeeService.deleteEmployee(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async setWorkingHours(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workingHours = await employeeService.setWorkingHours({
        employeeId: req.params.id,
        dayOfWeek: req.body.dayOfWeek,
        startTime: req.body.startTime,
        endTime: req.body.endTime,
        isAvailable: req.body.isAvailable,
      });

      res.json({
        success: true,
        data: workingHours,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkingHours(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const workingHours = await employeeService.getWorkingHours(
        req.params.id
      );

      res.json({
        success: true,
        data: workingHours,
      });
    } catch (error) {
      next(error);
    }
  }
}