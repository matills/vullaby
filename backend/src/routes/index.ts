/**
 * Routes Barrel File
 *
 * Exporta todas las rutas de la aplicación
 * para facilitar su registro en el servidor principal.
 *
 * Ejemplo de uso:
 * import routes from './routes';
 * app.use('/api', routes);
 */

import { Router } from 'express';
import appointmentRoutes from './appointment.routes';
import availabilityRoutes from './availability.routes';
import whatsappRoutes from './whatsapp.routes';

const router = Router();

// Register API routes
router.use('/appointments', appointmentRoutes);
router.use('/availability', availabilityRoutes);
router.use('/whatsapp', whatsappRoutes);

// Health check for API
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
