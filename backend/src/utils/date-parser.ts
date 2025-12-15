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

  // Caso 5: Formato "X de mes" o "primero de mes"
  const monthNameMatch = normalizedInput.match(
    /^(primero|primer|segundo|tercero|\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(\s+\d{2,4})?$/
  );

  if (monthNameMatch) {
    const dayStr = monthNameMatch[1];
    const monthName = monthNameMatch[2];
    const yearStr = monthNameMatch[3]?.trim();

    // Convertir "primero" a número
    const dayNumber = convertWordToNumber(dayStr);
    if (dayNumber === null || dayNumber < 1 || dayNumber > 31) {
      return null;
    }

    // Convertir nombre de mes a número
    const monthNumber = convertMonthNameToNumber(monthName);
    if (monthNumber === null) {
      return null;
    }

    // Determinar año
    const currentYear = new Date().getFullYear();
    let year = currentYear;
    if (yearStr) {
      const parsedYear = parseInt(yearStr);
      year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
    }

    const date = new Date(year, monthNumber - 1, dayNumber);
    date.setHours(0, 0, 0, 0);

    // Si la fecha ya pasó este año, usar el próximo año
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today && !yearStr) {
      date.setFullYear(currentYear + 1);
    }

    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  }

  // Caso 6: Formato DD/MM/YYYY o DD/MM/YY
  const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
  const match = normalizedInput.match(dateRegex);

  if (match) {
    const [, day, month, yearStr] = match;
    let year = parseInt(yearStr);

    // Si el año tiene 2 dígitos, convertir a 4 dígitos
    if (year < 100) {
      year = 2000 + year;
    }

    const date = new Date(year, parseInt(month) - 1, parseInt(day));
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
 * Convierte palabras numéricas a números
 */
function convertWordToNumber(word: string): number | null {
  const normalized = word.toLowerCase().trim();

  const wordMap: Record<string, number> = {
    'primero': 1,
    'primer': 1,
    'segundo': 2,
    'tercero': 3,
    'cuarto': 4,
    'quinto': 5,
    'sexto': 6,
    'séptimo': 7,
    'septimo': 7,
    'octavo': 8,
    'noveno': 9,
    'décimo': 10,
    'decimo': 10,
  };

  // Si es palabra, buscar en el mapa
  if (wordMap[normalized] !== undefined) {
    return wordMap[normalized];
  }

  // Si es número, convertir
  const num = parseInt(normalized);
  if (!isNaN(num)) {
    return num;
  }

  return null;
}

/**
 * Convierte nombre de mes a número (1-12)
 */
function convertMonthNameToNumber(monthName: string): number | null {
  const normalized = monthName.toLowerCase().trim();

  const monthMap: Record<string, number> = {
    'enero': 1,
    'febrero': 2,
    'marzo': 3,
    'abril': 4,
    'mayo': 5,
    'junio': 6,
    'julio': 7,
    'agosto': 8,
    'septiembre': 9,
    'octubre': 10,
    'noviembre': 11,
    'diciembre': 12,
  };

  return monthMap[normalized] ?? null;
}

/**
 * Ejemplos de formatos aceptados
 */
export const SUPPORTED_DATE_FORMATS = `Puedes escribir:
• Días relativos: "hoy", "mañana"
• Días de la semana: "lunes", "martes", "próximo viernes"
• Fecha con mes: "1 de diciembre", "primero de enero"
• Fecha específica: DD/MM/YYYY o DD/MM/YY (ejemplo: 25/12/2024 o 1/12/25)`;
