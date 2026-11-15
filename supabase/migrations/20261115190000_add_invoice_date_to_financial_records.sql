-- Profit & Loss: invoice date on expenses (docs/features/profit-loss-suppliers.md).
-- Additive only: nullable, no existing row changes.

ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS invoice_date date;
