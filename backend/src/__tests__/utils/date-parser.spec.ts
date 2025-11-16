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
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(16);
    expect(result?.getMonth()).toBe(10); // November (0-indexed)
  });

  it('should parse "mañana" correctly', () => {
    const result = parseNaturalDate('mañana');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(17);
  });

  it('should parse "manana" (without accent) correctly', () => {
    const result = parseNaturalDate('manana');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getDate()).toBe(17);
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
    const today = new Date('2025-11-16T00:00:00Z');
    const result = isValidAppointmentDate(today);
    expect(result.valid).toBe(true);
  });

  it('should accept future dates', () => {
    const future = new Date('2025-11-20T00:00:00Z');
    const result = isValidAppointmentDate(future);
    expect(result.valid).toBe(true);
  });

  it('should reject past dates', () => {
    const past = new Date('2025-11-15T00:00:00Z');
    const result = isValidAppointmentDate(past);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('hoy en adelante');
  });

  it('should reject dates more than 90 days in future', () => {
    const farFuture = new Date('2026-03-01T00:00:00Z');
    const result = isValidAppointmentDate(farFuture);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('90 días');
  });
});
