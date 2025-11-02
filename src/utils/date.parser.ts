import * as chrono from 'chrono-node';
import { startOfDay, isBefore, addDays } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

interface ParsedDate {
  date: Date;
  confidence: 'high' | 'medium' | 'low';
  matchedText: string;
  originalText: string;
}

export class DateParser {
  private static readonly spanishChrono = new chrono.Chrono(chrono.es.casual);

  static parse(input: string, timezone: string = 'America/Argentina/Buenos_Aires'): ParsedDate | null {
    const now = utcToZonedTime(new Date(), timezone);
    
    const results = this.spanishChrono.parse(input, now, { forwardDate: true });
    
    if (results.length === 0) {
      return null;
    }

    const bestResult = results[0];
    const parsedDate = bestResult.start.date();
    
    if (!parsedDate || !this.isValidFutureDate(parsedDate, now)) {
      return null;
    }

    const zonedDate = startOfDay(utcToZonedTime(parsedDate, timezone));
    const utcDate = zonedTimeToUtc(zonedDate, timezone);

    const confidence = this.assessConfidence(bestResult);

    return {
      date: utcDate,
      confidence,
      matchedText: bestResult.text,
      originalText: input,
    };
  }

  private static assessConfidence(result: chrono.ParsedResult): 'high' | 'medium' | 'low' {
    if (result.start.isCertain('day') && result.start.isCertain('month')) {
      return 'high';
    }
    
    if (result.start.isCertain('day')) {
      return 'medium';
    }
    
    return 'low';
  }

  private static isValidFutureDate(date: Date, now: Date): boolean {
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    return date >= today || date >= tomorrow;
  }

  static extractDateFromMessage(message: string, timezone: string): ParsedDate | null {
    const keywords = [
      'turno', 'reserva', 'agendar', 'cita', 'para',
      'hoy', 'mañana', 'pasado',
    ];

    const hasDateKeyword = keywords.some(kw => message.toLowerCase().includes(kw));
    if (!hasDateKeyword) {
      return null;
    }

    return this.parse(message, timezone);
  }

  static formatDateForUser(date: Date, timezone: string): string {
    const zonedDate = utcToZonedTime(date, timezone);
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    
    if (startOfDay(zonedDate).getTime() === today.getTime()) {
      return 'hoy';
    }
    
    if (startOfDay(zonedDate).getTime() === tomorrow.getTime()) {
      return 'mañana';
    }
    
    return zonedDate.toLocaleDateString('es-AR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
  }
}