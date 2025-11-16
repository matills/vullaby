import { Request, Response } from 'express';
import { appointmentService } from '../services/appointment.service';
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../models';
import { logger } from '../config/logger';
import { BaseController } from '../core/base.controller';
import { ConflictError } from '../core/errors';

/**
 * AppointmentController extending BaseController
 * Reduces ~180+ lines of boilerplate while maintaining custom endpoints
 */
class AppointmentController extends BaseController<Appointment, CreateAppointmentInput, UpdateAppointmentInput> {
  protected entityName = 'Appointment';
  protected service = appointmentService;
  protected createSchema = CreateAppointmentSchema;
  protected updateSchema = UpdateAppointmentSchema;

  /**
   * Override create to handle conflict errors
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      await super.create(req, res);
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Override update to handle conflict errors
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      await super.update(req, res);
    } catch (error) {
      if (error instanceof ConflictError) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Custom endpoint: Query appointments with filters
   */
  async query(req: Request, res: Response): Promise<void> {
    try {
      const filters = req.query;
      const appointments = await appointmentService.queryAppointments(filters as any);

      res.status(200).json({
        success: true,
        data: appointments,
        count: appointments.length
      });
    } catch (error) {
      logger.error('Error querying appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query appointments',
      });
    }
  }

  /**
   * Custom endpoint: Cancel appointment
   */
  async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.cancelAppointment(id);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment cancelled successfully'
      });
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel appointment',
      });
    }
  }

  /**
   * Custom endpoint: Confirm appointment
   */
  async confirm(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.confirmAppointment(id);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment confirmed successfully'
      });
    } catch (error) {
      logger.error('Error confirming appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to confirm appointment',
      });
    }
  }

  /**
   * Custom endpoint: Complete appointment
   */
  async complete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.completeAppointment(id);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment completed successfully'
      });
    } catch (error) {
      logger.error('Error completing appointment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to complete appointment',
      });
    }
  }

  /**
   * Custom endpoint: Mark appointment as no-show
   */
  async markNoShow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const appointment = await appointmentService.markNoShow(id);

      res.status(200).json({
        success: true,
        data: appointment,
        message: 'Appointment marked as no-show'
      });
    } catch (error) {
      logger.error('Error marking appointment as no-show:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark appointment as no-show',
      });
    }
  }

  /**
   * Custom endpoint: Get upcoming appointments
   */
  async getUpcoming(req: Request, res: Response): Promise<void> {
    try {
      const { business_id, limit } = req.query;
      const appointments = await appointmentService.getUpcomingAppointments(
        business_id as string | undefined,
        limit ? parseInt(limit as string) : 10
      );

      res.status(200).json({
        success: true,
        data: appointments,
        count: appointments.length
      });
    } catch (error) {
      logger.error('Error getting upcoming appointments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upcoming appointments',
      });
    }
  }

  /**
   * Custom endpoint: Get appointment statistics
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
        start_date as string | undefined,
        end_date as string | undefined
      );

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting appointment stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get appointment stats',
      });
    }
  }
}

// Export singleton instance configured as object for backward compatibility
const controller = new AppointmentController();
export const appointmentController = {
  create: controller.create.bind(controller),
  getById: controller.getById.bind(controller),
  query: controller.query.bind(controller),
  update: controller.update.bind(controller),
  cancel: controller.cancel.bind(controller),
  confirm: controller.confirm.bind(controller),
  complete: controller.complete.bind(controller),
  markNoShow: controller.markNoShow.bind(controller),
  delete: controller.delete.bind(controller),
  getUpcoming: controller.getUpcoming.bind(controller),
  getStats: controller.getStats.bind(controller),
};
