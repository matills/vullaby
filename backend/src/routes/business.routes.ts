import { Router } from 'express';
import { businessController } from '../controllers';

const router: Router = Router();


router.get('/search', businessController.search);

router.get('/', businessController.getAll);

router.get('/:id', businessController.getById);

router.get('/:id/employees', businessController.getEmployees);

router.get('/:id/appointments', businessController.getAppointments);

router.get('/:id/stats', businessController.getStats);

router.post('/', businessController.create);

router.patch('/:id', businessController.update);

router.delete('/:id', businessController.delete);

export default router;
