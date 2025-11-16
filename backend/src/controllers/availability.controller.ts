import { Request, Response } from 'express';
import { availabilityService } from '../services/availability.service';
import {
  CreateAvailabilitySchema,
  UpdateAvailabilitySchema,
  Availability,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
} from '../models';
import { logger } from '../config/logger';
import { BaseController } from '../core/base.controller';

/**
 * AvailabilityController extending BaseController
 * Reduces ~160+ lines of boilerplate while maintaining custom endpoints
 */
class AvailabilityController extends BaseController<Availability, CreateAvailabilityInput, UpdateAvailabilityInput> {
  protected entityName = 'Availability';
  protected service = availabilityService;
  protected createSchema = CreateAvailabilitySchema;
  protected updateSchema = UpdateAvailabilitySchema;

  /**
   * Custom endpoint: Get availability by employee
   */
  async getByEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const availabilities = await availabilityService.getAvailabilityByEmployee(employeeId);

      res.status(200).json({
        success: true,
        data: availabilities,
        count: availabilities.length
      });
    } catch (error) {
      logger.error('Error getting availability by employee:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get availability',
      });
    }
  }

  /**
   * Custom endpoint: Get available time slots
   */
  async getSlots(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { date, duration } = req.query;

      if (!date) {
        res.status(400).json({
          success: false,
          error: 'date is required',
        });
        return;
      }

      const slots = await availabilityService.getAvailableSlots(
        employeeId,
        new Date(date as string),
        duration ? parseInt(duration as string) : 60
      );

      res.status(200).json({
        success: true,
        data: slots,
        count: slots.length
      });
    } catch (error) {
      logger.error('Error getting available slots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available slots',
      });
    }
  }

  /**
   * Custom endpoint: Check if employee is available
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { start_time, end_time } = req.query;

      if (!start_time || !end_time) {
        res.status(400).json({
          success: false,
          error: 'start_time and end_time are required',
        });
        return;
      }

      const available = await availabilityService.isEmployeeAvailable(
        employeeId,
        new Date(start_time as string),
        new Date(end_time as string)
      );

      res.status(200).json({
        success: true,
        data: { available }
      });
    } catch (error) {
      logger.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability',
      });
    }
  }

  /**
   * Custom endpoint: Get next available slot
   */
  async getNextAvailable(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { from_date, duration, max_days } = req.query;

      const nextSlot = await availabilityService.getNextAvailableSlot(
        employeeId,
        from_date ? new Date(from_date as string) : new Date(),
        duration ? parseInt(duration as string) : 60,
        max_days ? parseInt(max_days as string) : 14
      );

      if (!nextSlot) {
        res.status(404).json({
          success: false,
          error: 'No available slots found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: nextSlot
      });
    } catch (error) {
      logger.error('Error getting next available slot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get next available slot',
      });
    }
  }

  /**
   * Custom endpoint: Get availability summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const summary = await availabilityService.getAvailabilitySummary(employeeId);

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting availability summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get availability summary',
      });
    }
  }
}

// Export singleton instance configured as object for backward compatibility
const controller = new AvailabilityController();
export const availabilityController = {
  create: controller.create.bind(controller),
  getByEmployee: controller.getByEmployee.bind(controller),
  update: controller.update.bind(controller),
  delete: controller.delete.bind(controller),
  getSlots: controller.getSlots.bind(controller),
  checkAvailability: controller.checkAvailability.bind(controller),
  getNextAvailable: controller.getNextAvailable.bind(controller),
  getSummary: controller.getSummary.bind(controller),
};
