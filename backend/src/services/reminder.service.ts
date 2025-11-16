import { reminderQueue } from '../config/queue';
import { logger } from '../config/logger';
import { appointmentService } from './appointment.service';
import { MessageFormatter } from './whatsapp/MessageFormatter';

export interface ReminderJobData {
  appointmentId: string;
  customerPhone: string;
  customerName?: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  reminderType: '24h' | '2h';
}

export const reminderService = {
  /**
   * Programa recordatorios para una cita
   * - 24 horas antes
   * - 2 horas antes
   */
  async scheduleReminders(
    appointmentId: string,
    customerPhone: string,
    customerName: string | undefined,
    employeeName: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    try {
      const appointmentDate = new Date(startTime);
      const now = new Date();

      // Recordatorio 24 horas antes
      const reminder24h = new Date(appointmentDate);
      reminder24h.setHours(reminder24h.getHours() - 24);

      if (reminder24h > now) {
        const delay = reminder24h.getTime() - now.getTime();

        await reminderQueue.add(
          {
            appointmentId,
            customerPhone,
            customerName,
            employeeName,
            startTime,
            endTime,
            reminderType: '24h',
          } as ReminderJobData,
          {
            delay,
            jobId: `${appointmentId}-24h`,
          }
        );

        logger.info(`Scheduled 24h reminder for appointment ${appointmentId} at ${reminder24h}`);
      }

      // Recordatorio 2 horas antes
      const reminder2h = new Date(appointmentDate);
      reminder2h.setHours(reminder2h.getHours() - 2);

      if (reminder2h > now) {
        const delay = reminder2h.getTime() - now.getTime();

        await reminderQueue.add(
          {
            appointmentId,
            customerPhone,
            customerName,
            employeeName,
            startTime,
            endTime,
            reminderType: '2h',
          } as ReminderJobData,
          {
            delay,
            jobId: `${appointmentId}-2h`,
          }
        );

        logger.info(`Scheduled 2h reminder for appointment ${appointmentId} at ${reminder2h}`);
      }
    } catch (error) {
      logger.error('Error scheduling reminders:', error);
      throw error;
    }
  },

  /**
   * Cancela todos los recordatorios de una cita
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    try {
      // Buscar y eliminar jobs por ID
      const job24h = await reminderQueue.getJob(`${appointmentId}-24h`);
      if (job24h) {
        await job24h.remove();
        logger.info(`Cancelled 24h reminder for appointment ${appointmentId}`);
      }

      const job2h = await reminderQueue.getJob(`${appointmentId}-2h`);
      if (job2h) {
        await job2h.remove();
        logger.info(`Cancelled 2h reminder for appointment ${appointmentId}`);
      }
    } catch (error) {
      logger.error('Error cancelling reminders:', error);
      throw error;
    }
  },

  /**
   * Procesa un recordatorio (envía el mensaje de WhatsApp)
   */
  async processReminder(data: ReminderJobData): Promise<void> {
    try {
      // Verificar que la cita aún esté activa
      const appointment = await appointmentService.getAppointmentById(data.appointmentId);

      if (!appointment) {
        logger.warn(`Appointment ${data.appointmentId} not found, skipping reminder`);
        return;
      }

      if (appointment.status === 'cancelled') {
        logger.info(`Appointment ${data.appointmentId} is cancelled, skipping reminder`);
        return;
      }

      const startTime = new Date(data.startTime);
      const endTime = new Date(data.endTime);

      // Formatear mensaje según el tipo de recordatorio
      let message = '';

      if (data.reminderType === '24h') {
        message =
          '🔔 Recordatorio: Mañana tienes una cita\n\n' +
          `👤 Profesional: ${data.employeeName}\n` +
          `📅 Fecha: ${MessageFormatter.formatDatePublic(startTime)}\n` +
          `⏰ Hora: ${MessageFormatter.formatTimePublic(startTime)} - ${MessageFormatter.formatTimePublic(endTime)}\n\n` +
          'Te esperamos!';
      } else {
        message =
          '⏰ Tu cita es en 2 horas!\n\n' +
          `👤 Profesional: ${data.employeeName}\n` +
          `📅 Fecha: ${MessageFormatter.formatDatePublic(startTime)}\n` +
          `⏰ Hora: ${MessageFormatter.formatTimePublic(startTime)} - ${MessageFormatter.formatTimePublic(endTime)}\n\n` +
          'Nos vemos pronto!';
      }

      // Lazy load whatsappService to avoid circular dependency
      const { whatsappService } = await import('./whatsapp.service');

      // Enviar mensaje por WhatsApp
      await whatsappService.sendMessage(data.customerPhone, message);

      logger.info(`Reminder sent to ${data.customerPhone} for appointment ${data.appointmentId}`);
    } catch (error) {
      logger.error('Error processing reminder:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas de la queue
   */
  async getQueueStats() {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        reminderQueue.getWaitingCount(),
        reminderQueue.getActiveCount(),
        reminderQueue.getCompletedCount(),
        reminderQueue.getFailedCount(),
        reminderQueue.getDelayedCount(),
      ]);

      return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
      };
    } catch (error) {
      logger.error('Error getting queue stats:', error);
      throw error;
    }
  },
};

// Worker para procesar los recordatorios
reminderQueue.process(async (job) => {
  logger.info(`Processing reminder job ${job.id}`, job.data);
  await reminderService.processReminder(job.data);
});
