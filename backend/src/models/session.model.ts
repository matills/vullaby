import { z } from 'zod';

export const ConversationStateSchema = z.enum([
  'initial',
  'asking_name',
  'intent_detected',
  'collecting_data',
  'selecting_service',
  'selecting_employee',
  'selecting_date',
  'selecting_time',
  'confirming',
  'cancelling',
  'confirming_cancellation',
  'viewing',
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
  customer_name: z.string().optional(),
  employee_id: z.string().uuid().optional(),
  employee_name: z.string().optional(),
  employees: z.array(z.any()).optional(),
  selected_date: z.string().optional(),
  selected_time: z.string().optional(),
  selected_start_time: z.string().optional(),
  selected_end_time: z.string().optional(),
  selected_slot: z.any().optional(),
  available_slots: z.array(z.any()).optional(),
  duration: z.number().optional(),
  service_name: z.string().optional(),
  notes: z.string().optional(),
  collected_data: z.any().optional(),
  missing_data: z.any().optional(),
  appointments: z.array(z.any()).optional(),
  pending_cancellation_id: z.string().optional(),
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
