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

- Income/Expense toggle with color coding (green/red)
- Dropdown categories specific to beekeeping
- Summary cards: Total Income, Total Expenses, Net Profit/Loss
- Time period filtering
- Edit and delete records
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

## Currency

All amounts are in EUR with Irish locale formatting (`en-IE`).
