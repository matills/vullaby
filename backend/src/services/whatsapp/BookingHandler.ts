import { SessionService } from '../session.service';
import { CustomerService } from '../customer.service';
import { EmployeeService } from '../employee.service';
import { AppointmentService } from '../appointment.service';
import { AvailabilityService } from '../availability.service';
import { DataExtractor } from './DataExtractor';
import { ValidationService } from './ValidationService';
import { MessageFormatter } from './MessageFormatter';
import { logger } from '../../config/logger';
import { BookingData, DataCollectionStep } from './types';

/**
 * BookingHandler - Handles the appointment booking flow
 */
export class BookingHandler {
  constructor(
    private sessionService: SessionService,
    private customerService: CustomerService,
    private employeeService: EmployeeService,
    private appointmentService: AppointmentService,
    private availabilityService: AvailabilityService,
    private dataExtractor: DataExtractor,
    private validationService: ValidationService,
    private sendMessage: (phone: string, message: string) => Promise<void>
  ) {}

  /**
   * Start the booking process
   * Attempts to extract data from initial message
   */
  async startBooking(phone: string, message: string, businessId: string): Promise<void> {
    try {
      logger.info('Starting booking process', { phone, message });

      // Extract any booking data from the message
      const extractedData = this.dataExtractor.extractBookingData(message);
      logger.debug('Extracted booking data', { extractedData });

      // Get available employees
      const employees = await this.employeeService.getActiveEmployeesByBusiness(businessId);

      if (employees.length === 0) {
        await this.sendMessage(
          phone,
          'Lo siento, no hay profesionales disponibles en este momento. Por favor intenta más tarde.'
        );
        this.sessionService.resetSession(phone);
        return;
      }

      // Store in session
      this.sessionService.updateData(phone, {
        business_id: businessId,
        employees,
        collected_data: extractedData
      });

      // Check if employee name was extracted
      if (extractedData.employeeName) {
        const employee = this.dataExtractor.findEmployeeByName(
          employees,
          extractedData.employeeName
        );
        if (employee) {
          extractedData.employeeId = employee.id;
          extractedData.employeeName = employee.name;
        }
      }

      // Determine what data we still need
      const missingData = this.determineMissingData(extractedData);

      if (missingData.length === 0) {
        // We have all data! Validate and confirm
        await this.validateAndConfirm(phone, extractedData);
      } else {
        // Ask for missing data
        this.sessionService.updateData(phone, { missing_data: missingData });
        this.sessionService.updateState(phone, 'collecting_data');
        await this.askForNextMissingData(phone);
      }
    } catch (error) {
      logger.error('Error starting booking:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error al iniciar el proceso. Por favor intenta de nuevo.'
      );
      this.sessionService.resetSession(phone);
    }
  }

  /**
   * Handle user input during data collection
   */
  async handleDataCollection(phone: string, message: string): Promise<void> {
    try {
      const session = this.sessionService.getOrCreateSession(phone);
      const missingData = session.data.missing_data || [];
      const collectedData = session.data.collected_data || {};

      if (missingData.length === 0) {
        // No missing data, shouldn't be here
        await this.validateAndConfirm(phone, collectedData);
        return;
      }

      const currentStep = missingData[0];

      // Process the current step
      const success = await this.processDataStep(phone, message, currentStep, collectedData);

      if (success) {
        // Remove this step from missing data
        const remainingData = missingData.slice(1);
        this.sessionService.updateData(phone, { missing_data: remainingData });

        if (remainingData.length === 0) {
          // All data collected!
          await this.validateAndConfirm(phone, collectedData);
        } else {
          // Ask for next missing data
          await this.askForNextMissingData(phone);
        }
      }
      // If not successful, error message already sent, wait for user to try again
    } catch (error) {
      logger.error('Error handling data collection:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error. Por favor intenta de nuevo.'
      );
    }
  }

