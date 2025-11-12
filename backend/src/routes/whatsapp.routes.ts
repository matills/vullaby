import { Router } from 'express';
import { whatsappController } from '../controllers';

const router = Router();

/**
 * WhatsApp Webhook Routes
 */

// Webhook endpoint for incoming messages
router.post('/webhook', whatsappController.handleWebhook);

// Webhook verification (GET)
router.get('/webhook', whatsappController.verifyWebhook);

// Test endpoint
router.post('/test', whatsappController.sendTestMessage);

// Status endpoint
router.get('/status', whatsappController.getStatus);

export default router;
