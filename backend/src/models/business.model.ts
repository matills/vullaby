import { z } from 'zod';

export const BusinessSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  industry: z.string().optional(),
  settings: z.record(z.any()).optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']).default('basic'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const CreateBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  email: z.string().email().optional(),
  industry: z.string().optional(),
  settings: z.record(z.any()).optional().default({}),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional().default('basic'),
});

export const UpdateBusinessSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(10).optional(),
  email: z.string().email().optional(),
  industry: z.string().optional(),
  settings: z.record(z.any()).optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
});

export const QueryBusinessesSchema = z.object({
  industry: z.string().optional(),
  plan: z.enum(['basic', 'pro', 'enterprise']).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export type Business = z.infer<typeof BusinessSchema>;
export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof UpdateBusinessSchema>;
export type QueryBusinessesInput = z.infer<typeof QueryBusinessesSchema>;
