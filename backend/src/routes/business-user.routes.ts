import { Router } from 'express';
import { businessUserController } from '../controllers';

const router: Router = Router();

router.get('/', businessUserController.getAll);

router.get('/:id', businessUserController.getById);

router.get('/business/:businessId', businessUserController.getUsersByBusiness);

router.get('/user/:authId', businessUserController.getBusinessesByUser);

router.get('/check/:authId/:businessId', businessUserController.checkUserAccess);

router.get('/role/:authId/:businessId', businessUserController.getUserRole);

router.post('/', businessUserController.create);

router.patch('/:id', businessUserController.update);

router.delete('/:id', businessUserController.delete);

router.delete('/remove/:authId/:businessId', businessUserController.removeUserFromBusiness);

export default router;
