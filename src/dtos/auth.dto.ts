import { z } from 'zod';

export const registerBusinessDto = z.object({
  businessName: z.string().min(1, 'Business name is required').max(255),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  ownerName: z.string().min(1, 'Owner name is required').max(255),
  timezone: z.string().optional(),
});

export const loginDto = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const resetPasswordDto = z.object({
  email: z.string().email('Invalid email format'),
});

// Type exports
export type RegisterBusinessDto = z.infer<typeof registerBusinessDto>;
export type LoginDto = z.infer<typeof loginDto>;
export type RefreshTokenDto = z.infer<typeof refreshTokenDto>;
export type ResetPasswordDto = z.infer<typeof resetPasswordDto>;
