import type {
  ApiResponse,
  Appointment,
  AppointmentStats,
  Customer,
  Employee,
} from '@/types';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.error || `HTTP error! status: ${response.status}`,
        errorData
      );
    }

    const result: ApiResponse<T> = await response.json();
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Appointments API
export const appointmentsApi = {
  getUpcoming: (businessId: string, limit = 10) =>
    fetchApi<Appointment[]>(
      `/api/appointments/upcoming?business_id=${businessId}&limit=${limit}`
    ),

  getStats: (businessId: string) =>
    fetchApi<AppointmentStats>(`/api/appointments/stats?business_id=${businessId}`),

  getById: (id: string) => fetchApi<Appointment>(`/api/appointments/${id}`),

  create: (data: Partial<Appointment>) =>
    fetchApi<Appointment>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Appointment>) =>
    fetchApi<Appointment>(`/api/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  cancel: (id: string) =>
    fetchApi<Appointment>(`/api/appointments/${id}/cancel`, {
      method: 'POST',
    }),

  confirm: (id: string) =>
    fetchApi<Appointment>(`/api/appointments/${id}/confirm`, {
      method: 'POST',
    }),

  complete: (id: string) =>
    fetchApi<Appointment>(`/api/appointments/${id}/complete`, {
      method: 'POST',
    }),
};

// Customers API
export const customersApi = {
  search: (businessId: string, query?: string) => {
    const url = `/api/customers/search?business_id=${businessId}${
      query ? `&q=${encodeURIComponent(query)}` : ''
    }`;
    return fetchApi<Customer[]>(url);
  },

  getById: (id: string) => fetchApi<Customer>(`/api/customers/${id}`),

  getByPhone: (phone: string) =>
    fetchApi<Customer>(`/api/customers/phone/${encodeURIComponent(phone)}`),

  create: (data: Partial<Customer>) =>
    fetchApi<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Customer>) =>
    fetchApi<Customer>(`/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),
};

// Employees API
export const employeesApi = {
  getAll: (businessId: string) =>
    fetchApi<Employee[]>(`/api/employees?business_id=${businessId}`),

  getById: (id: string) => fetchApi<Employee>(`/api/employees/${id}`),

  create: (data: Partial<Employee>) =>
    fetchApi<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Employee>) =>
    fetchApi<Employee>(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/api/employees/${id}`, {
      method: 'DELETE',
    }),
};

export { ApiError };
