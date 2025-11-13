import { z } from 'zod';

export const EmployeeSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const CreateEmployeeSchema = z.object({
  business_id: z.string().uuid('Invalid business ID'),
  name: z.string().min(1, 'Employee name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  is_active: z.boolean().optional().default(true),
});

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  role: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const QueryEmployeesSchema = z.object({
  business_id: z.string().uuid().optional(),
  is_active: z.string().transform((val) => val === 'true').optional(),
  role: z.string().optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export type Employee = z.infer<typeof EmployeeSchema>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type QueryEmployeesInput = z.infer<typeof QueryEmployeesSchema>;
