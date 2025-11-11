import { z } from 'zod';

export const createCustomerDto = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  email: z.string().email('Invalid email format').optional(),
  notes: z.string().max(1000, 'Notes are too long').optional(),
});

export const updateCustomerDto = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const searchCustomersDto = z.object({
  search: z.string().optional(),
});

// Type exports
export type CreateCustomerDto = z.infer<typeof createCustomerDto>;
export type UpdateCustomerDto = z.infer<typeof updateCustomerDto>;
export type SearchCustomersDto = z.infer<typeof searchCustomersDto>;
