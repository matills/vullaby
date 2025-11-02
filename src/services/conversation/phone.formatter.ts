export class PhoneFormatter {
  static normalize(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  static format(phone: string): string {
    let cleaned = this.normalize(phone);
    
    if (!cleaned.startsWith('549')) {
      if (cleaned.startsWith('54')) {
        cleaned = '549' + cleaned.substring(2);
      } else if (cleaned.startsWith('9')) {
        cleaned = '54' + cleaned;
      } else {
        cleaned = '549' + cleaned;
      }
    }
    
    return `+${cleaned}`;
  }

  static generatePatterns(phone: string): string[] {
    const normalized = this.normalize(phone);
    const patterns = new Set([
      phone,
      `+${normalized}`,
      normalized,
    ]);

    const withoutPrefix = normalized.replace(/^549/, '');
    patterns.add(`+549${withoutPrefix}`);
    patterns.add(`549${withoutPrefix}`);
    patterns.add(withoutPrefix);

    return Array.from(patterns);
  }

  static toWhatsAppFormat(phone: string): string {
    const formatted = this.format(phone);
    return `whatsapp:${formatted}`;
  }

  static fromWhatsAppFormat(phone: string): string {
    return phone.replace('whatsapp:', '').trim();
  }
}