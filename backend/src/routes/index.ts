
import { Router } from 'express';
import appointmentRoutes from './appointment.routes';
import availabilityRoutes from './availability.routes';
import businessRoutes from './business.routes';
import employeeRoutes from './employee.routes';
import whatsappRoutes from './whatsapp.routes';

const router = Router();

router.use('/appointments', appointmentRoutes);
router.use('/availability', availabilityRoutes);
router.use('/businesses', businessRoutes);
router.use('/employees', employeeRoutes);
router.use('/whatsapp', whatsappRoutes);

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
