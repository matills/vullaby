import { Request, Response } from 'express';
import { appointmentService } from '../services';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  QueryAppointmentsSchema,
} from '../models';
import { logger } from '../config/logger';

/**
 * Appointment controller
 */
export const appointmentController = {
  /**
   * Create new appointment
   * POST /api/appointments
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = CreateAppointmentSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const appointment = await appointmentService.createAppointment(
        validationResult.data
      );

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      logger.error('Error creating appointment:', error);

      if (error.message === 'Time slot is already booked') {
        res.status(409).json({
          success: false,
          error: 'Time slot is already booked',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create appointment',
      });
    }
  },

  /**
   * Get appointment by ID
   * GET /api/appointments/:id
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.getAppointmentById(id);

      if (!appointment) {
        res.status(404).json({
          success: false,
          error: 'Appointment not found',
        });
        return;
      }

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      logger.error('Error getting appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get appointment',
      });
    }
  },

  /**
   * Query appointments with filters
   * GET /api/appointments
   */
  async query(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = QueryAppointmentsSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validationResult.error.issues,
        });
        return;
      }

      const appointments = await appointmentService.queryAppointments(
        validationResult.data
      );

      res.json({
        success: true,
        data: appointments,
        count: appointments.length,
      });
    } catch (error) {
      logger.error('Error querying appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query appointments',
      });
    }
  },

  /**
   * Update appointment
   * PATCH /api/appointments/:id
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const validationResult = UpdateAppointmentSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        });
        return;
      }

      const appointment = await appointmentService.updateAppointment(
        id,
        validationResult.data
      );

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error: any) {
      logger.error('Error updating appointment:', error);

      if (error.message === 'Appointment not found') {
        res.status(404).json({
          success: false,
          error: 'Appointment not found',
        });
        return;
      }

      if (error.message === 'Time slot is already booked') {
        res.status(409).json({
          success: false,
          error: 'Time slot is already booked',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update appointment',
      });
    }
  },

  /**
   * Cancel appointment
   * POST /api/appointments/:id/cancel
   */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.cancelAppointment(id);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment cancelled successfully',
      });
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel appointment',
      });
    }
  },

  /**
   * Confirm appointment
   * POST /api/appointments/:id/confirm
   */
  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.confirmAppointment(id);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment confirmed successfully',
      });
    } catch (error) {
      logger.error('Error confirming appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm appointment',
      });
    }
  },

  /**
   * Complete appointment
   * POST /api/appointments/:id/complete
   */
  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.completeAppointment(id);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment completed successfully',
      });
    } catch (error) {
      logger.error('Error completing appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete appointment',
      });
    }
  },

  /**
   * Mark as no-show
   * POST /api/appointments/:id/no-show
   */
  async markNoShow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const appointment = await appointmentService.markNoShow(id);

      res.json({
        success: true,
        data: appointment,
        message: 'Appointment marked as no-show',
      });
    } catch (error) {
      logger.error('Error marking no-show:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark as no-show',
      });
    }
  },

  /**
   * Delete appointment
   * DELETE /api/appointments/:id
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await appointmentService.deleteAppointment(id);

      res.json({
        success: true,
        message: 'Appointment deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete appointment',
      });
    }
  },

  /**
   * Get upcoming appointments
   * GET /api/appointments/upcoming
   */
  async getUpcoming(req: Request, res: Response): Promise<void> {
    try {
      const { business_id, limit } = req.query;

      const appointments = await appointmentService.getUpcomingAppointments(
        business_id as string,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: appointments,
        count: appointments.length,
      });
    } catch (error) {
      logger.error('Error getting upcoming appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upcoming appointments',
      });
    }
  },

  /**
   * Get appointment statistics
   * GET /api/appointments/stats
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { business_id, start_date, end_date } = req.query;

      if (!business_id) {
        res.status(400).json({
          success: false,
          error: 'business_id is required',
        });
        return;
      }

      const stats = await appointmentService.getStats(
        business_id as string,
        start_date as string,
        end_date as string
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
      });
    }
  },
};
