-- Add notification preference fields to rearing_batches table
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS enable_browser_notifications BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS enable_email_digest BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.rearing_batches.enable_browser_notifications
IS 'Enable browser push notifications for important dates (acceptance check, cage dates, hatch date)';

COMMENT ON COLUMN public.rearing_batches.enable_email_digest
IS 'Include this batch in weekly email digest with upcoming dates';
