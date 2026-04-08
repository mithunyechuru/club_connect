import { Timestamp } from 'firebase/firestore';
import { Event, QRCode } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for generating and managing QR codes for event attendance tracking
 * Generates unique QR codes that expire at event end time
 */
export class QRCodeGenerator {
  /**
   * Generate a unique QR code for an event
   * @param event - The event to generate a QR code for
   * @returns QRCode object with unique data and expiration
   */
  generateQRCode(event: Event): QRCode {
    // Generate unique QR code data
    const qrCodeData = this.generateUniqueQRCodeData(event);

    // Create QR code object with expiration set to event end time
    const qrCode: QRCode = {
      qrCodeId: uuidv4(),
      eventId: event.eventId,
      qrCodeData,
      generatedAt: Timestamp.now(),
      expiresAt: event.endTime,
      isActive: true,
    };

    return qrCode;
  }

  /**
   * Generate unique QR code data string for an event
   * @param event - The event to generate QR code data for
   * @returns Unique QR code data string
   */
  private generateUniqueQRCodeData(event: Event): string {
    // Create a unique identifier combining event ID, timestamp, and random component
    const timestamp = Date.now();
    const randomComponent = uuidv4();
    
    // Format: EVENT_CHECK_IN|eventId|timestamp|random
    // This format makes it easy to parse and validate during scanning
    return `EVENT_CHECK_IN|${event.eventId}|${timestamp}|${randomComponent}`;
  }

  /**
   * Validate if a QR code is still active and not expired
   * @param qrCode - The QR code to validate
   * @returns boolean indicating if the QR code is valid
   */
  isQRCodeValid(qrCode: QRCode): boolean {
    // Check if QR code is marked as active
    if (!qrCode.isActive) {
      return false;
    }

    // Check if QR code has expired (current time is past expiration time)
    const now = Timestamp.now();
    const expiresAtMillis = qrCode.expiresAt.toMillis ? qrCode.expiresAt.toMillis() : qrCode.expiresAt.toDate().getTime();
    const nowMillis = now.toMillis ? now.toMillis() : now.toDate().getTime();

    return nowMillis < expiresAtMillis;
  }

  /**
   * Deactivate a QR code (typically called when event ends)
   * @param qrCode - The QR code to deactivate
   * @returns Updated QR code with isActive set to false
   */
  deactivateQRCode(qrCode: QRCode): QRCode {
    return {
      ...qrCode,
      isActive: false,
    };
  }

  /**
   * Parse QR code data to extract event ID
   * @param qrCodeData - The QR code data string to parse
   * @returns Event ID extracted from QR code data, or null if invalid format
   */
  parseEventIdFromQRCode(qrCodeData: string): string | null {
    try {
      // Expected format: EVENT_CHECK_IN|eventId|timestamp|random
      const parts = qrCodeData.split('|');
      
      if (parts.length !== 4 || parts[0] !== 'EVENT_CHECK_IN') {
        return null;
      }

      return parts[1];
    } catch (error) {
      return null;
    }
  }

  /**
   * Update event's QR code data field
   * This is used when creating an event to store the QR code data in the event record
   * @param event - The event to update
   * @param qrCode - The QR code generated for the event
   * @returns Event with updated qrCodeData field
   */
  updateEventWithQRCode(event: Event, qrCode: QRCode): Event {
    return {
      ...event,
      qrCodeData: qrCode.qrCodeData,
    };
  }
}

export const qrCodeGenerator = new QRCodeGenerator();
