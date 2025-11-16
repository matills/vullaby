import { SessionService } from '../session.service';
import { AppointmentService } from '../appointment.service';
import { MessageFormatter } from './MessageFormatter';
import { logger } from '../../config/logger';

/**
 * ViewHandler - Handles viewing user's appointments
 */
export class ViewHandler {
  constructor(
    private sessionService: SessionService,
    private appointmentService: AppointmentService,
    private sendMessage: (phone: string, message: string) => Promise<void>
  ) {}

  /**
   * Show user's upcoming appointments
   */
  async showAppointments(phone: string, customerId: string): Promise<void> {
    try {
      logger.info('Showing appointments', { phone, customerId });

      // Get customer's appointments
      const appointments = await this.appointmentService.getAppointmentsByCustomer(customerId);

      // Filter upcoming appointments
      const now = new Date();
      const upcomingAppointments = appointments.filter(apt => {
        const startTime = new Date(apt.start_time);
        return startTime > now;
      });

      // Sort by start time
      upcomingAppointments.sort((a, b) => {
        const dateA = new Date(a.start_time);
        const dateB = new Date(b.start_time);
        return dateA.getTime() - dateB.getTime();
      });

      // Format and send message
      const message = MessageFormatter.formatAppointmentList(upcomingAppointments);
      await this.sendMessage(phone, message);

      // Reset session
      this.sessionService.resetSession(phone);
    } catch (error) {
      logger.error('Error showing appointments:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error al obtener tus turnos. Por favor intenta de nuevo.'
      );
      this.sessionService.resetSession(phone);
    }
  }
}
