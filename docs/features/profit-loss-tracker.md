# P&L (Profit & Loss) Tracker

## Overview

Allows beekeepers to track their income and expenses with categorized financial records. Displays summary totals for income, expenses, and net profit/loss with time period filtering.

## Status: Implemented

Completed: January 17, 2026

## How to Use

1. Go to **Tools** page
2. Click the **"P&L"** card (Wallet icon)
3. Click **"Add Record"** to create a new entry
4. Select **Income** or **Expense** type
5. Fill in date, amount (EUR), category, and optional description/notes
6. View summary cards showing totals
7. Use time filters: This Month, This Year, All Time

## Features

- Income/Expense choice: a radio group with the shared `RadioChoiceOption`, selected in green (WP04, 04/11/2026; was a green/red toggle), with every label tied to its field
- Dropdown categories specific to beekeeping
- Summary cards: Total Income, Total Expenses, Net Profit/Loss
- Income by category: ranked bars for the chosen period, largest first (12/11/2026)
- Expenses by category: the same, in red, under the income breakdown (12/11/2026)
- Time period filtering
- Edit and delete records
- CSV export (respects current time filter)
- Mobile responsive design
- Dark mode support

## Categories

### Income Categories
- Honey Sales
- Nucleus Sales
- Queen Sales
- Pollination Services
- Wax Sales
- Propolis Sales
- Swarm Collection
- Teaching/Mentoring
- Equipment Sales
- Other Income

### Expense Categories
- Equipment - Hives
- Equipment - Tools
- Equipment - Protective Gear
- Feed - Sugar/Syrup
- Feed - Supplements
- Treatments - Varroa
- Treatments - Other
- Queens/Bees
- Transport/Fuel
- Association Fees
- Insurance
- Training/Books
- Packaging/Labels
- Marketing
- Repairs/Maintenance
- Other Expense

## Technical Implementation

### Database Schema

```sql
CREATE TABLE public.financial_records (
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
```

### RLS Policies

- Users can only view, insert, update, and delete their own records
- All operations filtered by `auth.uid() = user_id`

### Files Created

| File | Description |
|------|-------------|
| `sql/migrations/20260117_add_profit_loss.sql` | Database migration with table, indexes, RLS policies, and category seeding |
| `src/components/tools/ProfitLoss/index.tsx` | Main component with state management and CRUD operations |
| `src/components/tools/ProfitLoss/FinancialRecordForm.tsx` | Add/Edit form with type toggle and category dropdown |
| `src/components/tools/ProfitLoss/FinancialRecordCard.tsx` | Individual record display with edit/delete actions |
| `src/components/tools/ProfitLoss/FinancialSummary.tsx` | Summary cards for totals |

### Files Modified

| File | Changes |
|------|---------|
| `src/types/records.ts` | Added `FinancialRecord` interface |
| `src/app/dashboard/tools/page.tsx` | Added P&L tool card and component integration |

### TypeScript Interface

```typescript
interface FinancialRecord {
  id: string
  user_id: string
  record_type: 'income' | 'expense'
  transaction_date: string
  amount: number
  category_id: string
  description: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
  category?: { value: string }
}
```

## UI Components

### Summary Cards
- **Income Card**: Green background, shows total income
- **Expenses Card**: Red background, shows total expenses
- **Net Card**: Blue (profit) or Orange (loss), shows net result

### Income by Category
- Sits between the summary cards and the records list, and follows the time filter: "Income by category (this month / this year / all time)"
- One row per income category: name, amount, and a green bar sized against the largest category
- Hidden when the chosen period has no income
- Built from the records already loaded (no extra query) with the shared `src/components/ui/CategoryBreakdown.tsx`, the same component CRM Sales Insights uses, so both screens group and sort income the same way

### Expenses by Category
- Directly under Income by category, with the same time filter and title pattern: "Expenses by category (this year)"
- Red bars (`tone="expense"`), matching the Expenses card, so income and expenses read apart at a glance
- Hidden when the period has no expenses
- The two panels stack on a phone and sit side by side from the `lg` width when both show

### Record Cards
- Left border color indicates type (green=income, red=expense)
- Shows: Type badge, Category, Amount, Date, Description, Notes
- Edit (pencil) and Delete (trash) action buttons

### Form Fields
1. Type* - Income/Expense toggle buttons
2. Date* - Date picker
3. Amount (EUR)* - Number input with 2 decimal places
4. Category* - Dropdown (changes based on type selection)
5. Description - Optional text input
6. Notes - Optional textarea

## Export

Click the **Export** button to download filtered records as CSV:
- Filename: `pl-records-{period}-{date}.csv`
- Columns: Date, Type, Category, Amount (EUR), Description, Notes
- Respects current time filter (Month/Year/All)

Financial records are also included in the Settings backup export.

## Where income comes from (12/11/2026)

`financial_records` is the one book of money in HiveCraic. Income reaches it in three ways:

| Source | How | Edit in P&L? |
|--------|-----|--------------|
| Added by hand | **Add Record** in this tool | Yes |
| Jar sale | **Record a jar sale** on a jar label (Traceability), Honey Sales category | Yes |
| CRM order | Posted by the database when an order is fully paid, one row per income category, tagged `crm_order_id` (see `crm-module.md`) | No: the row shows **From order ORD-…**, linking to the order. Unpaying or cancelling the order removes the row |

- `crm_order_id uuid` (nullable, `REFERENCES crm_orders(id) ON DELETE SET NULL`). Deleting an order keeps its income as history, and the row becomes an ordinary editable record.
- The records query embeds `order:crm_orders(order_number)` (one FK, read with `firstOf`).
- CRM **Sales Insights** reads this year's income from this table, split into "from orders" and "other", so both screens always show the same income. Expenses and net profit live only here; Sales Insights links here for them.
- The app cannot tell when one sale was recorded twice (an order and a jar sale). The "from orders / other" split on Sales Insights makes it easy to spot.

## Currency

Amounts show in EUR with Irish formatting (`en-IE`), or in GBP (`en-GB`) for users marked as UK/NI residents in their profile. The CSV column header follows the same choice.

Update 04/11/2026 (WP06): Date and Amount stack into one column below 640px.
