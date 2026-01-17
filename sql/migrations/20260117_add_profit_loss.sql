-- P&L (Profit & Loss) Feature Migration
-- Creates financial_records table and seeds dropdown categories for income/expense types

-- 1. Create financial_records table
CREATE TABLE IF NOT EXISTS public.financial_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL CHECK (record_type IN ('income', 'expense')),
  transaction_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES public.dropdown_values(id),
  description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_financial_records_user_id ON public.financial_records(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON public.financial_records(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON public.financial_records(record_type);

-- 3. Enable RLS
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can view own financial records"
  ON public.financial_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial records"
  ON public.financial_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial records"
  ON public.financial_records FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial records"
  ON public.financial_records FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create dropdown categories for Income and Expense types
INSERT INTO public.dropdown_categories (category_name, category_key, description, created_at, updated_at)
VALUES
  ('Income Category', 'income_category', 'Categories for beekeeping income', NOW(), NOW()),
  ('Expense Category', 'expense_category', 'Categories for beekeeping expenses', NOW(), NOW())
ON CONFLICT (category_key) DO NOTHING;

-- 6. Seed Income category values
INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Honey Sales', 1, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Nucleus Sales', 2, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Queen Sales', 3, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Pollination Services', 4, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Wax Sales', 5, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Propolis Sales', 6, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Swarm Collection', 7, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Teaching/Mentoring', 8, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Equipment Sales', 9, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Other Income', 10, true FROM public.dropdown_categories WHERE category_key = 'income_category'
ON CONFLICT DO NOTHING;

-- 7. Seed Expense category values
INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Equipment - Hives', 1, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Equipment - Tools', 2, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Equipment - Protective Gear', 3, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Feed - Sugar/Syrup', 4, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Feed - Supplements', 5, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Treatments - Varroa', 6, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Treatments - Other', 7, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Queens/Bees', 8, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Transport/Fuel', 9, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Association Fees', 10, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Insurance', 11, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Training/Books', 12, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Packaging/Labels', 13, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Marketing', 14, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Repairs/Maintenance', 15, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;

INSERT INTO public.dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Other Expense', 16, true FROM public.dropdown_categories WHERE category_key = 'expense_category'
ON CONFLICT DO NOTHING;
