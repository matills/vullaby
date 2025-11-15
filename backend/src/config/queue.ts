import Bull from 'bull';
import { logger } from './logger';

// Configuración de Redis (usando variables de entorno)
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

const redisConfig = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Crear queues
export const reminderQueue = new Bull('appointment-reminders', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Event listeners para logging
reminderQueue.on('error', (error) => {
  logger.error('Queue error:', error);
});

reminderQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

reminderQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`);
});

reminderQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

logger.info('Queue initialized successfully');

export default reminderQueue;
