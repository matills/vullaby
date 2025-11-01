import cron from 'node-cron';
import { scanAndSchedulePendingReminders } from './reminder.processor';
import logger from '../utils/logger';

export const startCronJobs = () => {
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running scheduled reminder scan');
    try {
      await scanAndSchedulePendingReminders();
    } catch (error) {
      logger.error('Cron job failed:', error);
    }
  });

  logger.info('Cron jobs started: reminder scan every 6 hours');
};