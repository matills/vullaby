import { Request, Response } from 'express';
import { employeeService } from '../services';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  QueryEmployeesSchema,
} from '../models';
import { logger } from '../config/logger';

export const employeeController = {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CreateEmployeeSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const employee = await employeeService.createEmployee(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        data: employee,
      });
    } catch (error: any) {
      logger.error('Error creating employee:', error);

      if (error.message === 'Business not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create employee',
      });
    }
  },

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await employeeService.getEmployeeById(id);

      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      res.json({
        success: true,
        data: employee,
      });
    } catch (error) {
      logger.error('Error getting employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee',
      });
    }
  },

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = QueryEmployeesSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        });
        return;
      }

      const employees = await employeeService.getAllEmployees(
        validationResult.data
      );

      res.json({
        success: true,
        data: employees,
        count: employees.length,
      });
    } catch (error) {
      logger.error('Error getting employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employees',
      });
    }
  },

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = UpdateEmployeeSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const employee = await employeeService.updateEmployee(
        id,
        validationResult.data
      );

      res.json({
        success: true,
        data: employee,
      });
    } catch (error: any) {
      logger.error('Error updating employee:', error);

      if (error.message === 'Employee not found') {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update employee',
      });
    }
  },

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await employeeService.deleteEmployee(id);

      res.json({
        success: true,
        message: 'Employee deleted successfully',
      });
    } catch (error: any) {
      logger.error('Error deleting employee:', error);

      if (error.message === 'Employee not found') {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to delete employee',
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

      const employees = await employeeService.searchEmployees(
        q,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: employees,
        count: employees.length,
      });
    } catch (error) {
      logger.error('Error searching employees:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search employees',
      });
    }
  },

  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await employeeService.activateEmployee(id);

      res.json({
        success: true,
        data: employee,
        message: 'Employee activated successfully',
      });
    } catch (error: any) {
      logger.error('Error activating employee:', error);

      if (error.message === 'Employee not found') {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to activate employee',
      });
    }
  },

  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await employeeService.deactivateEmployee(id);

      res.json({
        success: true,
        data: employee,
        message: 'Employee deactivated successfully',
      });
    } catch (error: any) {
      logger.error('Error deactivating employee:', error);

      if (error.message === 'Employee not found') {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to deactivate employee',
      });
    }
  },

  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await employeeService.getEmployeeById(id);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      const availability = await employeeService.getEmployeeAvailability(id);

      res.json({
        success: true,
        data: availability,
        count: availability.length,
      });
    } catch (error) {
      logger.error('Error getting employee availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee availability',
      });
    }
  },

  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      const employee = await employeeService.getEmployeeById(id);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      const appointments = await employeeService.getEmployeeAppointments(
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
      logger.error('Error getting employee appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee appointments',
      });
    }
  },

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await employeeService.getEmployeeById(id);
      if (!employee) {
        res.status(404).json({
          success: false,
          error: 'Employee not found',
        });
        return;
      }

      const stats = await employeeService.getEmployeeStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting employee stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee statistics',
      });
    }
  },
};
