import Queue from 'bull';
import { config } from './env';
import logger from '../utils/logger';

let reminderQueue: Queue.Queue | null = null;
let notificationQueue: Queue.Queue | null = null;
let redisAvailable = false;
let connectionAttempted = false;
let errorLogged = false;

const createQueue = async (name: string, options: any): Promise<Queue.Queue | null> => {
  try {
    const queue = new Queue(name, {
      redis: {
        host: config.redis.host,
        port: config.redis.port,
      },
      ...options,
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 3000);

      queue.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      queue.isReady().then(() => {
        clearTimeout(timeout);
        resolve();
      }).catch(reject);
    });

    queue.on('error', (error) => {
      if (redisAvailable && !errorLogged) {
        logger.error(`${name} queue error:`, error.message);
        redisAvailable = false;
      }
    });

    return queue;
  } catch (error: any) {
    return null;
  }
};

const initializeQueues = async () => {
  if (connectionAttempted) return;
  connectionAttempted = true;

  try {
    reminderQueue = await createQueue('appointment-reminders', {
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

    notificationQueue = await createQueue('notifications', {
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    });

    if (reminderQueue && notificationQueue) {
      redisAvailable = true;
      logger.info('✅ Bull queues connected to Redis');
    } else {
      if (!errorLogged) {
        logger.warn('⚠️  Redis unavailable - Running without job scheduling');
        errorLogged = true;
      }
    }
  } catch (error: any) {
    if (!errorLogged) {
      logger.warn(`⚠️  Redis unavailable - Running without job scheduling`);
      errorLogged = true;
    }
    reminderQueue = null;
    notificationQueue = null;
    redisAvailable = false;
  }
};

initializeQueues();

export { reminderQueue, notificationQueue };