import { Request, Response, NextFunction } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import logger from '../utils/logger';

const whatsappService = new WhatsAppService();

export class WhatsAppController {
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Webhook received:', req.body);

      const { From, To, Body, ProfileName } = req.body;

      if (!From || !To || !Body) {
        logger.warn('Invalid webhook payload:', req.body);
        return res.status(200).send('OK');
      }

      logger.info(`WhatsApp message from ${From} (${ProfileName}): ${Body}`);

      // Limpiar el prefijo "whatsapp:" de ambos números
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

  async sendTestMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, message } = req.body;

      if (!phone || !message) {
        return res.status(400).json({
          success: false,
          error: 'Phone and message are required',
        });
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