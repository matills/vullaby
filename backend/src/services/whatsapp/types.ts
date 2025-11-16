/**
 * Types for WhatsApp conversation flow
 */

export type ConversationState =
  | 'initial'           // Waiting for user intent
  | 'intent_detected'   // Detected what user wants to do
  | 'collecting_data'   // Collecting missing information
  | 'confirming'        // Waiting for confirmation
  | 'cancelling'        // In cancellation process
  | 'viewing'           // Showing appointments
  | 'rescheduling';     // Rescheduling appointment

export type DataCollectionStep =
  | 'date'
  | 'employee'
  | 'time';

export type IntentType =
  | 'book'              // User wants to book appointment
  | 'cancel'            // User wants to cancel
  | 'view'              // User wants to view appointments
  | 'reschedule'        // User wants to reschedule
  | 'greeting'          // Just a greeting
  | 'help'              // Asking for help
  | 'unknown';          // Unclear intent

export interface Intent {
  type: IntentType;
  confidence: number;
}

export interface BookingData {
  date?: Date;
  time?: string;          // Format: "HH:mm"
  employeeId?: string;
  employeeName?: string;
}

export interface WhatsAppSession {
  phone: string;
  state: ConversationState;
  data: {
    customer_name?: string;
    customer_id?: string;
    business_id?: string;
    employee_id?: string;
    employee_name?: string;
    employees?: any[];
    date?: string;
    time?: string;
    appointment_id?: string;
    pending_cancellation_id?: string;
    collected_data?: BookingData;
    missing_data?: DataCollectionStep[];
  };
  created_at: Date;
  updated_at: Date;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalized?: any;
}
