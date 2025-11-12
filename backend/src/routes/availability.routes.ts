import { Router } from 'express';
import { availabilityController } from '../controllers';

const router = Router();

/**
 * Availability Routes
 */

// Get available time slots
router.get('/slots', availabilityController.getSlots);

// Check availability
router.post('/check', availabilityController.checkAvailability);

// Get next available slot
router.get('/next-available', availabilityController.getNextAvailable);

// Get availability summary
router.get('/summary', availabilityController.getSummary);

// Get availability by employee
router.get('/employee/:employeeId', availabilityController.getByEmployee);

// Create availability
router.post('/', availabilityController.create);

// Update availability
router.patch('/:id', availabilityController.update);

// Delete availability
router.delete('/:id', availabilityController.delete);

export default router;
