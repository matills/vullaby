import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { whatsappRateLimitMiddleware } from '../middlewares/rate-limit.middleware';

const router = Router();
const whatsappController = new WhatsAppController();

router.post('/whatsapp', whatsappRateLimitMiddleware, whatsappController.webhook);
router.post('/test-message', authenticate, whatsappController.sendTestMessage);

export default router;