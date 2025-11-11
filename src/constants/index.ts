// Time and scheduling constants
export const TIME_CONSTANTS = {
  SLOT_INTERVAL_MINUTES: 30,
  REMINDER_HOURS_BEFORE: 24,
  DEFAULT_TIMEZONE: 'America/Argentina/Buenos_Aires',
} as const;

// Rate limiting constants
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
} as const;

// Appointment status values
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUS[keyof typeof APPOINTMENT_STATUS];

// Employee roles
export const EMPLOYEE_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

export type EmployeeRole = typeof EMPLOYEE_ROLES[keyof typeof EMPLOYEE_ROLES];

// Database query fragments
export const DB_QUERIES = {
  APPOINTMENT_SELECT: `
    *,
    employee:employees(*),
    customer:customers(*),
    service:services(*)
  `,
  APPOINTMENTS_SELECT: `
    *,
    employee:employees(*),
    service:services(*)
  `,
  EMPLOYEE_WITH_BUSINESS: `*, business:businesses(*)`,
} as const;

// JWT configuration
export const JWT_CONFIG = {
  DEFAULT_EXPIRES_IN: '7d',
} as const;

// Logger configuration
export const LOGGER_CONFIG = {
  MAX_FILE_SIZE: 5242880, // 5MB
  MAX_FILES: 5,
} as const;

// Queue configuration
export const QUEUE_CONFIG = {
  REMINDER_CONCURRENCY: 5,
} as const;
