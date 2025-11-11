import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AppointmentService } from '../services/appointment.service';
import { z } from 'zod';
import {
  createAppointmentDto,
  getAvailabilityDto,
  updateAppointmentStatusDto,
} from '../dtos/appointment.dto';

const appointmentService = new AppointmentService();

export const createAppointmentSchema = z.object({
  body: createAppointmentDto,
});

export const getAvailabilitySchema = z.object({
  query: getAvailabilityDto,
});

export const updateStatusSchema = z.object({
  body: updateAppointmentStatusDto,
});

export class AppointmentController {
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.createAppointment({
        businessId: req.user!.businessId,
        ...req.body,
        serviceId: req.body.serviceId,
        startTime: new Date(req.body.startTime),
        notes: req.body.notes,
      });

      res.status(201).json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailability(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const slots = await appointmentService.getAvailableSlots({
        businessId: req.user!.businessId,
        employeeId: req.query.employeeId as string,
        date: new Date(req.query.date as string),
        serviceId: req.query.serviceId as string,
      });

      res.json({
        success: true,
        data: slots,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.getAppointmentById(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;

      const appointments = await appointmentService.getAppointmentsByBusiness(
        req.user!.businessId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: appointments,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.updateAppointmentStatus(
        req.params.id,
        req.user!.businessId,
        req.body.status
      );

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const appointment = await appointmentService.cancelAppointment(
        req.params.id,
        req.user!.businessId
      );

      res.json({
        success: true,
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }
}