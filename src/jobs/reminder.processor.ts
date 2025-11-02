import { Job } from 'bull';
import { reminderQueue } from '../config/queue';
import { supabaseAdmin } from '../config/database';
import { WhatsAppService } from '../services/whatsapp.service';
import logger from '../utils/logger';
import { subHours, addHours, startOfDay, endOfDay } from 'date-fns';

interface ReminderJob {
  appointmentId: string;
  customerPhone: string;
  customerName: string;
  serviceName: string;
  startTime: string;
  businessName: string;
}

const whatsappService = new WhatsAppService();

export const processReminder = async (job: Job<ReminderJob>) => {
  const { appointmentId, customerPhone, customerName, serviceName, startTime, businessName } = job.data;

  try {
    logger.info(`Processing reminder for appointment: ${appointmentId}`);

    const { data: appointment } = await supabaseAdmin
      .from('appointments')
      .select('status, reminder_sent')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      logger.warn(`Appointment ${appointmentId} not found`);
      return;
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      logger.info(`Appointment ${appointmentId} is ${appointment.status}, skipping reminder`);
      return;
    }

    if (appointment.reminder_sent) {
      logger.info(`Reminder already sent for appointment ${appointmentId}`);
      return;
    }

    await whatsappService.sendAppointmentReminder(customerPhone, {
      customerName,
      serviceName,
      startTime: new Date(startTime),
      businessName,
    });

    await supabaseAdmin
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', appointmentId);

    logger.info(`Reminder sent successfully for appointment ${appointmentId}`);
  } catch (error) {
    logger.error(`Failed to send reminder for appointment ${appointmentId}:`, error);
    throw error;
  }
};

if (reminderQueue) {
  reminderQueue.process(5, processReminder);

  reminderQueue.on('completed', (job) => {
    logger.info(`Reminder job ${job.id} completed`);
  });

  reminderQueue.on('failed', (job, err) => {
    logger.error(`Reminder job ${job?.id} failed:`, err);
  });
}

export const scheduleReminder = async (appointmentData: {
  id: string;
  customerId: string;
  serviceId: string;
  startTime: Date;
  businessId: string;
}) => {
  if (!reminderQueue) {
    logger.warn('Reminder queue not available, skipping reminder scheduling');
    return;
  }

  try {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('name, phone')
      .eq('id', appointmentData.customerId)
      .single();

    const { data: service } = await supabaseAdmin
      .from('services')
      .select('name')
      .eq('id', appointmentData.serviceId)
      .single();

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('name')
      .eq('id', appointmentData.businessId)
      .single();

    if (!customer || !service || !business) {
      logger.warn(`Missing data for reminder: appointment ${appointmentData.id}`);
      return;
    }

    const reminderTime = subHours(appointmentData.startTime, 24);
    const now = new Date();

    if (reminderTime <= now) {
      logger.info(`Reminder time passed for appointment ${appointmentData.id}, skipping`);
      return;
    }

    const delay = reminderTime.getTime() - now.getTime();

    await reminderQueue.add(
      {
        appointmentId: appointmentData.id,
        customerPhone: customer.phone,
        customerName: customer.name,
        serviceName: service.name,
        startTime: appointmentData.startTime.toISOString(),
        businessName: business.name,
      },
      {
        delay,
        jobId: `reminder-${appointmentData.id}`,
      }
    );

    logger.info(`Reminder scheduled for appointment ${appointmentData.id} at ${reminderTime.toISOString()}`);
  } catch (error) {
    logger.error(`Failed to schedule reminder for appointment ${appointmentData.id}:`, error);
  }
};

export const cancelReminder = async (appointmentId: string) => {
  if (!reminderQueue) {
    return;
  }

  try {
    const job = await reminderQueue.getJob(`reminder-${appointmentId}`);
    if (job) {
      await job.remove();
      logger.info(`Reminder cancelled for appointment ${appointmentId}`);
    }
  } catch (error) {
    logger.error(`Failed to cancel reminder for appointment ${appointmentId}:`, error);
  }
};

export const scanAndSchedulePendingReminders = async () => {
  if (!reminderQueue) {
    logger.warn('Reminder queue not available, skipping scan');
    return;
  }

  try {
    logger.info('Scanning for pending reminders...');

    const tomorrow = addHours(new Date(), 24);
    const startRange = startOfDay(tomorrow);
    const endRange = endOfDay(tomorrow);

    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        id,
        customer_id,
        service_id,
        business_id,
        start_time,
        reminder_sent
      `)
      .in('status', ['pending', 'confirmed'])
      .eq('reminder_sent', false)
      .gte('start_time', startRange.toISOString())
      .lte('start_time', endRange.toISOString());

    if (!appointments || appointments.length === 0) {
      logger.info('No pending reminders found');
      return;
    }

    logger.info(`Found ${appointments.length} appointments needing reminders`);

    for (const apt of appointments) {
      await scheduleReminder({
        id: apt.id,
        customerId: apt.customer_id,
        serviceId: apt.service_id,
        startTime: new Date(apt.start_time),
        businessId: apt.business_id,
      });
    }

    logger.info('Pending reminders scan completed');
  } catch (error) {
    logger.error('Failed to scan pending reminders:', error);
  }
};