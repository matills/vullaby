import { WhatsAppSession, ConversationState, SessionData } from '../models';
import { logger } from '../config/logger';

class SessionStore {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  get(phone: string): WhatsAppSession | null {
    const session = this.sessions.get(phone);

    if (!session) {
      return null;
    }

    const now = new Date();
    const timeDiff = now.getTime() - session.lastActivity.getTime();

    if (timeDiff > this.SESSION_TIMEOUT) {
      logger.info(`Session expired for ${phone}`);
      this.sessions.delete(phone);
      return null;
    }

    return session;
  }

  set(phone: string, session: Partial<WhatsAppSession>): WhatsAppSession {
    const existing = this.sessions.get(phone);

    const newSession: WhatsAppSession = {
      phone,
      state: session.state || existing?.state || 'initial',
      data: { ...(existing?.data || {}), ...(session.data || {}) },
      lastActivity: new Date(),
      business_id: session.business_id || existing?.business_id,
      customer_id: session.customer_id || existing?.customer_id,
    };

    this.sessions.set(phone, newSession);
    logger.info(`Session updated for ${phone}`, { state: newSession.state });

    return newSession;
  }

  updateState(phone: string, state: ConversationState): WhatsAppSession | null {
    const session = this.get(phone);

    if (!session) {
      logger.warn(`Cannot update state: session not found for ${phone}`);
      return null;
    }

    return this.set(phone, { ...session, state });
  }

  updateData(phone: string, data: Partial<SessionData>): WhatsAppSession | null {
    const session = this.get(phone);

    if (!session) {
      logger.warn(`Cannot update data: session not found for ${phone}`);
      return null;
    }

    return this.set(phone, {
      ...session,
      data: { ...session.data, ...data }
    });
  }

  delete(phone: string): boolean {
    const deleted = this.sessions.delete(phone);
    if (deleted) {
      logger.info(`Session deleted for ${phone}`);
    }
    return deleted;
  }

  clear(): void {
    this.sessions.clear();
    logger.info('All sessions cleared');
  }

  getAllSessions(): WhatsAppSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionCount(): number {
    return this.sessions.size;
  }
}

export const sessionStore = new SessionStore();

export const sessionService = {
  getOrCreateSession(phone: string): WhatsAppSession {
    let session = sessionStore.get(phone);

    if (!session) {
      session = sessionStore.set(phone, {
        phone,
        state: 'initial',
        data: {},
      });
      logger.info(`New session created for ${phone}`);
    }

    return session;
  },

  updateState(phone: string, state: ConversationState): WhatsAppSession | null {
    return sessionStore.updateState(phone, state);
  },

  updateData(phone: string, data: Partial<SessionData>): WhatsAppSession | null {
    return sessionStore.updateData(phone, data);
  },

  endSession(phone: string): boolean {
    return sessionStore.delete(phone);
  },

  resetSession(phone: string): WhatsAppSession {
    return sessionStore.set(phone, {
      phone,
      state: 'initial',
      data: {},
    });
  },

  getStats() {
    const sessions = sessionStore.getAllSessions();
    const stateCount = sessions.reduce((acc, session) => {
      acc[session.state] = (acc[session.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions: sessionStore.getSessionCount(),
      stateDistribution: stateCount,
      sessions: sessions.map(s => ({
        phone: s.phone,
        state: s.state,
        lastActivity: s.lastActivity,
      })),
    };
  },
};
