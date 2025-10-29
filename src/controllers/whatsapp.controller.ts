import { Request, Response, NextFunction } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import logger from '../utils/logger';

const whatsappService = new WhatsAppService();

export class WhatsAppController {
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { From, Body } = req.body;

      if (!From || !Body) {
        return res.status(400).send('Invalid request');
      }

      logger.info(`Received WhatsApp message from ${From}: ${Body}`);

      await whatsappService.handleIncomingMessage({
        from: From,
        body: Body,
      });

      res.status(200).send('OK');
    } catch (error) {
      logger.error('Webhook error:', error);
      next(error);
    }
  }

  async sendTestMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, message } = req.body;
      
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