import { Router } from 'express';
import { ServiceController, createServiceSchema, updateServiceSchema } from '../controllers/service.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';

const router = Router();
const serviceController = new ServiceController();

router.use(authenticate);

router.post('/', validate(createServiceSchema), serviceController.create);
router.get('/', serviceController.getAll);
router.get('/:id', serviceController.getById);
router.put('/:id', validate(updateServiceSchema), serviceController.update);
router.delete('/:id', serviceController.delete);

export default router;