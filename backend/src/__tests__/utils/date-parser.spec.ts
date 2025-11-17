import { parseNaturalDate, isValidAppointmentDate } from '../../utils/date-parser';

describe('parseNaturalDate', () => {
  beforeEach(() => {
    // Mock current date to make tests deterministic
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-16T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should parse "hoy" correctly', () => {
    const result = parseNaturalDate('hoy');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(today.getDate());
    expect(result?.getMonth()).toBe(today.getMonth());
  });

  it('should parse "mañana" correctly', () => {
    const result = parseNaturalDate('mañana');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(tomorrow.getDate());
  });

  it('should parse "manana" (without accent) correctly', () => {
    const result = parseNaturalDate('manana');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(tomorrow.getDate());
  });

  it('should parse weekday names correctly', () => {
    const result = parseNaturalDate('lunes');
    expect(result).toBeInstanceOf(Date);
  });

  it('should parse "próximo viernes" correctly', () => {
    const result = parseNaturalDate('próximo viernes');
    expect(result).toBeInstanceOf(Date);
  });

  it('should parse date format DD/MM/YYYY', () => {
    const result = parseNaturalDate('25/12/2025');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(25);
    expect(result?.getMonth()).toBe(11); // December
    expect(result?.getFullYear()).toBe(2025);
  });

  it('should parse date format DD/MM/YY (2-digit year)', () => {
    const result = parseNaturalDate('1/12/25');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(1);
    expect(result?.getMonth()).toBe(11); // December
    expect(result?.getFullYear()).toBe(2025);
  });

  it('should parse "primero de diciembre"', () => {
    const result = parseNaturalDate('primero de diciembre');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(1);
    expect(result?.getMonth()).toBe(11); // December
  });

  it('should parse "1 de diciembre"', () => {
    const result = parseNaturalDate('1 de diciembre');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(1);
    expect(result?.getMonth()).toBe(11); // December
  });

  it('should return null for invalid input', () => {
    const result = parseNaturalDate('invalid date');
    expect(result).toBeNull();
  });
});

describe('isValidAppointmentDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-11-16T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should accept today\'s date', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = isValidAppointmentDate(today);
    expect(result.valid).toBe(true);
  });

  it('should accept future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    future.setHours(0, 0, 0, 0);
    const result = isValidAppointmentDate(future);
    expect(result.valid).toBe(true);
  });

  it('should reject past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    past.setHours(0, 0, 0, 0);
    const result = isValidAppointmentDate(past);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hoy en adelante');
  });

  it('should reject dates more than 90 days in future', () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 100);
    farFuture.setHours(0, 0, 0, 0);
    const result = isValidAppointmentDate(farFuture);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('90 días');
  });
});
