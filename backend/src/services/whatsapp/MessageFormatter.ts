import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * MessageFormatter - Creates well-formatted, friendly WhatsApp messages
 */
export class MessageFormatter {
  /**
   * Format welcome message
   */
  static formatWelcome(name?: string): string {
    if (name) {
      return (
        `¡Hola ${name}! 👋 ¿En qué puedo ayudarte?\n\n` +
        `1️⃣ Agendar un turno\n` +
        `2️⃣ Cancelar un turno\n` +
        `3️⃣ Ver mis turnos\n` +
        `4️⃣ Hablar con alguien\n\n` +
        `Responde con el número o escríbeme directamente lo que necesitas.`
      );
    }

    return (
      `¡Hola! 👋 Bienvenido a nuestro sistema de reservas.\n\n` +
      `Para poder ayudarte mejor, primero necesito saber tu nombre.\n` +
      `¿Cómo te llamas?`
    );
  }

  /**
   * Format help message
   */
  static formatHelp(): string {
    return (
      `🤖 *Puedo ayudarte con:*\n\n` +
      `📅 *Agendar turno*\n` +
      `Escribe "agendar" o "quiero turno" y te guiaré.\n` +
      `Ejemplo: "Quiero turno para mañana a las 3pm"\n\n` +
      `❌ *Cancelar turno*\n` +
      `Escribe "cancelar" para ver tus turnos y elegir cuál cancelar.\n\n` +
      `📋 *Ver turnos*\n` +
      `Escribe "mis turnos" para ver tus próximas citas.\n\n` +
      `🔄 Para empezar de nuevo, escribe "inicio"\n`
    );
  }

  /**
   * Format employee list
   */
  static formatEmployeeList(employees: any[]): string {
    if (employees.length === 0) {
      return 'Lo siento, no hay profesionales disponibles en este momento.';
    }

    if (employees.length === 1) {
      const emp = employees[0];
      return `Te agendaré con ${emp.name}${emp.role ? ` (${emp.role})` : ''}.`;
    }

    const list = employees
      .map((emp, index) => {
        const role = emp.role ? ` - ${emp.role}` : '';
        return `${index + 1}. ${emp.name}${role}`;
      })
      .join('\n');

    return (
      `¿Con qué profesional te gustaría agendar?\n\n` +
      `${list}\n` +
      `${employees.length + 1}. ⚡ Cualquiera disponible\n\n` +
      `Responde con el número o el nombre.`
    );
  }

  /**
   * Format available time slots
   */
  static formatTimeSlots(date: Date, slots: string[]): string {
    const dateStr = format(date, "EEEE d 'de' MMMM", { locale: es });

    if (slots.length === 0) {
      return `No hay horarios disponibles para ${dateStr}. ¿Quieres elegir otro día?`;
    }

    // Group slots by morning/afternoon
    const morning: string[] = [];
    const afternoon: string[] = [];

    slots.forEach(slot => {
      const [hour] = slot.split(':').map(Number);
      if (hour < 12) {
        morning.push(slot);
      } else {
        afternoon.push(slot);
      }
    });

    let message = `Horarios disponibles para ${dateStr}:\n\n`;

    if (morning.length > 0) {
      message += `🌅 *Mañana:*\n`;
      morning.forEach((slot, i) => {
        message += `${i + 1}. ${this.formatTime(slot)}\n`;
      });
      message += '\n';
    }

    if (afternoon.length > 0) {
      message += `🌆 *Tarde:*\n`;
      afternoon.forEach((slot, i) => {
        const index = morning.length + i + 1;
        const isLast = index === slots.length;
        message += `${index}. ${this.formatTime(slot)}${isLast ? ' ⭐ (último)' : ''}\n`;
      });
    }

    message += '\nResponde con el número del horario que prefieres.';
    return message;
  }

