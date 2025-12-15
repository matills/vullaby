import { Router } from 'express';
import { whatsappController } from '../controllers';

const router: Router = Router();


router.post('/webhook', whatsappController.handleWebhook);

router.get('/webhook', whatsappController.verifyWebhook);

router.post('/test', whatsappController.sendTestMessage);

router.get('/status', whatsappController.getStatus);

export default router;
