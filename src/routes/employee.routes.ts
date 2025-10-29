import { Router } from 'express';
import { EmployeeController, createEmployeeSchema, updateEmployeeSchema, setWorkingHoursSchema } from '../controllers/employee.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();
const employeeController = new EmployeeController();

router.use(authenticate);

router.post('/', validate(createEmployeeSchema), employeeController.create);
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getById);
router.put('/:id', validate(updateEmployeeSchema), employeeController.update);
router.patch('/:id/status', employeeController.toggleStatus);
router.delete('/:id', employeeController.delete);
router.post('/:id/working-hours', validate(setWorkingHoursSchema), employeeController.setWorkingHours);
router.get('/:id/working-hours', employeeController.getWorkingHours);

export default router;