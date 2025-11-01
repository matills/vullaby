import { Request, Response, NextFunction } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { ValidationError } from '../middlewares/error.middleware';
import logger from '../utils/logger';
import { z } from 'zod';

const whatsappService = new WhatsAppService();

export const sendTestMessageSchema = z.object({
  body: z.object({
    phone: z.string().min(10).max(20),
    message: z.string().min(1),
  }),
});

export class WhatsAppController {
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Webhook received:', req.body);

      const { From, To, Body, ProfileName } = req.body;

      if (!From || !To || !Body) {
        logger.warn('Invalid webhook payload:', req.body);
        res.status(200).send('OK');
        return;
      }

      logger.info(`WhatsApp message from ${From} (${ProfileName}): ${Body}`);

      const cleanFrom = From.replace('whatsapp:', '');
      const cleanTo = To.replace('whatsapp:', '');

      await whatsappService.handleIncomingMessage({
        from: cleanFrom,
        to: cleanTo,
        body: Body,
      });

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Webhook error:', error);
      res.status(200).send('OK');
    }
  }

  async sendTestMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        throw new ValidationError('Phone and message are required');
      }
      
      const result = await whatsappService.sendMessage(phone, message);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}