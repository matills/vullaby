import { Router } from 'express';
import { CustomerController, createCustomerSchema, updateCustomerSchema } from '../controllers/customer.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();
const customerController = new CustomerController();

router.use(authenticate);

router.post('/', validate(createCustomerSchema), customerController.create);
router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.get('/:id/appointments', customerController.getAppointments);
router.put('/:id', validate(updateCustomerSchema), customerController.update);
router.delete('/:id', customerController.delete);

export default router;