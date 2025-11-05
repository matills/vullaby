import { v4 as uuidv4 } from 'uuid';
import { addHours, addDays } from 'date-fns';

export class TestFactory {
  static createBusiness(overrides = {}) {
    return {
      id: uuidv4(),
      name: 'Test Business',
      phone: '+5491234567890',
      email: 'business@test.com',
      timezone: 'America/Argentina/Buenos_Aires',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createEmployee(businessId: string, overrides = {}) {
    return {
      id: uuidv4(),
      business_id: businessId,
      name: 'Test Employee',
      email: 'employee@test.com',
      phone: '+5491234567891',
      role: 'admin' as const,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createCustomer(businessId: string, overrides = {}) {
    return {
      id: uuidv4(),
      business_id: businessId,
      name: 'Test Customer',
      phone: '+5491234567892',
      email: 'customer@test.com',
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createService(businessId: string, overrides = {}) {
    return {
      id: uuidv4(),
      business_id: businessId,
      name: 'Test Service',
      description: 'Test service description',
      duration_minutes: 60,
      price: 100,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createAppointment(
    businessId: string,
    employeeId: string,
    customerId: string,
    serviceId: string,
    overrides = {}
  ) {
    const startTime = addHours(new Date(), 2);
    const endTime = addHours(startTime, 1);

    return {
      id: uuidv4(),
      business_id: businessId,
      employee_id: employeeId,
      customer_id: customerId,
      service_id: serviceId,
      start_time: startTime,
      end_time: endTime,
      status: 'pending' as const,
      notes: null,
      reminder_sent: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }

  static createWorkingHours(employeeId: string, dayOfWeek: number, overrides = {}) {
    return {
      id: uuidv4(),
      employee_id: employeeId,
      day_of_week: dayOfWeek,
      start_time: '09:00',
      end_time: '18:00',
      is_available: true,
      ...overrides,
    };
  }

  static createAuthUser(overrides = {}) {
    return {
      id: uuidv4(),
      email: 'test@example.com',
      user_metadata: {
        business_id: uuidv4(),
        employee_id: uuidv4(),
        role: 'admin',
      },
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  static createSession(userId: string, overrides = {}) {
    return {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: TestFactory.createAuthUser({ id: userId }),
      ...overrides,
    };
  }

  static generateFutureDate(daysFromNow: number = 1, hour: number = 10) {
    const date = addDays(new Date(), daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return date;
  }
}