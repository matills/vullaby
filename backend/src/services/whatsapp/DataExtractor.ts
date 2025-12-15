import { BookingData } from './types';
import { parseNaturalDate } from '../../utils/date-parser';
import { logger } from '../../config/logger';

/**
 * DataExtractor - Extracts structured data from natural language messages
 */
export class DataExtractor {
  /**
   * Extract booking data from message
   */
  extractBookingData(message: string): Partial<BookingData> {
    const data: Partial<BookingData> = {};

    // Extract date
    const date = this.extractDate(message);
    if (date) {
      data.date = date;
    }

    // Extract time
    const time = this.extractTime(message);
    if (time) {
      data.time = time;
    }

    // Extract employee name
    const employeeName = this.extractEmployeeName(message);
    if (employeeName) {
      data.employeeName = employeeName;
    }

    return data;
  }

  /**
   * Extract date from message using natural language parser
   */
  private extractDate(message: string): Date | undefined {
    try {
      const date = parseNaturalDate(message);
      logger.debug('Extracted date from message:', { message, date });
      return date ?? undefined;
    } catch (error) {
      logger.debug('No valid date found in message:', message);
      return undefined;
    }
  }

  /**
   * Extract time from message
   * Supports formats: "3pm", "15:00", "a las 3", "3:30pm", etc.
   */
  private extractTime(message: string): string | undefined {
    const patterns = [
      // "a las 15:30", "a las 3:30 pm"
      /a\s+las?\s+(\d{1,2}):?(\d{2})?\s?(am|pm)?/i,
      // "15:30", "3:30 pm", "3:30pm"
      /\b(\d{1,2}):(\d{2})\s?(am|pm)?\b/i,
      // "3pm", "3 pm"
      /\b(\d{1,2})\s?(am|pm)\b/i,
      // Just a number that could be time in 24h format
      /\b([0-2]?[0-9])hs?\b/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const normalized = this.normalizeTime(match);
        if (normalized) {
          logger.debug('Extracted time from message:', { message, time: normalized });
          return normalized;
        }
      }
    }

    logger.debug('No valid time found in message:', message);
    return undefined;
  }

  /**
   * Normalize time to 24-hour format "HH:mm"
   */
  private normalizeTime(match: RegExpMatchArray): string | undefined {
    try {
      let hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      const period = match[3]?.toLowerCase();

      // Validate minute
      if (minute > 59) {
        return undefined;
      }

      // Convert to 24-hour format
      if (period === 'pm' && hour < 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }

      // Validate hour
      if (hour > 23 || hour < 0) {
        return undefined;
      }

      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    } catch (error) {
      logger.error('Error normalizing time:', error);
      return undefined;
    }
  }

  /**
   * Extract employee name from message
   * Looks for patterns like "con María", "María", "empleado Juan"
   */
  private extractEmployeeName(message: string): string | undefined {
    const patterns = [
      /con\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /empleado\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
      /profesional\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        logger.debug('Extracted employee name from message:', {
          message,
          name: match[1]
        });
        return match[1];
      }
    }

    logger.debug('No employee name found in message:', message);
    return undefined;
  }

  /**
   * Find employee by name (case-insensitive, partial match)
   */
  findEmployeeByName(employees: any[], name: string): any | undefined {
    const normalizedName = name.toLowerCase().trim();

    // First try exact match
    let employee = employees.find(e =>
      e.name.toLowerCase() === normalizedName
    );

    // Then try partial match
    if (!employee) {
      employee = employees.find(e =>
        e.name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(e.name.toLowerCase())
      );
    }

    return employee;
  }

  /**
   * Check if message is an affirmative response
   */
  isAffirmative(message: string): boolean {
    const affirmatives = [
      'si', 'sí', 'yes', 'ok', 'okay', 'dale', 'confirmar',
      'confirmo', 'perfecto', 'genial', 'acepto', 'afirmativo',
      '✓', '✔', '👍', '1'
    ];

    const lower = message.toLowerCase().trim();
    return affirmatives.some(word => lower === word || lower.includes(word));
  }

  /**
   * Check if message is a negative response
   */
  isNegative(message: string): boolean {
    const negatives = [
      'no', 'nope', 'cancelar', 'no quiero', 'cambiar',
      'negativo', 'rechazar', '❌', '✗', '👎', '0'
    ];

    const lower = message.toLowerCase().trim();
    return negatives.some(word => lower === word || lower.includes(word));
  }

  /**
   * Parse number selection from message (1, 2, 3, etc.)
   */
  extractSelection(message: string, maxOptions: number): number | undefined {
    // Try to extract number
    const match = message.match(/\b(\d+)\b/);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= maxOptions) {
        return num;
      }
    }
    return undefined;
  }
}
