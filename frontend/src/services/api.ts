import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export interface Appointment {
  id: string;
  business_id: string;
  employee_id: string;
  customer_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  specialty?: string;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  todayAppointments: number;
  pendingAppointments: number;
  totalCustomers: number;
  upcomingAppointments: Appointment[];
}

// API service
export const api = {
  // Dashboard
  async getDashboardStats(businessId: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's appointments
    const { data: todayAppts, error: todayError } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .neq('status', 'cancelled');

    if (todayError) throw todayError;

    // Get pending appointments
    const { data: pendingAppts, error: pendingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', new Date().toISOString());

    if (pendingError) throw pendingError;

    // Get total customers
    const { count: totalCustomers, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', businessId);

    if (customersError) throw customersError;

    // Get upcoming appointments with related data
    const { data: upcomingAppts, error: upcomingError } = await supabase
      .from('appointments')
      .select(`
        *,
        employee:employees(name, specialty),
        customer:customers(name, phone)
      `)
      .eq('business_id', businessId)
      .in('status', ['pending', 'confirmed'])
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(10);

    if (upcomingError) throw upcomingError;

    return {
      todayAppointments: todayAppts?.length || 0,
      pendingAppointments: pendingAppts?.length || 0,
      totalCustomers: totalCustomers || 0,
      upcomingAppointments: (upcomingAppts as any) || [],
    };
  },

  // Appointments
  async getAppointments(businessId: string, filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        employee:employees(name, specialty),
        customer:customers(name, phone)
      `)
      .eq('business_id', businessId)
      .order('start_time', { ascending: true });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.startDate) {
      query = query.gte('start_time', filters.startDate);
    }

    if (filters?.endDate) {
      query = query.lte('start_time', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as any) || [];
  },

  async updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment> {
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return appointment;
  },

  async cancelAppointment(id: string): Promise<Appointment> {
    return this.updateAppointment(id, { status: 'cancelled' });
  },

  async confirmAppointment(id: string): Promise<Appointment> {
    return this.updateAppointment(id, { status: 'confirmed' });
  },

  // Customers
  async getCustomers(businessId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async searchCustomers(query: string, businessId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`);

    if (error) throw error;
    return data || [];
  },

  // Employees
  async getEmployees(businessId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getActiveEmployees(businessId: string): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
