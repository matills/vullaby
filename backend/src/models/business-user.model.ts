import { z } from 'zod';

export const BusinessUserSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  auth_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'staff']).default('owner'),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export const CreateBusinessUserSchema = z.object({
  business_id: z.string().uuid('Invalid business ID'),
  auth_id: z.string().uuid('Invalid auth ID'),
  role: z.enum(['owner', 'admin', 'staff']).optional().default('owner'),
});

export const UpdateBusinessUserSchema = z.object({
  role: z.enum(['owner', 'admin', 'staff']).optional(),
});

export const QueryBusinessUsersSchema = z.object({
  business_id: z.string().uuid().optional(),
  auth_id: z.string().uuid().optional(),
  role: z.enum(['owner', 'admin', 'staff']).optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export type BusinessUser = z.infer<typeof BusinessUserSchema>;
export type CreateBusinessUserInput = z.infer<typeof CreateBusinessUserSchema>;
export type UpdateBusinessUserInput = z.infer<typeof UpdateBusinessUserSchema>;
export type QueryBusinessUsersInput = z.infer<typeof QueryBusinessUsersSchema>;
