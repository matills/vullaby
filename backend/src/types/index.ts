// Database types
export interface Business {
  id: string;
  name: string;
  phone: string;
  email: string;
  industry: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  business_id: string;
  employee_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show';

export interface Availability {
  id: string;
  employee_id: string;
  day_of_week: number; // 0 = Sunday, 6 = Saturday
  start_time: string; // Format: HH:MM
  end_time: string; // Format: HH:MM
  created_at: string;
  updated_at: string;
}

// WhatsApp session types
export interface WhatsAppSession {
  phone: string;
  state: ConversationState;
  data: any;
  lastActivity: Date;
}

export type ConversationState =
  | 'initial'
  | 'selecting_date'
  | 'selecting_time'
  | 'selecting_employee'
  | 'confirming'
  | 'completed';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
