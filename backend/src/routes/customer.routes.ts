import { Router } from 'express';
import { customerController } from '../controllers';

const router: Router = Router();

router.get('/search', customerController.search);

router.get('/phone/:phone', customerController.getByPhone);

router.get('/:id', customerController.getById);

router.get('/:id/history', customerController.getHistory);

router.post('/', customerController.create);

router.patch('/:id', customerController.update);

router.delete('/:id', customerController.delete);

export default router;
