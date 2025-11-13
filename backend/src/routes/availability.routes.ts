import { Router } from 'express';
import { availabilityController } from '../controllers';

const router = Router();


router.get('/slots', availabilityController.getSlots);

router.post('/check', availabilityController.checkAvailability);

router.get('/next-available', availabilityController.getNextAvailable);

router.get('/summary', availabilityController.getSummary);

router.get('/employee/:employeeId', availabilityController.getByEmployee);

router.post('/', availabilityController.create);

router.patch('/:id', availabilityController.update);

router.delete('/:id', availabilityController.delete);

export default router;