  /**
   * Process a specific data collection step
   */
  private async processDataStep(
    phone: string,
    message: string,
    step: DataCollectionStep,
    collectedData: Partial<BookingData>
  ): Promise<boolean> {
    const session = this.sessionService.getOrCreateSession(phone);

    switch (step) {
      case 'employee': {
        const employees = session.data.employees || [];

        // Check if message is "cualquiera" or similar
        if (message.toLowerCase().includes('cualquiera') ||
            message.toLowerCase().includes('el que sea')) {
          // Pick first available
          const employee = employees[0];
          collectedData.employeeId = employee.id;
          collectedData.employeeName = employee.name;
          this.sessionService.updateData(phone, { collected_data: collectedData });
          return true;
        }

        // Try to extract number
        const selection = this.dataExtractor.extractSelection(message, employees.length + 1);

        if (selection) {
          if (selection === employees.length + 1) {
            // "Cualquiera disponible" option
            const employee = employees[0];
            collectedData.employeeId = employee.id;
            collectedData.employeeName = employee.name;
          } else {
            const employee = employees[selection - 1];
            collectedData.employeeId = employee.id;
            collectedData.employeeName = employee.name;
          }
          this.sessionService.updateData(phone, { collected_data: collectedData });
          return true;
        }

        // Try to match by name
        const employee = this.dataExtractor.findEmployeeByName(employees, message);
        if (employee) {
          collectedData.employeeId = employee.id;
          collectedData.employeeName = employee.name;
          this.sessionService.updateData(phone, { collected_data: collectedData });
          return true;
        }

        // Invalid selection
        await this.sendMessage(
          phone,
          `Por favor selecciona un número del 1 al ${employees.length + 1} o el nombre del profesional.`
        );
        return false;
      }

      case 'date': {
        const date = this.dataExtractor.extractBookingData(message).date;

        if (!date) {
          await this.sendMessage(
            phone,
            MessageFormatter.formatError(
              'No pude entender la fecha. Intenta con: "mañana", "viernes", "20 de noviembre", etc.'
            )
          );
          return false;
        }

        const validation = this.validationService.validateDate(date);
        if (!validation.valid) {
          await this.sendMessage(phone, MessageFormatter.formatError(validation.error!));
          return false;
        }

        collectedData.date = date;
        this.sessionService.updateData(phone, { collected_data: collectedData });
        return true;
      }

      case 'time': {
        // First check if we have available slots to show
        if (collectedData.date && collectedData.employeeId) {
          // Try to extract time from message
          const time = this.dataExtractor.extractBookingData(message).time;

          if (time) {
            // Validate the time
            const timeValidation = this.validationService.validateTime(time);
            if (!timeValidation.valid) {
              await this.sendMessage(phone, MessageFormatter.formatError(timeValidation.error!));
              return false;
            }

            const dateTimeValidation = this.validationService.validateDateTime(
              collectedData.date,
              time
            );
            if (!dateTimeValidation.valid) {
              await this.sendMessage(phone, MessageFormatter.formatError(dateTimeValidation.error!));
              return false;
            }

            // Check if slot is available
            const isAvailable = await this.checkSlotAvailability(
              collectedData.employeeId,
              collectedData.date,
              time
            );

            if (!isAvailable) {
              await this.sendMessage(
                phone,
                'Ese horario no está disponible. Por favor elige otro.'
              );
              // Show available slots
              await this.showAvailableSlots(phone, collectedData.employeeId, collectedData.date);
              return false;
            }

            collectedData.time = time;
            this.sessionService.updateData(phone, { collected_data: collectedData });
            return true;
          }

          // Try to extract selection number
          const slots = await this.getAvailableSlots(collectedData.employeeId, collectedData.date);
          const selection = this.dataExtractor.extractSelection(message, slots.length);

          if (selection && selection >= 1 && selection <= slots.length) {
            collectedData.time = slots[selection - 1];
            this.sessionService.updateData(phone, { collected_data: collectedData });
            return true;
          }

          await this.sendMessage(
            phone,
            'Por favor elige un horario del listado o escribe una hora específica.'
          );
          return false;
        }

        await this.sendMessage(phone, 'Error: falta información de fecha o empleado.');
        return false;
      }

      default:
        return false;
    }
  }

  /**
   * Ask for the next missing piece of data
   */
  private async askForNextMissingData(phone: string): Promise<void> {
    const session = this.sessionService.getOrCreateSession(phone);
    const missingData = session.data.missing_data || [];
    const collectedData = session.data.collected_data || {};
    const employees = session.data.employees || [];

    if (missingData.length === 0) {
      return;
    }

    const nextStep = missingData[0];

    switch (nextStep) {
      case 'employee':
        await this.sendMessage(phone, MessageFormatter.formatEmployeeList(employees));
        break;

      case 'date':
        await this.sendMessage(phone, MessageFormatter.formatAskForDate());
        break;

      case 'time':
        if (collectedData.date && collectedData.employeeId) {
          await this.showAvailableSlots(phone, collectedData.employeeId, collectedData.date);
        } else {
          await this.sendMessage(phone, MessageFormatter.formatAskForTime());
        }
        break;
    }
  }

  /**
   * Show available time slots for a given employee and date
   */
  private async showAvailableSlots(
    phone: string,
    employeeId: string,
    date: Date
  ): Promise<void> {
    try {
      const slots = await this.getAvailableSlots(employeeId, date);
      const message = MessageFormatter.formatTimeSlots(date, slots);
      await this.sendMessage(phone, message);
    } catch (error) {
      logger.error('Error showing available slots:', error);
      await this.sendMessage(phone, MessageFormatter.formatAskForTime());
    }
  }

  /**
   * Get available time slots
   */
  private async getAvailableSlots(employeeId: string, date: Date): Promise<string[]> {
    try {
      const slots = await this.availabilityService.getAvailableSlots(
        employeeId,
        date,
        60 // duration in minutes
      );
      return slots.map(slot => slot.time);
    } catch (error) {
      logger.error('Error getting available slots:', error);
      return [];
    }
  }

  /**
   * Check if a specific slot is available
   */
  private async checkSlotAvailability(
    employeeId: string,
    date: Date,
    time: string
  ): Promise<boolean> {
    try {
      const slots = await this.getAvailableSlots(employeeId, date);
      return slots.includes(time);
    } catch (error) {
      logger.error('Error checking slot availability:', error);
      return false;
    }
  }

