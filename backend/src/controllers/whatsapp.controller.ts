import { Request, Response } from 'express';
import { whatsappService } from '../services';
import { IncomingWhatsAppMessageSchema } from '../models';
import { logger } from '../config/logger';

/**
 * WhatsApp webhook controller
 */
export const whatsappController = {
  /**
   * Handle incoming WhatsApp messages (webhook)
   * POST /webhooks/whatsapp
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Validate incoming message
      const validationResult = IncomingWhatsAppMessageSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.error('Invalid webhook payload:', validationResult.error);
        res.status(400).json({
          success: false,
          error: 'Invalid payload',
          details: validationResult.error.issues,
        });
        return;
      }

      const message = validationResult.data;

      // Respond immediately to Twilio (required)
      res.status(200).send('OK');

      // Process message asynchronously
      await whatsappService.handleIncomingMessage(message);

    } catch (error) {
      logger.error('Error in webhook handler:', error);

      // If we haven't sent a response yet, send error
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  },

  /**
   * Webhook verification (GET request from Twilio)
   * GET /webhooks/whatsapp
   */
  async verifyWebhook(_req: Request, res: Response): Promise<void> {
    try {
      // Twilio doesn't use this for WhatsApp, but keeping for completeness
      res.status(200).send('Webhook endpoint is active');
    } catch (error) {
      logger.error('Error in webhook verification:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

  /**
   * Send a test message
   * POST /webhooks/whatsapp/test
   */
  async sendTestMessage(req: Request, res: Response): Promise<void> {
    try {
      const { to, message } = req.body;

      if (!to || !message) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: to, message',
        });
        return;
      }

      await whatsappService.sendMessage(to, message);

      res.json({
        success: true,
        message: 'Test message sent successfully',
      });
    } catch (error) {
      logger.error('Error sending test message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
      });
    }
  },

  /**
   * Get webhook status
   * GET /webhooks/whatsapp/status
   */
  async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const { sessionService } = await import('../services');
      const stats = sessionService.getStats();

      res.json({
        success: true,
        data: {
          status: 'active',
          timestamp: new Date().toISOString(),
          ...stats,
        },
      });
    } catch (error) {
      logger.error('Error getting webhook status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get status',
      });
    }
  },
};
