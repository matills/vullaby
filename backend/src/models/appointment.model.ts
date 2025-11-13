import { z } from 'zod';

export const AppointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show'
]);

export const AppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  status: AppointmentStatusSchema.default('pending'),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const CreateAppointmentSchema = z.object({
  business_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  notes: z.string().optional(),
}).refine(
  (data) => new Date(data.start_time) < new Date(data.end_time),
  {
    message: 'start_time must be before end_time',
    path: ['start_time'],
  }
);

export const UpdateAppointmentSchema = z.object({
  employee_id: z.string().uuid().optional(),
  start_time: z.string().datetime().optional(),
  end_time: z.string().datetime().optional(),
  status: AppointmentStatusSchema.optional(),
  notes: z.string().optional(),
});

export const QueryAppointmentsSchema = z.object({
  business_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status: AppointmentStatusSchema.optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;
export type Appointment = z.infer<typeof AppointmentSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type QueryAppointmentsInput = z.infer<typeof QueryAppointmentsSchema>;
