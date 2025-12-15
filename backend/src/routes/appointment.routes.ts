import { Router } from 'express';
import { appointmentController } from '../controllers';

const router: Router = Router();


router.get('/upcoming', appointmentController.getUpcoming);

router.get('/stats', appointmentController.getStats);

router.get('/', appointmentController.query);

router.get('/:id', appointmentController.getById);

router.post('/', appointmentController.create);

router.patch('/:id', appointmentController.update);

router.post('/:id/cancel', appointmentController.cancel);

router.post('/:id/confirm', appointmentController.confirm);

router.post('/:id/complete', appointmentController.complete);

router.post('/:id/no-show', appointmentController.markNoShow);

router.delete('/:id', appointmentController.delete);

export default router;
