import { sendWhatsAppMessage } from '../config/twilio';
import { logger } from '../config/logger';
import { sessionService } from './session.service';
import { IncomingWhatsAppMessage } from '../models';
import { customerService } from './customer.service';
import { appointmentService } from './appointment.service';
import { availabilityService } from './availability.service';
import { reminderService } from './reminder.service';
import { parseNaturalDate, isValidAppointmentDate, SUPPORTED_DATE_FORMATS } from '../utils/date-parser';

// TODO: Hacer este valor dinámico basado en el número de WhatsApp del negocio
const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID || '966d6a45-9111-4a42-b618-2f744ebce14a';
const DEFAULT_APPOINTMENT_DURATION = 60; // minutos

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
      // Comandos globales
      if (body.toLowerCase() === 'inicio' || body.toLowerCase() === 'start') {
        sessionService.resetSession(phone);
        await this.handleInitialState(phone, body);
        return;
      }

      const session = sessionService.getOrCreateSession(phone);

      switch (session.state) {
        case 'initial':
          await this.handleInitialState(phone, body);
          break;

        case 'asking_name':
          await this.handleNameInput(phone, body);
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
    // Verificar si el cliente ya existe
    const existingCustomer = await customerService.getCustomerByPhone(phone);

    if (existingCustomer) {
      // Cliente existente - pasar directo a selección de empleado
      sessionService.updateData(phone, {
        customer_name: existingCustomer.name,
        business_id: DEFAULT_BUSINESS_ID
      });

      await this.proceedToEmployeeSelection(phone);
    } else {
      // Cliente nuevo - pedir nombre
      const welcomeMessage =
        '¡Hola! 👋 Bienvenido a nuestro sistema de reservas.\n\n' +
        'Para poder agendarte, primero necesito saber tu nombre.\n' +
        '¿Cómo te llamas?';

      await this.sendMessage(phone, welcomeMessage);
      sessionService.updateState(phone, 'asking_name');
      sessionService.updateData(phone, { business_id: DEFAULT_BUSINESS_ID });
    }
  },

  async handleNameInput(phone: string, body: string): Promise<void> {
    const name = body.trim();

    if (name.length < 2) {
      await this.sendMessage(phone, 'Por favor ingresa un nombre válido.');
      return;
    }

    sessionService.updateData(phone, { customer_name: name });
    await this.proceedToEmployeeSelection(phone);
  },

  async proceedToEmployeeSelection(phone: string): Promise<void> {
    const { employeeService } = await import('./employee.service');
    const session = sessionService.getOrCreateSession(phone);
    const employees = await employeeService.getActiveEmployeesByBusiness(DEFAULT_BUSINESS_ID);

    if (employees.length === 0) {
      await this.sendMessage(phone, 'Lo siento, no hay profesionales disponibles en este momento.');
      sessionService.resetSession(phone);
      return;
    }

    sessionService.updateData(phone, { employees });

    if (employees.length === 1) {
      // Solo un empleado disponible
      const employee = employees[0];
      sessionService.updateData(phone, { employee_id: employee.id, employee_name: employee.name });

      const message =
        `Perfecto ${session.data.customer_name}! Te agendaré con ${employee.name}.\n\n` +
        '¿Para qué fecha te gustaría agendar?\n\n' +
        SUPPORTED_DATE_FORMATS;

      await this.sendMessage(phone, message);
      sessionService.updateState(phone, 'selecting_date');
    } else {
      // Múltiples empleados
      const employeeList = employees
        .map((emp, index) => `${index + 1}. ${emp.name}${emp.role ? ` - ${emp.role}` : ''}`)
        .join('\n');

      const message =
        `Perfecto ${session.data.customer_name}! ¿Con qué profesional te gustaría agendar?\n\n` +
        `${employeeList}\n\n` +
        'Responde con el número de tu preferencia.';

      await this.sendMessage(phone, message);
      sessionService.updateState(phone, 'selecting_employee');
    }
  },

  async handleEmployeeSelection(phone: string, body: string): Promise<void> {
    const session = sessionService.getOrCreateSession(phone);
    const employees = session.data.employees || [];

    const selectedIndex = parseInt(body) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= employees.length) {
      await this.sendMessage(
        phone,
        `Por favor selecciona un número válido del 1 al ${employees.length}.`
      );
      return;
    }

    const selectedEmployee = employees[selectedIndex];
    sessionService.updateData(phone, {
      employee_id: selectedEmployee.id,
      employee_name: selectedEmployee.name
    });

    const message =
      `Perfecto! Te agendaré con ${selectedEmployee.name}.\n\n` +
      '¿Para qué fecha te gustaría agendar?\n\n' +
      SUPPORTED_DATE_FORMATS;

    await this.sendMessage(phone, message);
    sessionService.updateState(phone, 'selecting_date');
  },

  async handleDateSelection(phone: string, body: string): Promise<void> {
    const session = sessionService.getOrCreateSession(phone);

    // Parsear la fecha usando el nuevo parser
    const selectedDate = parseNaturalDate(body);

    if (!selectedDate) {
      await this.sendMessage(
        phone,
        `Formato de fecha incorrecto.\n\n${SUPPORTED_DATE_FORMATS}`
      );
      return;
    }

    // Validar la fecha
    const validation = isValidAppointmentDate(selectedDate);
    if (!validation.valid) {
      await this.sendMessage(phone, validation.error!);
      return;
    }

    // Obtener slots disponibles usando el servicio real
    try {
      const slots = await availabilityService.getAvailableSlots({
        business_id: session.data.business_id || DEFAULT_BUSINESS_ID,
        employee_id: session.data.employee_id,
        date: selectedDate.toISOString(),
        duration: DEFAULT_APPOINTMENT_DURATION
      });

      const availableSlots = slots.filter(slot => slot.available);

      if (availableSlots.length === 0) {
        // No hay horarios disponibles
        await this.sendMessage(
          phone,
          `No hay horarios disponibles para ${this.formatDate(selectedDate)}.\n\n` +
          'Por favor intenta con otra fecha.'
        );
        return;
      }

      // Guardar fecha y slots
      sessionService.updateData(phone, {
        selected_date: selectedDate.toISOString(),
        available_slots: availableSlots
      });

      // Formatear y mostrar los horarios disponibles
      const slotsList = availableSlots
        .slice(0, 10) // Mostrar máximo 10 slots
        .map((slot, index) => {
          const time = new Date(slot.start_time);
          return `${index + 1}. ${this.formatTime(time)}`;
        })
        .join('\n');

      const message =
        `Horarios disponibles para ${this.formatDate(selectedDate)}:\n\n` +
        `${slotsList}\n\n` +
        'Por favor responde con el número de tu horario preferido.';

      await this.sendMessage(phone, message);
      sessionService.updateState(phone, 'selecting_time');

    } catch (error) {
      logger.error('Error getting available slots:', error);
      await this.sendMessage(
        phone,
        'Hubo un error al consultar los horarios disponibles. Por favor intenta de nuevo.'
      );
    }
  },

  async handleTimeSelection(phone: string, body: string): Promise<void> {
    const session = sessionService.getOrCreateSession(phone);
    const availableSlots = session.data.available_slots || [];

    const selectedIndex = parseInt(body) - 1;

    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= availableSlots.length) {
      await this.sendMessage(
        phone,
        `Por favor selecciona un número válido del 1 al ${Math.min(availableSlots.length, 10)}.`
      );
      return;
    }

    const selectedSlot = availableSlots[selectedIndex];
    const startTime = new Date(selectedSlot.start_time);
    const endTime = new Date(selectedSlot.end_time);

    sessionService.updateData(phone, {
      selected_slot: selectedSlot,
      selected_start_time: selectedSlot.start_time,
      selected_end_time: selectedSlot.end_time
    });

    const selectedDate = new Date(session.data.selected_date);
    const message =
      '📋 Confirmación de tu reserva:\n\n' +
      `👤 Profesional: ${session.data.employee_name}\n` +
      `📅 Fecha: ${this.formatDate(selectedDate)}\n` +
      `⏰ Hora: ${this.formatTime(startTime)} - ${this.formatTime(endTime)}\n\n` +
      '¿Es correcta esta información?\n' +
      'Responde SI para confirmar o NO para cancelar.';

    await this.sendMessage(phone, message);
    sessionService.updateState(phone, 'confirming');
  },

  async handleConfirmation(phone: string, body: string): Promise<void> {
    const response = body.toLowerCase();

    if (response === 'si' || response === 'sí' || response === 'yes') {
      const session = sessionService.getOrCreateSession(phone);

      try {
        // 1. Crear o obtener el cliente
        const customer = await customerService.getOrCreateCustomer(
          phone,
          session.data.customer_name
        );

        // 2. Crear la cita en la base de datos
        const appointment = await appointmentService.createAppointment({
          business_id: session.data.business_id || DEFAULT_BUSINESS_ID,
          employee_id: session.data.employee_id!,
          customer_id: customer.id!,
          start_time: session.data.selected_start_time!,
          end_time: session.data.selected_end_time!,
          notes: 'Reserva vía WhatsApp'
        });

        logger.info(`Appointment created via WhatsApp: ${appointment.id}`, {
          customer: customer.id,
          employee: session.data.employee_id,
          start_time: appointment.start_time
        });

        // 3. Programar recordatorios automáticos
        try {
          await reminderService.scheduleReminders(
            appointment.id!,
            phone,
            session.data.customer_name,
            session.data.employee_name!,
            appointment.start_time,
            appointment.end_time
          );
          logger.info(`Reminders scheduled for appointment ${appointment.id}`);
        } catch (reminderError) {
          logger.error('Error scheduling reminders:', reminderError);
          // No fallar la creación de la cita si los recordatorios fallan
        }

        const selectedDate = new Date(session.data.selected_date);
        const startTime = new Date(session.data.selected_start_time!);

        const confirmationMessage =
          '✅ ¡Tu reserva ha sido confirmada!\n\n' +
          `📋 Detalles:\n` +
          `👤 Profesional: ${session.data.employee_name}\n` +
          `📅 Fecha: ${this.formatDate(selectedDate)}\n` +
          `⏰ Hora: ${this.formatTime(startTime)}\n\n` +
          'Te enviaremos un recordatorio antes de tu cita.\n\n' +
          '¡Gracias por confiar en nosotros! 😊';

        await this.sendMessage(phone, confirmationMessage);
        sessionService.updateState(phone, 'completed');

        // Limpiar sesión después de 5 segundos
        setTimeout(() => {
          sessionService.endSession(phone);
        }, 5000);

      } catch (error) {
        logger.error('Error creating appointment:', error);

        let errorMessage = 'Hubo un error al confirmar tu reserva.';

        if (error instanceof Error && error.message.includes('already booked')) {
          errorMessage = 'Lo siento, ese horario ya fue reservado por otra persona. Por favor escribe "inicio" para elegir otro horario.';
        } else {
          errorMessage += ' Por favor intenta de nuevo más tarde o contacta al negocio directamente.';
        }

        await this.sendMessage(phone, errorMessage);
        sessionService.resetSession(phone);
      }

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

  // Utilidades de formateo
  formatDate(date: Date): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName} ${day} de ${month} de ${year}`;
  },

  formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  },
};
