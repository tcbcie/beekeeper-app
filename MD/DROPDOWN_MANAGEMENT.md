# Dropdown Management System

## Overview

The Hive Craic application uses a consolidated dropdown management system that allows administrators to configure and manage dropdown values throughout the application from a single interface in **Settings → Dropdown Values**.

## Architecture

### Database Tables

**`dropdown_categories`** - Defines categories of dropdown values
- `id` (UUID) - Primary key
- `category_name` (TEXT) - Display name (e.g., "Queen Source")
- `category_key` (TEXT) - Code reference key (e.g., "queen_source")
- `description` (TEXT) - Optional description
- `created_at`, `updated_at` (TIMESTAMP) - Audit fields

**`dropdown_values`** - Individual values within each category
- `id` (UUID) - Primary key
- `category_id` (UUID) - Foreign key to dropdown_categories
- `value` (TEXT) - The actual dropdown option value
- `display_order` (INTEGER) - Sort order for display
- `is_active` (BOOLEAN) - Whether this option is currently available
- `created_at`, `updated_at` (TIMESTAMP) - Audit fields

### Key Features

✅ **Shared Across Users** - Dropdown categories and values are global, not per-user
✅ **Admin-Managed** - Only administrators can add, edit, or delete categories and values
✅ **Active/Inactive Toggle** - Values can be deactivated without deletion
✅ **Custom Ordering** - Display order can be customized for each value
✅ **Expandable** - Easy to add new categories as needed

## Currently Managed Dropdowns

### 1. Queen Source (`queen_source`)
**Purpose**: Where the queen came from
**Values**: Bred, Purchased, Swarm
**Used in**: Queen management forms

### 2. Queen Status (`queen_status`)
**Purpose**: Current status of the queen bee
**Values**: Active, Retired, Dead, Missing, etc.
**Used in**: Queen tracking and hive inspections

### 3. Honey Stores Level (`honey_stores_level`)
**Purpose**: Amount of honey stores during inspection
**Values**: Empty, Low, Medium, Full, Overflowing
**Used in**: Hive inspection forms

### 4. Bee Subspecies (`bee_subspecies`)
**Purpose**: Common bee subspecies and breeds
**Values**: Various bee breed names
**Used in**: Queen classification

### 5. Varroa Check Method (`varroa_check_method`)
**Purpose**: Methods for conducting varroa mite checks
**Values**: Alcohol Wash, Sugar Shake, Sticky Board, Drone Brood Inspection, Visual Inspection
**Used in**: Varroa check record forms

## NOT Managed by Dropdown System

The following items have their own dedicated management sections:

### Varroa Treatment Products
**Location**: Settings → Varroa Treatments
**Why Separate**: These are complex reference data with multiple fields (product name, active ingredients, dosage, temperature range, withdrawal periods, etc.)
**Table**: `varroa_treatment_products`

## How to Use the System

### For Administrators

1. **Navigate to Settings**
   - Go to Dashboard → Settings
   - Select "Dropdown Values" from the navigation

2. **Add a New Category**
   - Click "Add Category"
   - Enter:
     - **Category Name**: Display name (e.g., "Feeding Type")
     - **Category Key**: Code reference in snake_case (e.g., "feeding_type")
     - **Description**: Optional explanation
   - Click "Add Category"

3. **Manage Values**
   - Click on a category to expand it
   - Click "Add Value" to add new options
   - Enter the value and display order
   - Use edit/delete/activate/deactivate buttons as needed

4. **Best Practices**
   - Use clear, consistent naming
   - Keep values concise
   - Set logical display orders (1, 2, 3...)
   - Deactivate instead of delete when possible (preserves historical data)

### For Developers

#### Adding a New Dropdown Category

1. **Create SQL Script** (see `sql/ADD_VARROA_CHECK_METHOD_DROPDOWN.sql` as template):

```sql
DO $$
DECLARE
  category_id_var UUID;
BEGIN
  SELECT id INTO category_id_var
  FROM dropdown_categories
  WHERE category_key = 'your_category_key';

  IF category_id_var IS NULL THEN
    INSERT INTO dropdown_categories (category_name, category_key, description, created_at, updated_at)
    VALUES (
      'Your Category Name',
      'your_category_key',
      'Description of this category',
      NOW(),
      NOW()
    )
    RETURNING id INTO category_id_var;

    -- Insert default values
    INSERT INTO dropdown_values (category_id, value, display_order, is_active) VALUES
      (category_id_var, 'Option 1', 1, true),
      (category_id_var, 'Option 2', 2, true),
      (category_id_var, 'Option 3', 3, true);
  END IF;
END $$;
```

2. **Fetch Values in Your Component**:

```typescript
const [yourOptions, setYourOptions] = useState<string[]>([])

const fetchYourOptions = useCallback(async () => {
  try {
    const { data: category } = await supabase
      .from('dropdown_categories')
      .select('id')
      .eq('category_key', 'your_category_key')
      .single()

    if (category) {
      const { data: values } = await supabase
        .from('dropdown_values')
        .select('value')
        .eq('category_id', category.id)
        .eq('is_active', true)
        .order('display_order')

      if (values) {
        setYourOptions(values.map(v => v.value))
      }
    }
  } catch (error) {
    console.error('Error fetching options:', error)
  }
}, [])
```

3. **Use in Form**:

```tsx
<select>
  <option value="">Select option</option>
  {yourOptions.map((option) => (
    <option key={option} value={option}>{option}</option>
  ))}
</select>
```

## When to Use Dropdown System vs. Dedicated Section

### Use Dropdown System When:
- ✅ Simple list of values
- ✅ Single field per option
- ✅ Used for categorization or selection
- ✅ Doesn't require complex validation
- ✅ Examples: status values, types, categories, methods

### Use Dedicated Section When:
- ✅ Multiple fields per item (like treatment products with ingredients, dosage, etc.)
- ✅ Complex relationships to other data
- ✅ Requires special validation or business logic
- ✅ Reference data that needs detailed documentation
- ✅ Examples: varroa treatment products, user profiles, team management

## Migration Guide

To move an existing hardcoded dropdown to the management system:

1. Create SQL script to add category and default values
2. Run the script in Supabase
3. Update component to fetch values from database
4. Test that existing data still works
5. Document in this file

## Troubleshooting

**Issue**: Dropdown is empty in the UI
- Check category_key matches exactly (case-sensitive)
- Verify values have `is_active = true`
- Check browser console for fetch errors

**Issue**: Can't add new category
- Verify admin access
- Check category_key is unique
- Ensure using snake_case for category_key

**Issue**: Values not appearing in correct order
- Check `display_order` values
- Lower numbers appear first

## Future Enhancements

Potential improvements to consider:
- Bulk import/export of dropdown values
- Category grouping or hierarchical categories
- Value translations for internationalization
- Usage analytics (which values are most used)
- Dependency management (disable dependent values when parent is inactive)
