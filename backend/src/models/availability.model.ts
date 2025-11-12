import { z } from 'zod';

/**
 * Time format validation (HH:MM)
 */
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Availability validation schema
 */
export const AvailabilitySchema = z.object({
  id: z.string().uuid().optional(),
  employee_id: z.string().uuid(),
  day_of_week: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  start_time: z.string().regex(timeRegex, 'Invalid time format (expected HH:MM)'),
  end_time: z.string().regex(timeRegex, 'Invalid time format (expected HH:MM)'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
}).refine(
  (data) => {
    const [startHour, startMin] = data.start_time.split(':').map(Number);
    const [endHour, endMin] = data.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return startMinutes < endMinutes;
  },
  {
    message: 'start_time must be before end_time',
    path: ['start_time'],
  }
);

/**
 * Create availability schema
 */
export const CreateAvailabilitySchema = z.object({
  employee_id: z.string().uuid(),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(timeRegex, 'Invalid time format (expected HH:MM)'),
  end_time: z.string().regex(timeRegex, 'Invalid time format (expected HH:MM)'),
}).refine(
  (data) => {
    const [startHour, startMin] = data.start_time.split(':').map(Number);
    const [endHour, endMin] = data.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return startMinutes < endMinutes;
  },
  {
    message: 'start_time must be before end_time',
    path: ['start_time'],
  }
);

/**
 * Update availability schema
 */
export const UpdateAvailabilitySchema = z.object({
  employee_id: z.string().uuid().optional(),
  day_of_week: z.number().min(0).max(6).optional(),
  start_time: z.string().regex(timeRegex, 'Invalid time format (expected HH:MM)').optional(),
  end_time: z.string().regex(timeRegex, 'Invalid time format (expected HH:MM)').optional(),
});

/**
 * Time slot schema
 */
export const TimeSlotSchema = z.object({
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  available: z.boolean(),
  employee_id: z.string().uuid(),
});

/**
 * Available slots request schema
 */
export const GetAvailableSlotsSchema = z.object({
  business_id: z.string().uuid(),
  employee_id: z.string().uuid().optional(),
  date: z.string().datetime(),
  duration: z.number().min(15).max(480).default(60), // minutes: 15min to 8 hours
});

// Type exports
export type Availability = z.infer<typeof AvailabilitySchema>;
export type CreateAvailabilityInput = z.infer<typeof CreateAvailabilitySchema>;
export type UpdateAvailabilityInput = z.infer<typeof UpdateAvailabilitySchema>;
export type TimeSlot = z.infer<typeof TimeSlotSchema>;
export type GetAvailableSlotsInput = z.infer<typeof GetAvailableSlotsSchema>;
