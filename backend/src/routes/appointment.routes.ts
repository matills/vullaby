import { Router } from 'express';
import { appointmentController } from '../controllers';

const router = Router();

/**
 * Appointment Routes
 */

// Get upcoming appointments (must be before /:id)
router.get('/upcoming', appointmentController.getUpcoming);

// Get appointment statistics
router.get('/stats', appointmentController.getStats);

// Query appointments
router.get('/', appointmentController.query);

// Get appointment by ID
router.get('/:id', appointmentController.getById);

// Create appointment
router.post('/', appointmentController.create);

// Update appointment
router.patch('/:id', appointmentController.update);

// Cancel appointment
router.post('/:id/cancel', appointmentController.cancel);

// Confirm appointment
router.post('/:id/confirm', appointmentController.confirm);

// Complete appointment
router.post('/:id/complete', appointmentController.complete);

// Mark as no-show
router.post('/:id/no-show', appointmentController.markNoShow);

// Delete appointment
router.delete('/:id', appointmentController.delete);

export default router;
