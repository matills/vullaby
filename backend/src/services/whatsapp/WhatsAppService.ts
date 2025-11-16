import { sendWhatsAppMessage } from '../../config/twilio';
import { logger } from '../../config/logger';
import { sessionService } from '../session.service';
import { customerService } from '../customer.service';
import { employeeService } from '../employee.service';
import { appointmentService } from '../appointment.service';
import { availabilityService } from '../availability.service';
import { IncomingWhatsAppMessage } from '../../models';
import { IntentDetector } from './IntentDetector';
import { DataExtractor } from './DataExtractor';
import { ValidationService } from './ValidationService';
import { MessageFormatter } from './MessageFormatter';
import { BookingHandler } from './BookingHandler';
import { CancellationHandler } from './CancellationHandler';
import { ViewHandler } from './ViewHandler';

// TODO: Remove this once multi-tenancy is implemented
const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID || '966d6a45-9111-4a42-b618-2f744ebce14a';

/**
 * WhatsAppService - Main orchestrator for WhatsApp conversation flow
 * Uses modular handlers for different intents
 */
export class WhatsAppService {
  private intentDetector: IntentDetector;
  private dataExtractor: DataExtractor;
  private validationService: ValidationService;
  private bookingHandler: BookingHandler;
  private cancellationHandler: CancellationHandler;
  private viewHandler: ViewHandler;

