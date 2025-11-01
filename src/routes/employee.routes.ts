import { Router } from 'express';
import { 
  EmployeeController, 
  createEmployeeSchema, 
  updateEmployeeSchema, 
  setWorkingHoursSchema,
  toggleStatusSchema
} from '../controllers/employee.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();
const employeeController = new EmployeeController();

router.use(authenticate);

router.post('/', validate(createEmployeeSchema), employeeController.create.bind(employeeController));
router.get('/', employeeController.getAll.bind(employeeController));
router.get('/:id', employeeController.getById.bind(employeeController));
router.put('/:id', validate(updateEmployeeSchema), employeeController.update.bind(employeeController));
router.patch('/:id/status', validate(toggleStatusSchema), employeeController.toggleStatus.bind(employeeController));
router.delete('/:id', employeeController.delete.bind(employeeController));
router.post('/:id/working-hours', validate(setWorkingHoursSchema), employeeController.setWorkingHours.bind(employeeController));
router.get('/:id/working-hours', employeeController.getWorkingHours.bind(employeeController));

export default router;