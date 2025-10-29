import { Router } from 'express';
import { AppointmentController, createAppointmentSchema, getAvailabilitySchema, updateStatusSchema } from '../controllers/appointment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();
const appointmentController = new AppointmentController();

router.use(authenticate);

router.post('/', validate(createAppointmentSchema), appointmentController.create);
router.get('/availability', validate(getAvailabilitySchema), appointmentController.getAvailability);
router.get('/', appointmentController.getAll);
router.get('/:id', appointmentController.getById);
router.patch('/:id/status', validate(updateStatusSchema), appointmentController.updateStatus);
router.delete('/:id', appointmentController.cancel);

export default router;