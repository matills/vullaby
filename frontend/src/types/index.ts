// Business types
export interface Business {
  id: string;
  name: string;
  phone: string;
  email?: string;
  industry?: string;
  settings?: Record<string, any>;
  plan: string;
  created_at: string;
  updated_at: string;
}

// Employee types
export interface Employee {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Customer types
export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  appointmentCount?: number;
}

// Appointment types
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

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
  customer?: Customer;
  employee?: Employee;
}

// Stats types
export interface AppointmentStats {
  todayCount: number;
  weekCount: number;
  pendingCount: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  error?: string;
  message?: string;
}

// Auth types
export interface User {
  id: string;
  email: string;
  businessId?: string;
}
