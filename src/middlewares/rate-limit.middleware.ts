import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from '../config/env';
import logger from '../utils/logger';

let redis: Redis | null = null;

try {
  redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis max retries reached, disabling Redis features');
        return null;
      }
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => {
    logger.error('Redis connection error:', err.message);
  });

  redis.on('connect', () => {
    logger.info('Redis connected successfully');
  });

  redis.connect().catch((err) => {
    logger.warn(`Redis connection failed: ${err.message}. Rate limiting will be disabled.`);
    redis = null;
  });
} catch (error) {
  logger.warn('Failed to initialize Redis. Rate limiting will be disabled.');
  redis = null;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async isRateLimited(identifier: string): Promise<{ limited: boolean; remaining: number }> {
    if (!redis) {
      return { limited: false, remaining: this.config.maxRequests };
    }

    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      await redis.zremrangebyscore(key, 0, windowStart);
      
      const requestCount = await redis.zcard(key);
      
      if (requestCount >= this.config.maxRequests) {
        return { 
          limited: true, 
          remaining: 0 
        };
      }

      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(this.config.windowMs / 1000));

      return { 
        limited: false, 
        remaining: this.config.maxRequests - requestCount - 1 
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      return { limited: false, remaining: this.config.maxRequests };
    }
  }

  async reset(identifier: string): Promise<void> {
    if (!redis) return;
    
    const key = `${this.config.keyPrefix}:${identifier}`;
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Failed to reset rate limit:', error);
    }
  }
}

export const whatsappRateLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: 'ratelimit:whatsapp',
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100,
  keyPrefix: 'ratelimit:api',
});

export const whatsappRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const phone = req.body.From?.replace('whatsapp:', '').replace(/\D/g, '');
    
    if (!phone) {
      return next();
    }

    const { limited, remaining } = await whatsappRateLimiter.isRateLimited(phone);

    if (limited) {
      logger.warn(`Rate limit exceeded for phone: ${phone}`);
      return res.status(200).send('OK');
    }

    logger.info(`WhatsApp rate limit: ${remaining} remaining for ${phone}`);
    next();
  } catch (error) {
    logger.error('Rate limit middleware error:', error);
    next();
  }
};

export { redis };