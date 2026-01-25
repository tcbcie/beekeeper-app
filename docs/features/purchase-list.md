# Purchase List Tool

## Overview
A tool for beekeepers to track items they need to purchase, with support for categories and priority levels.

## Features
- Add, edit, and delete purchase items
- Categorize items (Equipment, Protective Gear, Feed Supplies, etc.)
- Set priority levels (Low, Medium, High, Urgent)
- Track estimated prices
- Set due dates for purchases
- Mark items as purchased
- Filter by status (Pending, Purchased, All)
- Summary cards showing pending count, urgent count, and estimated total

## Database

### Table: `purchase_items`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to auth.users |
| name | TEXT | Item name (required) |
| quantity | NUMERIC(10,2) | Quantity to purchase |
| unit | TEXT | Unit of measurement |
| category_id | UUID | Reference to dropdown_values |
| supplier | TEXT | Supplier name |
| priority | TEXT | low, medium, high, urgent |
| status | TEXT | pending, purchased, cancelled |
| estimated_price | NUMERIC(10,2) | Estimated cost in EUR |
| actual_price | NUMERIC(10,2) | Actual cost when purchased |
| notes | TEXT | Additional notes |
| due_date | DATE | When item is needed by |
| purchased_date | DATE | When item was purchased |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### RLS Policy
Users can only manage their own purchase items via the `auth.uid() = user_id` policy.

## Categories
Located in `dropdown_values` table with `category_key = 'purchase_category'`:
- Equipment - Hives
- Equipment - Tools
- Equipment - Extraction
- Protective Gear
- Feed Supplies
- Treatments & Medications
- Packaging & Labels
- Queens & Bees
- Books & Training
- Other

## Components

### Location
`src/components/tools/PurchaseList/`

### Files
- `index.tsx` - Main component with list and state management
- `PurchaseItemForm.tsx` - Add/edit form with validation
- `PurchaseItemCard.tsx` - Individual item display with actions
- `PurchaseSummary.tsx` - Summary statistics cards

## Priority Color Scheme
| Priority | Border Color | Badge Style |
|----------|--------------|-------------|
| Urgent | red-500 | bg-red-100 text-red-800 |
| High | orange-500 | bg-orange-100 text-orange-800 |
| Medium | amber-500 | bg-amber-100 text-amber-800 |
| Low | gray-400 | bg-gray-100 text-gray-600 |

## Usage
Access via Tools page > Purchases tab

## Future Enhancements
- Supplier management with contact info
- Price comparison between suppliers
- Recurring items
- Integration with P&L (auto-create expense when purchased)
- Share lists with team members
