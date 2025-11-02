import { supabaseAdmin } from '../../config/database';
import { PhoneFormatter } from './phone.formatter';
import logger from '../../utils/logger';

export class BusinessResolver {
  async findByPhone(toNumber: string): Promise<any> {
    const cleanedNumber = PhoneFormatter.fromWhatsAppFormat(toNumber);
    
    logger.info(`Looking for business with phone: ${cleanedNumber}`);

    const { data: business } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('phone', cleanedNumber)
      .maybeSingle();

    if (business) {
      logger.info(`Business found: ${business.name}`);
      return business;
    }

    const patterns = PhoneFormatter.generatePatterns(cleanedNumber);
    
    for (const pattern of patterns) {
      const { data: businessByPattern } = await supabaseAdmin
        .from('businesses')
        .select('*')
        .eq('phone', pattern)
        .maybeSingle();

      if (businessByPattern) {
        logger.info(`Business found with pattern ${pattern}: ${businessByPattern.name}`);
        return businessByPattern;
      }
    }

    logger.warn(`No business found for phone: ${toNumber}`);
    return null;
  }
}