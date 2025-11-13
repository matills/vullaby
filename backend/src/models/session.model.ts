import { z } from 'zod';

export const ConversationStateSchema = z.enum([
  'initial',
  'selecting_service',
  'selecting_employee',
  'selecting_date',
  'selecting_time',
  'confirming',
  'completed',
  'cancelled'
]);

export const WhatsAppSessionSchema = z.object({
  phone: z.string().min(10),
  state: ConversationStateSchema.default('initial'),
  data: z.record(z.any()).default({}),
  lastActivity: z.date().default(() => new Date()),
  business_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
});

export const SessionDataSchema = z.object({
  business_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  employee_id: z.string().uuid().optional(),
  selected_date: z.string().optional(),
  selected_time: z.string().optional(),
  duration: z.number().optional(),
  service_name: z.string().optional(),
  notes: z.string().optional(),
});

export const IncomingWhatsAppMessageSchema = z.object({
  From: z.string(),
  To: z.string(),
  Body: z.string(),
  MessageSid: z.string().optional(),
  AccountSid: z.string().optional(),
  NumMedia: z.string().optional(),
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;
export type WhatsAppSession = z.infer<typeof WhatsAppSessionSchema>;
export type SessionData = z.infer<typeof SessionDataSchema>;
export type IncomingWhatsAppMessage = z.infer<typeof IncomingWhatsAppMessageSchema>;
