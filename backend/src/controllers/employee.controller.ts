import { Request, Response } from 'express';
import { employeeService } from '../services/employee.service';
import {
  CreateEmployeeSchema,
  UpdateEmployeeSchema,
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../models';
import { logger } from '../config/logger';
import { BaseController } from '../core/base.controller';
import { NotFoundError } from '../core/errors';

/**
 * EmployeeController extending BaseController
 * Reduces ~200+ lines of boilerplate while maintaining custom endpoints
 */
class EmployeeController extends BaseController<Employee, CreateEmployeeInput, UpdateEmployeeInput> {
  protected entityName = 'Employee';
  protected service = employeeService;
  protected createSchema = CreateEmployeeSchema;
  protected updateSchema = UpdateEmployeeSchema;

  /**
   * Custom endpoint: Activate employee
   */
  async activate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await employeeService.activateEmployee(id);

      res.status(200).json({
        success: true,
        data: employee,
        message: 'Employee activated successfully'
      });
    } catch (error) {
      logger.error('Error activating employee:', error);

      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to activate employee',
      });
    }
  }

  /**
   * Custom endpoint: Deactivate employee
   */
  async deactivate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const employee = await employeeService.deactivateEmployee(id);

      res.status(200).json({
        success: true,
        data: employee,
        message: 'Employee deactivated successfully'
      });
    } catch (error) {
      logger.error('Error deactivating employee:', error);

      if (error instanceof NotFoundError) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to deactivate employee',
      });
    }
  }

  /**
   * Custom endpoint: Get employee availability
   */
  async getAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const availability = await employeeService.getEmployeeAvailability(id);

      res.status(200).json({
        success: true,
        data: availability,
        count: availability.length
      });
    } catch (error) {
      logger.error('Error getting employee availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee availability',
      });
    }
  }

  /**
   * Custom endpoint: Get employee appointments
   */
  async getAppointments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { start_date, end_date } = req.query;

      const appointments = await employeeService.getEmployeeAppointments(
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
      logger.error('Error getting employee appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee appointments',
      });
    }
  }

  /**
   * Custom endpoint: Get employee statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const stats = await employeeService.getEmployeeStats(id);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting employee stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get employee stats',
      });
    }
  }
}

// Export singleton instance configured as object for backward compatibility
const controller = new EmployeeController();
export const employeeController = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
  getAll: controller.getAll.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  search: controller.search.bind(controller),
  activate: controller.activate.bind(controller),
  deactivate: controller.deactivate.bind(controller),
  getAvailability: controller.getAvailability.bind(controller),
  getAppointments: controller.getAppointments.bind(controller),
  getStats: controller.getStats.bind(controller),
};
