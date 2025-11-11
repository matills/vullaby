import winston from 'winston';
import { config } from '../config/env';
import { LOGGER_CONFIG } from '../constants';

const logLevel = config.env === 'production' ? 'info' : 'debug';

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    const filteredMeta = Object.keys(meta).reduce((acc, key) => {
      if (key !== 'service' && key !== 'timestamp' && key !== 'level') {
        acc[key] = meta[key];
      }
      return acc;
    }, {} as Record<string, any>);
    
    if (Object.keys(filteredMeta).length > 0) {
      log += ` ${JSON.stringify(filteredMeta)}`;
    }
    
    return log;
  })
);

const logger = winston.createLogger({
  level: logLevel,
  format: config.env === 'production' ? productionFormat : developmentFormat,
  defaultMeta: { service: 'lina-backend' },
  transports: [
    new winston.transports.Console(),
  ],
});

if (config.env === 'production') {
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: LOGGER_CONFIG.MAX_FILE_SIZE,
      maxFiles: LOGGER_CONFIG.MAX_FILES,
    })
  );
  
  logger.add(
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: LOGGER_CONFIG.MAX_FILE_SIZE,
      maxFiles: LOGGER_CONFIG.MAX_FILES,
    })
  );
}

interface LogContext {
  businessId?: string;
  userId?: string;
  customerId?: string;
  appointmentId?: string;
  phone?: string;
  [key: string]: any;
}

class StructuredLogger {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  info(message: string, context?: LogContext) {
    this.logger.info(message, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    const errorData = error instanceof Error 
      ? { error: error.message, stack: error.stack }
      : { error };
    
    this.logger.error(message, { ...context, ...errorData });
  }

  warn(message: string, context?: LogContext) {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: LogContext) {
    this.logger.debug(message, context);
  }

  appointment(action: string, appointmentId: string, context?: LogContext) {
    this.logger.info(`Appointment ${action}`, {
      action,
      appointmentId,
      ...context,
    });
  }

  whatsapp(action: string, phone: string, context?: LogContext) {
    this.logger.info(`WhatsApp ${action}`, {
      action,
      phone,
      ...context,
    });
  }

  auth(action: string, userId: string, context?: LogContext) {
    this.logger.info(`Auth ${action}`, {
      action,
      userId,
      ...context,
    });
  }

  business(action: string, businessId: string, context?: LogContext) {
    this.logger.info(`Business ${action}`, {
      action,
      businessId,
      ...context,
    });
  }
}

export default new StructuredLogger(logger);