import { Request, Response } from 'express';
import { availabilityService } from '../services';
import { CreateAvailabilitySchema, UpdateAvailabilitySchema, GetAvailableSlotsSchema } from '../models';
import { logger } from '../config/logger';

/**
 * Availability controller
 */
export const availabilityController = {
  /**
   * Create availability rule
   * POST /api/availability
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CreateAvailabilitySchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const availability = await availabilityService.createAvailability(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        data: availability,
      });
    } catch (error) {
      logger.error('Error creating availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create availability',
      });
    }
  },

  /**
   * Get availability by employee ID
   * GET /api/availability/employee/:employeeId
   */
  async getByEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;

      const availability = await availabilityService.getAvailabilityByEmployee(
        employeeId
      );

      res.json({
        success: true,
        data: availability,
        count: availability.length,
      });
    } catch (error) {
      logger.error('Error getting availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get availability',
      });
    }
  },

  /**
   * Update availability
   * PATCH /api/availability/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = UpdateAvailabilitySchema.safeParse(
        req.body
      );

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const availability = await availabilityService.updateAvailability(
        id,
        validationResult.data
      );

      res.json({
        success: true,
        data: availability,
      });
    } catch (error) {
      logger.error('Error updating availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update availability',
      });
    }
  },

  /**
   * Delete availability
   * DELETE /api/availability/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await availabilityService.deleteAvailability(id);

      res.json({
        success: true,
        message: 'Availability deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete availability',
      });
    }
  },

  /**
   * Get available time slots
   * GET /api/availability/slots
   */
  async getSlots(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = GetAvailableSlotsSchema.safeParse({
        business_id: req.query.business_id,
        employee_id: req.query.employee_id,
        date: req.query.date,
        duration: req.query.duration ? parseInt(req.query.duration as string) : 60,
      });

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        });
        return;
      }

      const slots = await availabilityService.getAvailableSlots(
        validationResult.data
      );

      const availableSlots = slots.filter((slot) => slot.available);

      res.json({
        success: true,
        data: {
          slots: availableSlots,
          total: slots.length,
          available: availableSlots.length,
        },
      });
    } catch (error) {
      logger.error('Error getting available slots:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get available slots',
      });
    }
  },

  /**
   * Check if employee is available
   * POST /api/availability/check
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
    try {
      const { employee_id, start_time, end_time } = req.body;

      if (!employee_id || !start_time || !end_time) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: employee_id, start_time, end_time',
        });
        return;
      }

      const isAvailable = await availabilityService.isEmployeeAvailable(
        employee_id,
        start_time,
        end_time
      );

      res.json({
        success: true,
        data: {
          available: isAvailable,
          employee_id,
          start_time,
          end_time,
        },
      });
    } catch (error) {
      logger.error('Error checking availability:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check availability',
      });
    }
  },

  /**
   * Get next available slot for employee
   * GET /api/availability/next-available
   */
  async getNextAvailable(req: Request, res: Response): Promise<void> {
    try {
      const { employee_id, business_id, duration, days_ahead } = req.query;

      if (!employee_id || !business_id) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: employee_id, business_id',
        });
        return;
      }

      const nextSlot = await availabilityService.getNextAvailableSlot(
        employee_id as string,
        business_id as string,
        duration ? parseInt(duration as string) : 60,
        days_ahead ? parseInt(days_ahead as string) : 30
      );

      if (!nextSlot) {
        res.json({
          success: true,
          data: null,
          message: 'No available slots found',
        });
        return;
      }

      res.json({
        success: true,
        data: nextSlot,
      });
    } catch (error) {
      logger.error('Error getting next available slot:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get next available slot',
      });
    }
  },

  /**
   * Get availability summary for all employees
   * GET /api/availability/summary
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const { business_id, date, duration } = req.query;

      if (!business_id || !date) {
        res.status(400).json({
          success: false,
          error: 'Missing required parameters: business_id, date',
        });
        return;
      }

      const summary = await availabilityService.getAvailabilitySummary(
        business_id as string,
        date as string,
        duration ? parseInt(duration as string) : 60
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Error getting availability summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get availability summary',
      });
    }
  },
};
