import { z } from 'zod';

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  phone: z.string().min(10),
  name: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const CreateCustomerSchema = z.object({
  phone: z.string().min(10),
  name: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;
export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