  constructor() {
    this.intentDetector = new IntentDetector();
    this.dataExtractor = new DataExtractor();
    this.validationService = new ValidationService();

    // Initialize handlers
    this.bookingHandler = new BookingHandler(
      sessionService,
      customerService,
      employeeService,
      appointmentService,
      availabilityService,
      this.dataExtractor,
      this.validationService,
      this.sendMessage.bind(this)
    );

    this.cancellationHandler = new CancellationHandler(
      sessionService,
      appointmentService,
      this.dataExtractor,
      this.sendMessage.bind(this)
    );

    this.viewHandler = new ViewHandler(
      sessionService,
      appointmentService,
      this.sendMessage.bind(this)
    );
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(to: string, message: string): Promise<void> {
    try {
      await sendWhatsAppMessage(to, message);
      logger.info(`Message sent to ${to}`);
    } catch (error) {
      logger.error(`Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(message: IncomingWhatsAppMessage): Promise<void> {
    const phone = message.From;
    const body = message.Body.trim();

    logger.info(`Incoming message from ${phone}: ${body}`);

    try {
      // Check for global commands first
      if (await this.handleGlobalCommands(phone, body)) {
        return;
      }

      // Get or create session
      const session = sessionService.getOrCreateSession(phone);

      // Handle based on current state
      switch (session.state) {
        case 'initial':
        case 'intent_detected':
          await this.handleInitialState(phone, body);
          break;

        case 'collecting_data':
          await this.bookingHandler.handleDataCollection(phone, body);
          break;

        case 'confirming':
          await this.bookingHandler.handleConfirmation(phone, body);
          break;

        case 'cancelling':
          await this.cancellationHandler.handleAppointmentSelection(phone, body);
          break;

        case 'confirming_cancellation':
          await this.cancellationHandler.handleCancellationConfirmation(phone, body);
          break;

        case 'viewing':
          // After viewing, reset to initial
          sessionService.resetSession(phone);
          await this.handleInitialState(phone, body);
          break;

        default:
          await this.sendMessage(
            phone,
            'Lo siento, hubo un error. Por favor escribe "inicio" para comenzar de nuevo.'
          );
          sessionService.resetSession(phone);
      }
    } catch (error) {
      logger.error(`Error handling message from ${phone}:`, error);
      await this.sendMessage(
        phone,
        'Ocurrió un error inesperado. Por favor intenta de nuevo más tarde.'
      );
      sessionService.resetSession(phone);
    }
  }

  /**
   * Handle global commands
   * Returns true if command was handled
   */
  private async handleGlobalCommands(phone: string, body: string): Promise<boolean> {
    const lower = body.toLowerCase().trim();

    // Restart command
    if (lower === 'inicio' || lower === 'start' || lower === 'reiniciar') {
      sessionService.resetSession(phone);
      await this.handleInitialState(phone, body);
      return true;
    }

    // Help command
    if (lower === 'ayuda' || lower === 'help' || lower === '?') {
      await this.sendMessage(phone, MessageFormatter.formatHelp());
      return true;
    }

    return false;
  }

  /**
   * Handle initial state - detect intent and route accordingly
   */
  private async handleInitialState(phone: string, body: string): Promise<void> {
    try {
      // Check if customer exists
      const existingCustomer = await customerService.getCustomerByPhone(phone);

      if (!existingCustomer) {
        // New customer - ask for name
        await this.handleNewCustomer(phone, body);
        return;
      }

      // Existing customer - store customer data
      sessionService.updateData(phone, {
        customer_id: existingCustomer.id,
        customer_name: existingCustomer.name,
        business_id: DEFAULT_BUSINESS_ID
      });

      // Detect intent from message
      const intent = this.intentDetector.detectIntent(body);
      logger.info('Detected intent', { phone, intent });

      // Route based on intent
      if (this.intentDetector.isIntentClear(intent)) {
        await this.routeByIntent(phone, body, intent.type, existingCustomer.id);
      } else {
        // Intent not clear - show welcome menu
        await this.showWelcomeMenu(phone, existingCustomer.name);
      }
    } catch (error) {
      logger.error('Error in handleInitialState:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error. Por favor intenta de nuevo.'
      );
    }
  }

  /**
   * Handle new customer (ask for name)
   */
  private async handleNewCustomer(phone: string, body: string): Promise<void> {
    const session = sessionService.getOrCreateSession(phone);

    // Check if we're asking for name
    if (session.state === 'initial' && !session.data.customer_name) {
      const welcomeMessage = MessageFormatter.formatWelcome();
      await this.sendMessage(phone, welcomeMessage);
      sessionService.updateState(phone, 'asking_name');
      return;
    }

    // We're in asking_name state - process the name
    if (session.state === 'asking_name') {
      const name = body.trim();

      if (name.length < 2) {
        await this.sendMessage(phone, 'Por favor ingresa un nombre válido.');
        return;
      }

      // Create customer
      const customer = await customerService.createCustomer({
        phone,
        name,
        business_id: DEFAULT_BUSINESS_ID
      });

      // Store customer data
      sessionService.updateData(phone, {
        customer_id: customer.id,
        customer_name: customer.name,
        business_id: DEFAULT_BUSINESS_ID
      });
      sessionService.updateState(phone, 'initial');

      // Show welcome menu
      await this.showWelcomeMenu(phone, customer.name);
    }
  }

  /**
   * Show welcome menu
   */
  private async showWelcomeMenu(phone: string, customerName?: string): Promise<void> {
    const message = MessageFormatter.formatWelcome(customerName);
    await this.sendMessage(phone, message);
    sessionService.updateState(phone, 'intent_detected');
  }

  /**
   * Route to appropriate handler based on detected intent
   */
  private async routeByIntent(
    phone: string,
    body: string,
    intentType: string,
    customerId: string
  ): Promise<void> {
    switch (intentType) {
      case 'book':
        await this.bookingHandler.startBooking(phone, body, DEFAULT_BUSINESS_ID);
        break;

      case 'cancel':
        await this.cancellationHandler.startCancellation(phone, customerId);
        break;

      case 'view':
        await this.viewHandler.showAppointments(phone, customerId);
        break;

      case 'help':
        await this.sendMessage(phone, MessageFormatter.formatHelp());
        sessionService.resetSession(phone);
        break;

      case 'greeting':
        await this.showWelcomeMenu(phone, sessionService.getOrCreateSession(phone).data.customer_name);
        break;

      default:
        await this.sendMessage(phone, MessageFormatter.formatNotUnderstood());
        sessionService.resetSession(phone);
    }
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
