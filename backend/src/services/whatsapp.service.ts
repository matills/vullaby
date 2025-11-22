import { sendWhatsAppMessage, sendWhatsAppMessageLegacy } from '../config/kapso';
import { logger } from '../config/logger';
import { sessionService } from './session.service';
import { customerService } from './customer.service';
import { employeeService } from './employee.service';
import { appointmentService } from './appointment.service';
import { availabilityService } from './availability.service';
import { businessService } from './business.service';
import { IncomingWhatsAppMessage, Business } from '../models';
import { IntentDetector } from './whatsapp/IntentDetector';
import { DataExtractor } from './whatsapp/DataExtractor';
import { ValidationService } from './whatsapp/ValidationService';
import { MessageFormatter } from './whatsapp/MessageFormatter';
import { BookingHandler } from './whatsapp/BookingHandler';
import { CancellationHandler } from './whatsapp/CancellationHandler';
import { ViewHandler } from './whatsapp/ViewHandler';

// Fallback business ID for development/testing
const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID || '966d6a45-9111-4a42-b618-2f744ebce14a';

// Current business context (set per incoming message)
let currentBusiness: Business | null = null;

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
   * Send WhatsApp message using the current business's phone number
   */
  async sendMessage(to: string, message: string): Promise<void> {
    try {
      if (currentBusiness?.whatsapp_phone_number_id) {
        // Use business-specific phone number
        await sendWhatsAppMessage(currentBusiness.whatsapp_phone_number_id, to, message);
        logger.info(`Message sent to ${to} from business ${currentBusiness.name}`);
      } else {
        // Fallback to legacy (default phone number from env)
        await sendWhatsAppMessageLegacy(to, message);
        logger.info(`Message sent to ${to} using default number`);
      }
    } catch (error) {
      logger.error(`Failed to send message to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Set the current business context for message routing
   */
  setBusinessContext(business: Business | null): void {
    currentBusiness = business;
  }

  /**
   * Get the current business context
   */
  getBusinessContext(): Business | null {
    return currentBusiness;
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(message: IncomingWhatsAppMessage): Promise<void> {
    const phone = message.From;
    const toNumber = message.To;
    const body = message.Body.trim();

    logger.info(`Incoming message from ${phone} to ${toNumber}: ${body}`);

    try {
      // Find the business by the WhatsApp number the message was sent TO
      const business = await businessService.getBusinessByWhatsAppPhone(toNumber);

      if (!business) {
        logger.warn(`No business found for WhatsApp number: ${toNumber}`);
        // Try to continue with default business for backward compatibility
        const defaultBusiness = await businessService.getById(DEFAULT_BUSINESS_ID);
        this.setBusinessContext(defaultBusiness);
      } else {
        this.setBusinessContext(business);
        logger.info(`Message routed to business: ${business.name} (${business.id})`);
      }

      // Check for global commands first
      if (await this.handleGlobalCommands(phone, body)) {
        return;
      }

      // Get or create session with business context
      const session = sessionService.getOrCreateSession(phone);

      // Update session with business_id if available
      if (currentBusiness?.id && !session.data.business_id) {
        sessionService.updateData(phone, { business_id: currentBusiness.id });
      }

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
      if (this.intentDetector.isIntentClear(intent) && existingCustomer.id) {
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

      // Create customer (business_id is added automatically by BaseService from request context)
      const customer = await customerService.createCustomer({
        phone,
        name,
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
