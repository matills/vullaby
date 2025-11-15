/**
 * Utilidades para parsear fechas en lenguaje natural
 */

/**
 * Parsea una fecha en lenguaje natural a un objeto Date
 * Soporta formatos como:
 * - "hoy"
 * - "mañana" / "manana"
 * - "lunes", "martes", "próximo lunes", "proximo martes", etc.
 * - DD/MM/YYYY
 */
export function parseNaturalDate(input: string): Date | null {
  const normalizedInput = input.toLowerCase().trim();

  // Caso 1: "hoy"
  if (normalizedInput === 'hoy') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  // Caso 2: "mañana" o "manana"
  if (normalizedInput === 'mañana' || normalizedInput === 'manana') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  // Caso 3: Días de la semana
  const weekdayMatch = normalizedInput.match(
    /^(proximo|próximo|este|esta)?\s*(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)$/
  );

  if (weekdayMatch) {
    const weekday = normalizeWeekday(weekdayMatch[2]);
    return getNextWeekday(weekday);
  }

  // Caso 4: Solo el nombre del día
  const singleDayMatch = normalizedInput.match(
    /^(lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo)$/
  );

  if (singleDayMatch) {
    const weekday = normalizeWeekday(singleDayMatch[1]);
    return getNextWeekday(weekday);
  }

  // Caso 5: Formato DD/MM/YYYY
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = normalizedInput.match(dateRegex);

  if (match) {
    const [, day, month, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    date.setHours(0, 0, 0, 0);

    // Validar que la fecha sea válida
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  // No se pudo parsear
  return null;
}

/**
 * Normaliza el nombre del día de la semana
 */
function normalizeWeekday(day: string): number {
  const normalized = day.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const weekdays: Record<string, number> = {
    'domingo': 0,
    'lunes': 1,
    'martes': 2,
    'miercoles': 3,
    'jueves': 4,
    'viernes': 5,
    'sabado': 6,
  };

  return weekdays[normalized] ?? -1;
}

/**
 * Obtiene la próxima ocurrencia de un día de la semana
 */
function getNextWeekday(targetDay: number): Date {
  if (targetDay < 0 || targetDay > 6) {
    throw new Error('Invalid weekday');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentDay = today.getDay();
  let daysToAdd = targetDay - currentDay;

  // Si el día ya pasó esta semana, ir a la próxima
  if (daysToAdd <= 0) {
    daysToAdd += 7;
  }

  const result = new Date(today);
  result.setDate(result.getDate() + daysToAdd);

  return result;
}

/**
 * Valida si una fecha es válida para agendar
 */
export function isValidAppointmentDate(date: Date): { valid: boolean; error?: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // No puede ser una fecha pasada
  if (date < today) {
    return {
      valid: false,
      error: 'La fecha debe ser de hoy en adelante. Por favor selecciona otra fecha.',
    };
  }

  // No puede ser muy lejos (máximo 90 días)
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 90);

  if (date > maxDate) {
    return {
      valid: false,
      error: 'Solo puedes agendar hasta 90 días en el futuro. Por favor selecciona otra fecha.',
    };
  }

  return { valid: true };
}

/**
 * Ejemplos de formatos aceptados
 */
export const SUPPORTED_DATE_FORMATS = `Puedes escribir:
• Días relativos: "hoy", "mañana"
• Días de la semana: "lunes", "martes", "próximo viernes"
• Fecha específica: DD/MM/YYYY (ejemplo: 25/12/2024)`;
