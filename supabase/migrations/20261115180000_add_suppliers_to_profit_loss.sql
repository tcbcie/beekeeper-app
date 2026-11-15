-- Profit & Loss: suppliers and invoice numbers on expenses.
-- See docs/features/profit-loss-suppliers.md. Additive only: no existing row changes.

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS suppliers_user_id_idx ON public.suppliers(user_id);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suppliers" ON public.suppliers
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can insert own suppliers" ON public.suppliers
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can update own suppliers" ON public.suppliers
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users can delete own suppliers" ON public.suppliers
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE INDEX IF NOT EXISTS financial_records_supplier_id_idx ON public.financial_records(supplier_id);
