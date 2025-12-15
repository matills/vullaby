-- Migration: Add WhatsApp configuration to businesses table
-- Description: Enables multi-tenant WhatsApp support where each business has its own WhatsApp number
-- Date: 2024-11-22

-- Add WhatsApp phone number ID (from Meta Business Manager)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS whatsapp_phone_number_id VARCHAR(50);

-- Add WhatsApp display phone number (for reference/display)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS whatsapp_phone_number VARCHAR(20);

-- Add WhatsApp enabled flag
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN businesses.whatsapp_phone_number_id IS 'Meta WhatsApp Business API Phone Number ID';
COMMENT ON COLUMN businesses.whatsapp_phone_number IS 'WhatsApp phone number for display (e.g., +5491123456789)';
COMMENT ON COLUMN businesses.whatsapp_enabled IS 'Whether WhatsApp messaging is enabled for this business';

-- Create index for webhook routing (find business by phone number)
CREATE INDEX IF NOT EXISTS idx_businesses_whatsapp_phone
ON businesses(whatsapp_phone_number)
WHERE whatsapp_phone_number IS NOT NULL;
