import { Intent, IntentType } from './types';

/**
 * IntentDetector - Detects user intent from messages
 * Uses keyword matching and pattern recognition
 */
export class IntentDetector {
  private bookingKeywords = [
    'turno', 'cita', 'agendar', 'reservar', 'quiero', 'necesito',
    'appointment', 'book', 'schedule', 'hora', 'dia'
  ];

  private cancelKeywords = [
    'cancelar', 'eliminar', 'borrar', 'anular', 'quitar',
    'cancel', 'delete', 'remove'
  ];

  private viewKeywords = [
    'mis turnos', 'mis citas', 'ver turnos', 'ver citas',
    'mis reservas', 'próximos turnos', 'próximas citas',
    'my appointments', 'view appointments'
  ];

  private rescheduleKeywords = [
    'cambiar', 'mover', 'reprogramar', 'modificar',
    'reschedule', 'change', 'move'
  ];

  private greetingKeywords = [
    'hola', 'buenos días', 'buenas tardes', 'buenas noches',
    'hello', 'hi', 'hey', 'good morning', 'good afternoon'
  ];

  private helpKeywords = [
    'ayuda', 'help', 'info', 'información', 'cómo', 'como',
    'qué puedes hacer', 'opciones', 'commands'
  ];

  /**
   * Detect user intent from message
   */
  detectIntent(message: string): Intent {
    const lower = message.toLowerCase().trim();

    // Check for help
    if (this.matchesKeywords(lower, this.helpKeywords)) {
      return { type: 'help', confidence: 0.95 };
    }

    // Check for cancellation (high priority)
    if (this.matchesKeywords(lower, this.cancelKeywords)) {
      return { type: 'cancel', confidence: 0.9 };
    }

    // Check for rescheduling
    if (this.matchesKeywords(lower, this.rescheduleKeywords)) {
      return { type: 'reschedule', confidence: 0.85 };
    }

    // Check for viewing appointments
    if (this.matchesKeywords(lower, this.viewKeywords)) {
      return { type: 'view', confidence: 0.9 };
    }

    // Check for booking
    if (this.matchesKeywords(lower, this.bookingKeywords)) {
      return { type: 'book', confidence: 0.8 };
    }

    // Check for greeting
    if (this.matchesKeywords(lower, this.greetingKeywords)) {
      return { type: 'greeting', confidence: 0.7 };
    }

    // Unknown intent
    return { type: 'unknown', confidence: 0.0 };
  }

  /**
   * Check if message contains any of the keywords
   */
  private matchesKeywords(message: string, keywords: string[]): boolean {
    return keywords.some(keyword => {
      // Exact match or word boundary match
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(message) || message.includes(keyword);
    });
  }

  /**
   * Determine if the intent is clear enough to proceed
   */
  isIntentClear(intent: Intent): boolean {
    return intent.confidence >= 0.7;
  }

  /**
   * Get a friendly description of the intent
   */
  getIntentDescription(type: IntentType): string {
    const descriptions: Record<IntentType, string> = {
      book: 'agendar un turno',
      cancel: 'cancelar un turno',
      view: 'ver tus turnos',
      reschedule: 'reprogramar un turno',
      greeting: 'saludar',
      help: 'obtener ayuda',
      unknown: 'algo que no entendí'
    };

    return descriptions[type];
  }
}
