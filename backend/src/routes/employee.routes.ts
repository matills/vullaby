import { Router } from 'express';
import { employeeController } from '../controllers';

const router: Router = Router();


router.get('/search', employeeController.search);

router.get('/', employeeController.getAll);

router.get('/:id', employeeController.getById);

router.get('/:id/availability', employeeController.getAvailability);

router.get('/:id/appointments', employeeController.getAppointments);

router.get('/:id/stats', employeeController.getStats);

router.post('/', employeeController.create);

router.post('/:id/activate', employeeController.activate);

router.post('/:id/deactivate', employeeController.deactivate);

router.patch('/:id', employeeController.update);

router.delete('/:id', employeeController.delete);

export default router;