  /**
   * Format time in 12-hour format with AM/PM
   */
  private static formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Format appointment confirmation
   */
  static formatConfirmation(appointment: {
    date: Date;
    time: string;
    employeeName: string;
    businessName?: string;
    businessAddress?: string;
  }): string {
    const dateStr = format(appointment.date, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = this.formatTime(appointment.time);

    let message = (
      `✅ *¿Confirmar tu turno?*\n\n` +
      `📅 ${dateStr}\n` +
      `🕐 ${timeStr}\n` +
      `👤 ${appointment.employeeName}\n`
    );

    if (appointment.businessName) {
      message += `🏢 ${appointment.businessName}\n`;
    }

    if (appointment.businessAddress) {
      message += `📍 ${appointment.businessAddress}\n`;
    }

    message += `\n¿Está todo bien? Responde *Sí* para confirmar o *No* para cancelar.`;

    return message;
  }

  /**
   * Format appointment confirmed success message
   */
  static formatAppointmentConfirmed(appointment: {
    id: string;
    date: Date;
    time: string;
    employeeName: string;
    businessName?: string;
    businessAddress?: string;
  }): string {
    const dateStr = format(appointment.date, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = this.formatTime(appointment.time);

    let message = (
      `✅ *¡Turno confirmado!*\n\n` +
      `📅 ${dateStr}\n` +
      `🕐 ${timeStr}\n` +
      `👤 ${appointment.employeeName}\n`
    );

    if (appointment.businessName) {
      message += `🏢 ${appointment.businessName}\n`;
    }

    if (appointment.businessAddress) {
      message += `📍 ${appointment.businessAddress}\n`;
    }

    message += (
      `\n🔔 Te recordaré 24 horas antes.\n\n` +
      `Para cancelar, escribe *"cancelar turno"* en cualquier momento.`
    );

    return message;
  }

  /**
   * Format list of user's appointments
   */
  static formatAppointmentList(appointments: any[]): string {
    if (appointments.length === 0) {
      return (
        `No tienes turnos agendados.\n\n` +
        `¿Quieres agendar uno? Escribe "agendar" o "quiero turno".`
      );
    }

    let message = `📋 *Tus próximos turnos:*\n\n`;

    appointments.forEach((apt, index) => {
      const date = new Date(apt.start_time);
      const dateStr = format(date, "EEE d/MM", { locale: es });
      const timeStr = format(date, "HH:mm");
      const status = this.getStatusEmoji(apt.status);

      message += (
        `${index + 1}. ${status} ${dateStr} - ${timeStr}\n` +
        `   👤 ${apt.employee_name || 'Por asignar'}\n\n`
      );
    });

    message += `Para cancelar, responde con el número del turno.`;

    return message;
  }

  /**
   * Get emoji for appointment status
   */
  private static getStatusEmoji(status: string): string {
    const emojis: Record<string, string> = {
      pending: '⏳',
      confirmed: '✅',
      completed: '✔️',
      cancelled: '❌'
    };
    return emojis[status] || '📅';
  }

  /**
   * Format cancellation confirmation
   */
  static formatCancellationConfirmation(appointment: {
    date: Date;
    time: string;
    employeeName: string;
  }): string {
    const dateStr = format(appointment.date, "EEEE d 'de' MMMM", { locale: es });
    const timeStr = this.formatTime(appointment.time);

    return (
      `❌ ¿Seguro que quieres cancelar este turno?\n\n` +
      `📅 ${dateStr}\n` +
      `🕐 ${timeStr}\n` +
      `👤 ${appointment.employeeName}\n\n` +
      `Responde *Sí* para confirmar la cancelación o *No* para mantener el turno.`
    );
  }

  /**
   * Format cancellation success
   */
  static formatCancellationSuccess(): string {
    return (
      `✅ *Turno cancelado exitosamente.*\n\n` +
      `Si cambias de opinión, puedes reagendar escribiendo "agendar" o "quiero turno".`
    );
  }

  /**
   * Format error message
   */
  static formatError(error: string): string {
    return `❌ ${error}\n\n¿Necesitas ayuda? Escribe "ayuda".`;
  }

  /**
   * Format asking for missing data
   */
  static formatAskForDate(): string {
    return (
      `📅 ¿Para qué día te gustaría agendar?\n\n` +
      `Puedes decir:\n` +
      `• "Mañana"\n` +
      `• "Viernes"\n` +
      `• "20 de noviembre"\n` +
      `• "Próximo lunes"\n`
    );
  }

  static formatAskForTime(): string {
    return (
      `🕐 ¿A qué hora prefieres?\n\n` +
      `Puedes decir:\n` +
      `• "3pm" o "15:00"\n` +
      `• "10:30 am"\n` +
      `• "A las 2 de la tarde"\n`
    );
  }

  /**
   * Format "I don't understand" message
   */
  static formatNotUnderstood(): string {
    return (
      `🤔 No entendí bien lo que necesitas.\n\n` +
      `Puedo ayudarte a:\n` +
      `• Agendar un turno (escribe "agendar")\n` +
      `• Cancelar un turno (escribe "cancelar")\n` +
      `• Ver tus turnos (escribe "mis turnos")\n\n` +
      `¿Qué necesitas?`
    );
  }

  /**
   * Public method: Format date for messages
   */
  static formatDatePublic(date: Date): string {
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  }

  /**
   * Public method: Format time for messages
   */
  static formatTimePublic(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    return this.formatTime(time);
  }
}
