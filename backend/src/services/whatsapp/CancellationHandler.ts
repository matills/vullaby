import { SessionService } from '../session.service';
import { AppointmentService } from '../appointment.service';
import { DataExtractor } from './DataExtractor';
import { MessageFormatter } from './MessageFormatter';
import { logger } from '../../config/logger';

/**
 * CancellationHandler - Handles appointment cancellation flow
 */
export class CancellationHandler {
  constructor(
    private sessionService: SessionService,
    private appointmentService: AppointmentService,
    private dataExtractor: DataExtractor,
    private sendMessage: (phone: string, message: string) => Promise<void>
  ) {}

  /**
   * Start cancellation flow
   * Shows user's upcoming appointments
   */
  async startCancellation(phone: string, customerId: string): Promise<void> {
    try {
      logger.info('Starting cancellation flow', { phone, customerId });

      // Get customer's upcoming appointments
      const appointments = await this.appointmentService.getAppointmentsByCustomer(customerId);

      // Filter only upcoming and confirmed appointments
      const now = new Date();
      const upcomingAppointments = appointments.filter(apt => {
        const startTime = new Date(apt.start_time);
        return startTime > now && (apt.status === 'confirmed' || apt.status === 'pending');
      });

      if (upcomingAppointments.length === 0) {
        await this.sendMessage(
          phone,
          'No tienes turnos próximos para cancelar.\n\n' +
          '¿Quieres agendar un turno nuevo? Escribe "agendar".'
        );
        this.sessionService.resetSession(phone);
        return;
      }

      // Show appointments to cancel
      let message = '❌ *Cancelar turno*\n\nTus próximos turnos:\n\n';

      upcomingAppointments.forEach((apt, index) => {
        const date = new Date(apt.start_time);
        const dateStr = date.toLocaleDateString('es', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        });
        const timeStr = date.toLocaleTimeString('es', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });

        message += `${index + 1}. ${dateStr} - ${timeStr}\n`;
        message += `   👤 ${apt.employee_name || 'Por asignar'}\n\n`;
      });

      message += '¿Cuál quieres cancelar? Responde con el número.';

      await this.sendMessage(phone, message);

      // Store appointments in session
      this.sessionService.updateData(phone, { appointments: upcomingAppointments });
      this.sessionService.updateState(phone, 'cancelling');
    } catch (error) {
      logger.error('Error starting cancellation:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error al obtener tus turnos. Por favor intenta de nuevo.'
      );
      this.sessionService.resetSession(phone);
    }
  }

  /**
   * Handle appointment selection for cancellation
   */
  async handleAppointmentSelection(phone: string, message: string): Promise<void> {
    try {
      const session = this.sessionService.getOrCreateSession(phone);
      const appointments = session.data.appointments || [];

      if (appointments.length === 0) {
        await this.sendMessage(phone, 'Error: no hay turnos disponibles.');
        this.sessionService.resetSession(phone);
        return;
      }

      // Extract selection number
      const selection = this.dataExtractor.extractSelection(message, appointments.length);

      if (!selection || selection < 1 || selection > appointments.length) {
        await this.sendMessage(
          phone,
          `Por favor selecciona un número del 1 al ${appointments.length}.`
        );
        return;
      }

      const selectedAppointment = appointments[selection - 1];

      // Ask for confirmation
      const startTime = new Date(selectedAppointment.start_time);
      const [hours, minutes] = [
        startTime.getHours(),
        startTime.getMinutes()
      ];
      const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      const confirmationMessage = MessageFormatter.formatCancellationConfirmation({
        date: startTime,
        time,
        employeeName: selectedAppointment.employee_name || 'Por asignar'
      });

      await this.sendMessage(phone, confirmationMessage);

      // Store selected appointment ID
      this.sessionService.updateData(phone, {
        pending_cancellation_id: selectedAppointment.id
      });
      this.sessionService.updateState(phone, 'confirming_cancellation');
    } catch (error) {
      logger.error('Error handling appointment selection:', error);
      await this.sendMessage(phone, 'Ocurrió un error. Por favor intenta de nuevo.');
    }
  }

  /**
   * Handle cancellation confirmation
   */
  async handleCancellationConfirmation(phone: string, message: string): Promise<void> {
    try {
      const session = this.sessionService.getOrCreateSession(phone);
      const appointmentId = session.data.pending_cancellation_id;

      if (!appointmentId) {
        await this.sendMessage(phone, 'Error: no hay turno seleccionado.');
        this.sessionService.resetSession(phone);
        return;
      }

      // Check for affirmative or negative response
      if (this.dataExtractor.isAffirmative(message)) {
        await this.cancelAppointment(phone, appointmentId);
      } else if (this.dataExtractor.isNegative(message)) {
        await this.sendMessage(
          phone,
          '✅ Tu turno se mantiene.\n\n' +
          'Si necesitas algo más, escribe "ayuda".'
        );
        this.sessionService.resetSession(phone);
      } else {
        await this.sendMessage(
          phone,
          'Por favor responde *Sí* para confirmar la cancelación o *No* para mantener el turno.'
        );
      }
    } catch (error) {
      logger.error('Error handling cancellation confirmation:', error);
      await this.sendMessage(phone, 'Ocurrió un error. Por favor intenta de nuevo.');
    }
  }

  /**
   * Cancel the appointment
   */
  private async cancelAppointment(phone: string, appointmentId: string): Promise<void> {
    try {
      // Cancel the appointment
      await this.appointmentService.cancelAppointment(appointmentId);

      logger.info('Appointment cancelled successfully', { appointmentId });

      // Send success message
      await this.sendMessage(phone, MessageFormatter.formatCancellationSuccess());

      // Reset session
      this.sessionService.resetSession(phone);
    } catch (error) {
      logger.error('Error cancelling appointment:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error al cancelar el turno. Por favor intenta de nuevo o contacta con nosotros.'
      );
      this.sessionService.resetSession(phone);
    }
  }
}
