# Profit & Loss: suppliers and invoice numbers

**Status:** Built, waiting for testing (15 November 2026)

## Problem

An expense in Tools → Profit & Loss records a date, amount, category, description and notes. It does not record who was paid or the invoice number. For accounts and tax returns a beekeeper needs both, and typing a supplier's name into the description each time is inconsistent ("Thornes", "E H Thorne", "thornes ltd").

## What the beekeeper gets

On an **expense** (not income):

- **Supplier:** a list of their own suppliers, with "No supplier" as the first choice.
  - **New supplier** opens a sheet (name, phone, email, notes). Saving it adds the supplier and selects it in the expense straight away, with no need to leave the form.
  - **Edit supplier** (shown when one is selected) opens the same sheet filled in. Changes apply to every expense from that supplier.
- **Invoice number:** a short free-text field, for example "INV-20431".
- **Date:** the existing Date field, unchanged.

The record row shows "Supplier · Invoice INV-20431" under the description, and the CSV export gains "Supplier" and "Invoice number" columns.

Both fields are optional, so existing expenses and quick entries are unaffected.

## Database

New table `suppliers`, user-scoped like `financial_records`:

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key, `gen_random_uuid()` |
| user_id | uuid | not null, references `profiles(id)` on delete cascade |
| name | text | not null |
| phone | text | |
| email | text | |
| notes | text | |
| created_at / updated_at | timestamptz | `now()` |

RLS: select, insert, update and delete only where `auth.uid() = user_id`, matching `financial_records` and `crm_customers`.

New columns on `financial_records`:

- `supplier_id uuid` references `suppliers(id)` **on delete set null**, with an index.
- `invoice_number text`.

Both are nullable, so it is a purely additive change. No existing row changes.

## Files

- Migration `supabase/migrations/20261115180000_add_suppliers_to_profit_loss.sql`, applied to the live database through the Supabase MCP on 15 November 2026.
- `src/types/records.ts`: a `Supplier` type, and `supplier_id`, `invoice_number` and `supplier` on `FinancialRecord`.
- `src/components/tools/ProfitLoss/SupplierPicker.tsx` (new): the select plus New and Edit buttons. It loads the user's suppliers itself.
- `src/components/tools/ProfitLoss/SupplierSheet.tsx` (new): the create and edit sheet on `ModalShell`.
- `src/components/tools/ProfitLoss/FinancialRecordForm.tsx`: Supplier and Invoice number for expenses. Income saves both as empty.
- `src/components/tools/ProfitLoss/index.tsx`: load the supplier name with records, save the two fields on insert and update, and add CSV columns.
- `src/components/tools/ProfitLoss/FinancialRecordCard.tsx`: the supplier and invoice line.
- `src/lib/database-export.ts`: include `suppliers` in the admin database export and in a member's own data export (Profile).

The supplier sheet opens inside the expense form (`ModalShell` does not use a portal), so it has no `<form>` of its own. Enter in a supplier field saves the supplier instead of submitting the expense.

## Out of scope

- Deleting suppliers. A supplier that is no longer used simply stays in the list. This can be added later; deleting one would clear it from past expenses.
- A separate suppliers screen.
- Suppliers on income records.
