import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import logger from './utils/logger';

import authRoutes from './routes/auth.routes';
import appointmentRoutes from './routes/appointment.routes';
import webhookRoutes from './routes/webhook.routes';
import serviceRoutes from './routes/service.routes';
import customerRoutes from './routes/customer.routes';
import employeeRoutes from './routes/employee.routes';

validateConfig();

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: config.frontend.url,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`🚀 Lina server running on port ${config.port}`);
  logger.info(`📱 Environment: ${config.env}`);
});