import { ValidationResult } from './types';
import { logger } from '../../config/logger';
import { isValidAppointmentDate } from '../../utils/date-parser';

/**
 * ValidationService - Validates dates, times, and other booking data
 */
export class ValidationService {
  /**
   * Validate a date for appointment booking
   */
  validateDate(date: Date): ValidationResult {
    try {
      // Check if date is valid
      if (!date || isNaN(date.getTime())) {
        return {
          valid: false,
          error: 'La fecha no es válida.'
        };
      }

      // Check if date is not in the past
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);

      if (targetDate < now) {
        return {
          valid: false,
          error: 'No puedo agendar para fechas pasadas 😅. ¿Para qué día te gustaría?'
        };
      }

      // Check if date is too far in the future (e.g., more than 3 months)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      if (targetDate > threeMonthsFromNow) {
        return {
          valid: false,
          error: 'Solo puedo agendar hasta 3 meses adelante. ¿Quieres elegir otra fecha?'
        };
      }

      // Use existing validation
      if (!isValidAppointmentDate(date)) {
        return {
          valid: false,
          error: 'Esa fecha no está disponible. Por favor elige otra fecha.'
        };
      }

      return {
        valid: true,
        normalized: date
      };
    } catch (error) {
      logger.error('Error validating date:', error);
      return {
        valid: false,
        error: 'Hubo un error validando la fecha. ¿Puedes intentar de nuevo?'
      };
    }
  }

  /**
   * Validate a time for appointment booking
   */
  validateTime(time: string, businessHours?: { start: string; end: string }): ValidationResult {
    try {
      // Parse time
      const [hours, minutes] = time.split(':').map(Number);

      if (isNaN(hours) || isNaN(minutes)) {
        return {
          valid: false,
          error: 'La hora no es válida.'
        };
      }

      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return {
          valid: false,
          error: 'Esa hora no es válida 🤔. Por favor elige una hora válida.'
        };
      }

      // Check business hours if provided
      if (businessHours) {
        const [startHour] = businessHours.start.split(':').map(Number);
        const [endHour] = businessHours.end.split(':').map(Number);

        if (hours < startHour || hours >= endHour) {
          return {
            valid: false,
            error: `Nuestro horario de atención es de ${businessHours.start} a ${businessHours.end}. ¿Qué hora te viene bien?`
          };
        }
      }

      return {
        valid: true,
        normalized: time
      };
    } catch (error) {
      logger.error('Error validating time:', error);
      return {
        valid: false,
        error: 'Hubo un error validando la hora. ¿Puedes intentar de nuevo?'
      };
    }
  }

  /**
   * Validate that the selected time is in the future
   */
  validateDateTime(date: Date, time: string): ValidationResult {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentDateTime = new Date(date);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      const now = new Date();

      if (appointmentDateTime <= now) {
        return {
          valid: false,
          error: 'Ese horario ya pasó. Por favor elige un horario futuro.'
        };
      }

      // Check if it's too soon (e.g., less than 1 hour from now)
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      if (appointmentDateTime < oneHourFromNow) {
        return {
          valid: false,
          error: 'Necesito al menos 1 hora de anticipación. ¿Puedes elegir otro horario?'
        };
      }

      return {
        valid: true,
        normalized: appointmentDateTime
      };
    } catch (error) {
      logger.error('Error validating datetime:', error);
      return {
        valid: false,
        error: 'Hubo un error validando la fecha y hora. ¿Puedes intentar de nuevo?'
      };
    }
  }

  /**
   * Validate employee selection
   */
  validateEmployeeSelection(
    selection: number | string,
    employees: any[]
  ): ValidationResult {
    try {
      if (employees.length === 0) {
        return {
          valid: false,
          error: 'No hay empleados disponibles.'
        };
      }

      // If it's a number selection
      if (typeof selection === 'number') {
        if (selection < 1 || selection > employees.length) {
          return {
            valid: false,
            error: `Por favor selecciona un número del 1 al ${employees.length}.`
          };
        }
        return {
          valid: true,
          normalized: employees[selection - 1]
        };
      }

      // If it's a name
      if (typeof selection === 'string') {
        const employee = employees.find(e =>
          e.name.toLowerCase() === selection.toLowerCase()
        );

        if (!employee) {
          return {
            valid: false,
            error: 'No encontré ese empleado. Por favor elige del listado.'
          };
        }

        return {
          valid: true,
          normalized: employee
        };
      }

      return {
        valid: false,
        error: 'Selección no válida.'
      };
    } catch (error) {
      logger.error('Error validating employee selection:', error);
      return {
        valid: false,
        error: 'Hubo un error. ¿Puedes intentar de nuevo?'
      };
    }
  }
}
