import { Request, Response } from 'express';
import { whatsappService } from '../services';
import { IncomingWhatsAppMessageSchema } from '../models';
import { logger } from '../config/logger';

export const whatsappController = {
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
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

      res.status(200).send('OK');

      await whatsappService.handleIncomingMessage(message);

    } catch (error) {
      logger.error('Error in webhook handler:', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  },

  async verifyWebhook(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).send('Webhook endpoint is active');
    } catch (error) {
      logger.error('Error in webhook verification:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  },

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
