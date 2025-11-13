import { sendWhatsAppMessage } from '../config/twilio';
import { logger } from '../config/logger';
import { sessionService } from './session.service';
import { IncomingWhatsAppMessage } from '../models';

export const whatsappService = {
  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await sendWhatsAppMessage(to, message);
      logger.info(`Message sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send message to ${to}:`, error);
      throw error;
    }
  },

  async sendMessageWithOptions(
    to: string,
    message: string,
    options: string[]
  ): Promise<void> {
    const formattedOptions = options
      .map((opt, index) => `${index + 1}. ${opt}`)
      .join('\n');

    const fullMessage = `${message}\n\n${formattedOptions}`;

    await this.sendMessage(to, fullMessage);
  },

  async handleIncomingMessage(message: IncomingWhatsAppMessage): Promise<void> {
    const phone = message.From;
    const body = message.Body.trim();

    logger.info(`Incoming message from ${phone}: ${body}`);

    try {
      const session = sessionService.getOrCreateSession(phone);

      switch (session.state) {
        case 'initial':
          await this.handleInitialState(phone, body);
          break;

        case 'selecting_employee':
          await this.handleEmployeeSelection(phone, body);
          break;

        case 'selecting_date':
          await this.handleDateSelection(phone, body);
          break;

        case 'selecting_time':
          await this.handleTimeSelection(phone, body);
          break;

        case 'confirming':
          await this.handleConfirmation(phone, body);
          break;

        default:
          await this.sendMessage(
            phone,
            'Lo siento, hubo un error. Por favor, escribe "inicio" para comenzar de nuevo.'
          );
      }
    } catch (error) {
      logger.error(`Error handling message from ${phone}:`, error);
      await this.sendMessage(
        phone,
        'Ocurrió un error. Por favor, intenta de nuevo más tarde.'
      );
    }
  },

  async handleInitialState(phone: string, _body: string): Promise<void> {
    const { employeeService } = await import('./employee.service');
    const employees = await employeeService.getActiveEmployeesByBusiness('966d6a45-9111-4a42-b618-2f744ebce14a');

    if (employees.length === 0) {
      await this.sendMessage(phone, 'Lo siento, no hay profesionales disponibles en este momento.');
      sessionService.resetSession(phone);
      return;
    }

    if (employees.length === 1) {
      const employee = employees[0];
      sessionService.updateData(phone, { employee_id: employee.id, employee_name: employee.name });

      const message =
        `Perfecto! Te agendaré con ${employee.name}.\n\n` +
        '¿Para qué fecha te gustaría agendar?\n\n' +
        'Por favor envía la fecha en formato DD/MM/YYYY\n' +
        'Ejemplo: 25/12/2024';

      await this.sendMessage(phone, message);
      sessionService.updateState(phone, 'selecting_date');
    } else {
      const welcomeMessage =
        '¡Hola! 👋 Bienvenido a nuestro sistema de reservas.\n\n' +
        'Para agendar un turno, necesito algunos datos.\n' +
        '¿Con qué profesional te gustaría agendar?\n\n' +
        'Escribe "lista" para ver los profesionales disponibles.';

      await this.sendMessage(phone, welcomeMessage);
      sessionService.updateState(phone, 'selecting_employee');
    }
  },

  async handleEmployeeSelection(phone: string, body: string): Promise<void> {

    const message =
      'Perfecto! Ahora, ¿para qué fecha te gustaría agendar?\n\n' +
      'Por favor envía la fecha en formato DD/MM/YYYY\n' +
      'Ejemplo: 25/12/2024';

    await this.sendMessage(phone, message);
    sessionService.updateState(phone, 'selecting_date');
    sessionService.updateData(phone, { employee_id: body });
  },

  async handleDateSelection(phone: string, body: string): Promise<void> {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = body.match(dateRegex);

    if (!match) {
      await this.sendMessage(
        phone,
        'Formato de fecha incorrecto. Por favor usa DD/MM/YYYY\nEjemplo: 25/12/2024'
      );
      return;
    }

    const [, day, month, year] = match;
    const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    selectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      await this.sendMessage(
        phone,
        'La fecha debe ser de hoy en adelante. Por favor selecciona otra fecha.'
      );
      return;
    }

    sessionService.updateData(phone, { selected_date: selectedDate.toISOString() });

    const message =
      'Horarios disponibles para ese día:\n\n' +
      '1. 09:00\n' +
      '2. 10:00\n' +
      '3. 11:00\n' +
      '4. 14:00\n' +
      '5. 15:00\n\n' +
      'Por favor responde con el número de tu horario preferido.';

    await this.sendMessage(phone, message);
    sessionService.updateState(phone, 'selecting_time');
  },

  async handleTimeSelection(phone: string, body: string): Promise<void> {
    const timeMap: Record<string, string> = {
      '1': '09:00',
      '2': '10:00',
      '3': '11:00',
      '4': '14:00',
      '5': '15:00',
    };

    const selectedTime = timeMap[body];

    if (!selectedTime) {
      await this.sendMessage(
        phone,
        'Opción inválida. Por favor selecciona un número del 1 al 5.'
      );
      return;
    }

    sessionService.updateData(phone, { selected_time: selectedTime });

    const session = sessionService.getOrCreateSession(phone);
    const message =
      '📋 Confirmación de tu reserva:\n\n' +
      `Fecha: ${session.data.selected_date}\n` +
      `Hora: ${selectedTime}\n\n` +
      '¿Es correcta esta información?\n' +
      'Responde SI para confirmar o NO para cancelar.';

    await this.sendMessage(phone, message);
    sessionService.updateState(phone, 'confirming');
  },

  async handleConfirmation(phone: string, body: string): Promise<void> {
    const response = body.toLowerCase();

    if (response === 'si' || response === 'sí') {
      const message =
        '✅ ¡Tu reserva ha sido confirmada!\n\n' +
        'Te enviaremos un recordatorio antes de tu cita.\n\n' +
        'Gracias por usar nuestro servicio. 😊';

      await this.sendMessage(phone, message);
      sessionService.updateState(phone, 'completed');

      setTimeout(() => {
        sessionService.endSession(phone);
      }, 5000);

    } else if (response === 'no') {
      await this.sendMessage(
        phone,
        'Reserva cancelada. Escribe "inicio" si deseas agendar de nuevo.'
      );
      sessionService.resetSession(phone);

    } else {
      await this.sendMessage(
        phone,
        'Por favor responde SI para confirmar o NO para cancelar.'
      );
    }
  },

  async sendReminder(
    phone: string,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<void> {
    const message =
      '🔔 Recordatorio de tu cita\n\n' +
      `Fecha: ${appointmentDate}\n` +
      `Hora: ${appointmentTime}\n\n` +
      'Te esperamos!';

    await this.sendMessage(phone, message);
  },

  async sendConfirmation(
    phone: string,
    appointmentDate: string,
    appointmentTime: string,
    employeeName: string
  ): Promise<void> {
    const message =
      '✅ Confirmación de reserva\n\n' +
      `Profesional: ${employeeName}\n` +
      `Fecha: ${appointmentDate}\n` +
      `Hora: ${appointmentTime}\n\n` +
      'Nos vemos pronto!';

    await this.sendMessage(phone, message);
  },

  async sendCancellation(
    phone: string,
    appointmentDate: string,
    appointmentTime: string
  ): Promise<void> {
    const message =
      '❌ Tu cita ha sido cancelada\n\n' +
      `Fecha: ${appointmentDate}\n` +
      `Hora: ${appointmentTime}\n\n` +
      'Puedes agendar una nueva cuando quieras.';

    await this.sendMessage(phone, message);
  },
};
