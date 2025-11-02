import { supabaseAdmin } from '../../config/database';
import { PhoneFormatter } from './phone.formatter';
import logger from '../../utils/logger';

export class CustomerResolver {
  async findOrCreate(normalizedPhone: string, businessId: string): Promise<any> {
    const patterns = PhoneFormatter.generatePatterns(normalizedPhone);

    for (const pattern of patterns) {
      const { data } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('phone', pattern)
        .maybeSingle();

      if (data) {
        logger.info(`Customer found: ${data.name}`);
        return data;
      }
    }

    logger.info(`Creating new customer for: ${normalizedPhone}`);
    const { data: newCustomer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        business_id: businessId,
        phone: `+${normalizedPhone}`,
        name: 'Cliente WhatsApp',
        email: `whatsapp_${normalizedPhone}@placeholder.com`,
      })
      .select()
      .single();

    if (error || !newCustomer) {
      logger.error('Error creating customer:', error);
      throw new Error('Failed to create customer');
    }

    logger.info(`New customer created: ${newCustomer.id}`);
    return newCustomer;
  }
}