import { z } from 'zod';
import { APPOINTMENT_STATUS } from '../constants';

export const createAppointmentDto = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  customerId: z.string().uuid('Invalid customer ID format'),
  serviceId: z.string().uuid('Invalid service ID format'),
  startTime: z.string().datetime('Invalid datetime format'),
  notes: z.string().optional(),
});

export const getAvailabilityDto = z.object({
  employeeId: z.string().uuid('Invalid employee ID format'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid date format',
  }),
  serviceId: z.string().uuid('Invalid service ID format'),
});

export const updateAppointmentStatusDto = z.object({
  status: z.enum([
    APPOINTMENT_STATUS.PENDING,
    APPOINTMENT_STATUS.CONFIRMED,
    APPOINTMENT_STATUS.COMPLETED,
    APPOINTMENT_STATUS.CANCELLED,
    APPOINTMENT_STATUS.NO_SHOW,
  ] as const),
});

export const getAppointmentsByDateRangeDto = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Type exports
export type CreateAppointmentDto = z.infer<typeof createAppointmentDto>;
export type GetAvailabilityDto = z.infer<typeof getAvailabilityDto>;
export type UpdateAppointmentStatusDto = z.infer<typeof updateAppointmentStatusDto>;
export type GetAppointmentsByDateRangeDto = z.infer<typeof getAppointmentsByDateRangeDto>;
