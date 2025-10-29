export interface Business {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  timezone: string;
  created_at: Date;
  updated_at: Date;
}

export interface Employee {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'employee';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Appointment {
  id: string;
  business_id: string;
  employee_id: string;
  customer_id: string;
  service_id: string;
  start_time: Date;
  end_time: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  reminder_sent: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WorkingHours {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface WhatsAppMessage {
  from: string;
  body: string;
  business_id?: string;
}

export interface AuthPayload {
  userId: string;
  businessId: string;
  role: string;
}