  /**
   * Determine what data is missing
   */
  private determineMissingData(data: Partial<BookingData>): DataCollectionStep[] {
    const missing: DataCollectionStep[] = [];

    if (!data.employeeId) {
      missing.push('employee');
    }
    if (!data.date) {
      missing.push('date');
    }
    if (!data.time) {
      missing.push('time');
    }

    return missing;
  }

  /**
   * Validate all data and ask for confirmation
   */
  private async validateAndConfirm(
    phone: string,
    data: Partial<BookingData>
  ): Promise<void> {
    try {
      if (!data.date || !data.time || !data.employeeId || !data.employeeName) {
        throw new Error('Missing required booking data');
      }

      // Final validation
      const dateValidation = this.validationService.validateDate(data.date);
      if (!dateValidation.valid) {
        await this.sendMessage(phone, MessageFormatter.formatError(dateValidation.error!));
        this.sessionService.resetSession(phone);
        return;
      }

      const timeValidation = this.validationService.validateTime(data.time);
      if (!timeValidation.valid) {
        await this.sendMessage(phone, MessageFormatter.formatError(timeValidation.error!));
        this.sessionService.resetSession(phone);
        return;
      }

      const dateTimeValidation = this.validationService.validateDateTime(data.date, data.time);
      if (!dateTimeValidation.valid) {
        await this.sendMessage(phone, MessageFormatter.formatError(dateTimeValidation.error!));
        this.sessionService.resetSession(phone);
        return;
      }

      // Check availability one more time
      const isAvailable = await this.checkSlotAvailability(
        data.employeeId,
        data.date,
        data.time
      );

      if (!isAvailable) {
        await this.sendMessage(
          phone,
          'Lo siento, ese horario ya no está disponible. Vamos a empezar de nuevo.'
        );
        this.sessionService.resetSession(phone);
        return;
      }

      // Store final data and ask for confirmation
      this.sessionService.updateData(phone, { collected_data: data });
      this.sessionService.updateState(phone, 'confirming');

      const confirmationMessage = MessageFormatter.formatConfirmation({
        date: data.date,
        time: data.time,
        employeeName: data.employeeName
      });

      await this.sendMessage(phone, confirmationMessage);
    } catch (error) {
      logger.error('Error in validateAndConfirm:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error al validar los datos. Por favor intenta de nuevo escribiendo "inicio".'
      );
      this.sessionService.resetSession(phone);
    }
  }

  /**
   * Handle confirmation response
   */
  async handleConfirmation(phone: string, message: string): Promise<void> {
    try {
      const session = this.sessionService.getOrCreateSession(phone);
      const data = session.data.collected_data;

      if (!data || !data.date || !data.time || !data.employeeId) {
        await this.sendMessage(phone, 'Error: datos de reserva incompletos.');
        this.sessionService.resetSession(phone);
        return;
      }

      // Check for affirmative or negative response
      if (this.dataExtractor.isAffirmative(message)) {
        await this.createAppointment(phone, data);
      } else if (this.dataExtractor.isNegative(message)) {
        await this.sendMessage(
          phone,
          'Reserva cancelada. Si quieres intentar de nuevo, escribe "agendar" o "inicio".'
        );
        this.sessionService.resetSession(phone);
      } else {
        await this.sendMessage(
          phone,
          'Por favor responde *Sí* para confirmar o *No* para cancelar.'
        );
      }
    } catch (error) {
      logger.error('Error handling confirmation:', error);
      await this.sendMessage(phone, 'Ocurrió un error. Por favor intenta de nuevo.');
    }
  }

  /**
   * Create the appointment
   */
  private async createAppointment(phone: string, data: Partial<BookingData>): Promise<void> {
    try {
      const session = this.sessionService.getOrCreateSession(phone);
      const customerId = session.data.customer_id;
      const businessId = session.data.business_id;

      if (!customerId || !businessId || !data.date || !data.time || !data.employeeId) {
        throw new Error('Missing required data for appointment creation');
      }

      // Combine date and time
      const [hours, minutes] = data.time.split(':').map(Number);
      const startTime = new Date(data.date);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(hours + 1, minutes, 0, 0); // Default 1 hour duration

      // Create appointment
      const appointment = await this.appointmentService.createAppointment({
        business_id: businessId,
        customer_id: customerId,
        employee_id: data.employeeId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed'
      });

      logger.info('Appointment created successfully', { appointmentId: appointment.id });

      // Send confirmation
      const confirmationMessage = MessageFormatter.formatAppointmentConfirmed({
        id: appointment.id,
        date: data.date,
        time: data.time,
        employeeName: data.employeeName!
      });

      await this.sendMessage(phone, confirmationMessage);

      // Reset session
      this.sessionService.resetSession(phone);
    } catch (error) {
      logger.error('Error creating appointment:', error);
      await this.sendMessage(
        phone,
        'Ocurrió un error al crear la reserva. Por favor intenta de nuevo más tarde.'
      );
      this.sessionService.resetSession(phone);
    }
  }
}
