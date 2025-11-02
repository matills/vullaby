import { redis } from '../../middlewares/rate-limit.middleware';
import logger from '../../utils/logger';

export type ConversationState = 'idle' | 'awaiting_service' | 'awaiting_slot' | 'awaiting_cancellation';

export interface ConversationContext {
  state: ConversationState;
  businessId?: string;
  customerId?: string;
  selectedServiceId?: string;
  availableSlots?: any[];
  pendingAppointments?: any[];
  lastMessageAt?: number;
}

export class ConversationManager {
  private readonly TTL = 3600;
  private readonly PREFIX = 'conversation';
  private memoryStore = new Map<string, ConversationContext>();

  private getKey(phone: string): string {
    return `${this.PREFIX}:${phone}`;
  }

  async get(phone: string): Promise<ConversationContext> {
    try {
      if (!redis) {
        return this.memoryStore.get(phone) || { state: 'idle', lastMessageAt: Date.now() };
      }

      const key = this.getKey(phone);
      const data = await redis.get(key);

      if (!data) {
        return { state: 'idle', lastMessageAt: Date.now() };
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to get conversation context:', error);
      return this.memoryStore.get(phone) || { state: 'idle', lastMessageAt: Date.now() };
    }
  }

  async set(phone: string, context: ConversationContext): Promise<void> {
    try {
      context.lastMessageAt = Date.now();
      
      if (!redis) {
        this.memoryStore.set(phone, context);
        return;
      }

      const key = this.getKey(phone);
      await redis.setex(key, this.TTL, JSON.stringify(context));
    } catch (error) {
      logger.error('Failed to set conversation context:', error);
      this.memoryStore.set(phone, context);
    }
  }

  async reset(phone: string): Promise<void> {
    try {
      if (!redis) {
        this.memoryStore.delete(phone);
        return;
      }

      const key = this.getKey(phone);
      await redis.del(key);
    } catch (error) {
      logger.error('Failed to reset conversation context:', error);
      this.memoryStore.delete(phone);
    }
  }

  async isExpired(phone: string, maxIdleMinutes: number = 30): Promise<boolean> {
    const context = await this.get(phone);
    if (!context.lastMessageAt) return false;
    
    const idleTime = Date.now() - context.lastMessageAt;
    return idleTime > maxIdleMinutes * 60 * 1000;
  }
}