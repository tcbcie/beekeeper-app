# Beekeeper App - Claude Project Documentation

## Project Overview
A comprehensive beekeeping management system built with Next.js, React, TypeScript, and Supabase. The application helps beekeepers track hives, inspections, queens, varroa treatments, and manage support tickets.

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database, Auth, RLS)
- **Icons**: Lucide React
- **State Management**: React hooks with useCallback optimization
- **Database**: PostgreSQL with Row-Level Security (RLS)

## Project Structure

### Core Directories
- `src/app/` - Next.js app directory with routing
- `src/app/dashboard/` - Dashboard pages (hives, inspections, settings, varroa management)
- `src/components/` - Reusable React components (Sidebar, MobileDrawer, etc.)
- `src/lib/` - Utility functions (auth, supabase client)
- `sql/` - Database migrations and SQL scripts

### Key Pages
- `/dashboard` - Overview dashboard with statistics
- `/dashboard/hives` - Manage apiaries and hives
- `/dashboard/inspections` - Record and view hive inspections
- `/dashboard/queens` - Manage queen bee records
- `/dashboard/batches` - Queen rearing planning and selection
- `/dashboard/profile` - User profile management and data export
- `/dashboard/settings` - Admin-only settings (user management, categories, tickets)
- `/dashboard/varroa-check` - Track varroa mite infestations
- `/dashboard/varroa-treatment` - Log varroa treatment applications
- `/dashboard/about` - App information and support

## Features

### Hives Management
- Create and manage hives within apiaries
- Track queen assignment
- View inspection averages (brood frames, temperament, population, etc.)
- Date range filtering (3 months, 6 months, 1 year, custom)
- Right-sized broodbox tracking

### Queen Management
- Track individual queen records
- Record queen marking, clipping, mating information
- Track lineage and breeding history
- Performance notes and subspecies tracking

### Queen Rearing
- **Planning Tab**: Create and manage queen rearing batches
  - Track graft date and breeder queen (optional)
  - **Timeline Section** (purple box): All dates in chronological order
    - Graft Date (Day 0) - required
    - Acceptance Check (Day 1) - auto-calculated
    - 1st Option to Cage (Day 5) - auto-calculated
    - 2nd Option to Cage (Day 10) - auto-calculated
    - Expected Day to Hatch (Day 12) - auto-calculated
  - **Starter Colony Section** (green box): Select apiary and hive for starter colony
  - **Batch Quantities Section** (blue box): Track progression with +/- buttons
    - Number of Grafts → Grafts Accepted → Queens Hatched → Queens Mated
  - Breeder queen dropdown shows: "Queen# (Apiary - Hive#)"
  - Dates displayed in Irish format (DD/MM/YYYY) in table
- **Selection Tab**: (Coming soon) Track and select best performing queens

### Inspections
- Detailed hive inspection records
- Track queen presence, eggs, diseases
- Weather information (temperature, conditions, humidity, wind speed)
- Weather condition indicators
- Frame-level observations
- Right-sized frame tracking

### Varroa Management
- **Varroa Checks**: Track mite counts and infestation rates
- Supports multiple check methods (floor board screening, alcohol wash, etc.)
- Auto-calculation of infestation rates
- **Varroa Treatment**: Log treatment applications
- Track treatment products, dates, and effectiveness

### User Profile & Data Management
- **Personal Information**: Edit first name, last name, mobile number
- **Account Information**: View email, user ID, role, account creation date
- **Data Export**:
  - Export all personal beekeeping data in JSON or CSV format
  - Includes apiaries, hives, queens, inspections, varroa checks/treatments
  - Date-stamped export files
- **Additional Settings**: Placeholders for password change, notifications, privacy

### Support Ticket System
- Users can submit support tickets (problems/suggestions)
- Admin dashboard for ticket management
- Ticket filtering by status (open, in_progress, resolved, closed)
- Priority levels (low, normal, high, urgent)
- Admin notes visible to users
- Ticket statistics and analytics

### Admin Features
- **User Management**: View and manage all user accounts, assign roles
- **Dropdown Management**: Configure custom dropdowns for categories and values
- **Support Ticket Management**: Full ticket administration
- **Database Export**: Full SQL database backup export

## Important Implementation Notes

### React Hooks Best Practices
- All data-fetching functions use `useCallback` with proper dependency arrays
- Functions are defined before they're used in useEffect dependencies
- Proper memoization prevents unnecessary re-renders

### TypeScript
- Strict type checking enabled
- Proper interfaces for all data structures:
  - `Hive`, `Apiary`, `Queen`, `Inspection`
  - `Batch` (Queen Rearing), `FormData`
  - `VarroaCheck`, `VarroaTreatment`
  - `SupportTicket`, `TicketUpdate`
  - `UserProfile`, `DropdownCategory`, `DropdownValue`

### Database
- Row-Level Security (RLS) policies enforce user data isolation
- User IDs from Supabase Auth are used for all data ownership
- Support for multiple user profiles (admin, regular users)
- Email lookup from both `user_profiles` and `profiles` tables

### Support Tickets
- Tickets are created without requiring admin/FK relationships
- User emails fetched from fallback sources:
  1. `user_profiles.email` where `user_profiles.user_id = ticket.user_id`
  2. `profiles.email` where `profiles.id = ticket.user_id` (fallback)

## Configuration

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Next.js Config
- `allowedDevOrigins: ['http://192.168.100.50:3000']` - Local network access
- `remotePatterns` for Supabase image storage

## Common Tasks

### Adding a New Feature
1. Create the page/component in appropriate directory
2. Set up useCallback functions for data fetching
3. Define TypeScript interfaces
4. Add Supabase queries with RLS in mind
5. Test with proper error handling

### Database Migrations
1. Create SQL migration file in `sql/` directory
2. Include comments explaining changes
3. Test migrations in development
4. Document any RLS policy changes

### Debugging Tips
- Check browser console for API errors
- Verify Supabase RLS policies are correct
- Check user authentication status
- Validate TypeScript types match database schema
- Use React DevTools for state/props debugging

## Recent Changes

### October 26, 2025 - Queen Rearing Complete Overhaul
- **Timeline Section** (Purple Box):
  - Added 5 date fields in chronological order displayed side-by-side
  - Graft Date (Day 0) - required field
  - Acceptance Check (Day 1) - auto-calculated from graft date
  - 1st Option to Cage (Day 5) - NEW auto-calculated field
  - 2nd Option to Cage (Day 10) - NEW auto-calculated field
  - Expected Day to Hatch (Day 12) - auto-calculated, renamed from "Emergence Date"
  - All auto-calculations use useEffect with infinite loop prevention
  - Helper text shows calculation formula (e.g., "Graft + 5 days")
  - Database migrations: `add_acceptance_check_to_rearing_batches.sql`, `add_cage_dates_to_rearing_batches.sql`

- **Starter Colony Section** (Green Box):
  - Cascading dropdowns for selecting apiary then hive
  - Apiary dropdown populated from user's apiaries
  - Hive dropdown filtered by selected apiary (disabled until apiary selected)
  - Helper text: "Select an apiary first" when hive disabled
  - Stores `starter_colony_hive_id` in database
  - Database migration: `add_starter_colony_to_rearing_batches.sql`

- **Batch Quantities Section** (Blue Box):
  - Renamed from "Queen Rearing Progression"
  - Four fields with plus/minus buttons for easy incrementing
  - Number of Grafts → Grafts Accepted → Queens Hatched → Queens Mated
  - Vertical layout with spacing for better visual hierarchy
  - Removed Status field completely from form and table
  - Database migration: `add_queen_rearing_progression_fields.sql`

- **Field Improvements**:
  - Renamed: "Mother Queen" → "Breeder Queen" (optional)
  - Renamed: "Cell Count" → "Number of Grafts"
  - Renamed: "Expected Emergence Date" → "Expected Day to Hatch"
  - Removed: Status dropdown completely

- **Breeder Queen Dropdown Enhancement**:
  - Now shows context: "Queen# (Apiary - Hive#)"
  - Example: "Q2024-001 (North Field - H-12)"
  - Two-query approach: fetch queens, then join with hives/apiaries
  - Handles queens not in hives gracefully

- **Date Formatting**:
  - Added Irish format (DD/MM/YYYY) for Graft Date and Acceptance Check in table
  - Created `formatDateIrish()` helper function
  - Handles null dates with '-' placeholder

- **Form Organization**:
  - Added tagline: "3-5-8 - The Queen is made!"
  - Color-coded sections: Timeline (purple), Starter Colony (green), Batch Quantities (blue)
  - Responsive grid layouts that stack on mobile
  - Improved visual hierarchy with grouped sections

- **Technical Implementation**:
  - Updated TypeScript interfaces: Batch, FormData, Queen, Apiary, Hive
  - Added useEffect hooks for auto-calculating all 4 dates
  - Updated handleSubmit, handleEdit, resetForm with all new fields
  - Added fetchApiaries and fetchHives functions with useCallback
  - Implemented hive filtering based on selected apiary
  - Proper dependency arrays throughout to prevent re-renders

### October 25, 2025 - Profile & Data Export
- **Moved Profile Features**:
  - Relocated user profile editing from Settings to dedicated Profile page
  - Moved personal data export from Settings to Profile page
- **Profile Management**:
  - Added editable fields: first name, last name, mobile number
  - Database migration: `sql/add_profile_fields.sql`
- **Data Export**:
  - Export all user data in JSON or CSV format
  - Includes: apiaries, hives, queens, inspections, varroa checks/treatments
- **Settings Page Cleanup**:
  - Now exclusively for admin features
  - Removed 440+ lines of user-facing code

### October 25, 2025 - React Hooks & Support Tickets
- **React Hooks Fixes**:
  - Fixed useCallback dependencies throughout dashboard pages
  - Reordered function definitions to prevent initialization errors
  - Proper dependency arrays in all useEffect hooks
- **Support Ticket System**:
  - Fixed ticket editing UI with full ticket details display
  - Fixed user email display with fallback to profiles table
  - Enhanced Edit/Delete buttons with better visibility
  - TypeScript type safety improvements

## Notes for Future Development

### Performance Optimizations
- Consider caching frequently accessed data
- Implement pagination for large ticket/inspection lists
- Optimize image loading from Supabase storage

### Feature Enhancements
- Export functionality for inspections and treatments
- Advanced filtering and search across all sections
- Notification system for important updates
- Data visualization (charts/graphs) for trends

### Code Quality
- Maintain strict TypeScript types
- Keep useCallback dependencies optimized
- Write unit tests for utility functions
- Document complex database queries

## Support & Maintenance

### Known Issues
- None at this time

### Deployment
- Deploy via Vercel (recommended for Next.js)
- Ensure environment variables are set
- Test RLS policies in production environment
- Monitor Supabase quota usage

## Database Migrations

### Pending Migrations
Run these in Supabase SQL Editor if not already applied:

1. **Profile Fields** (`sql/add_profile_fields.sql`):
```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);
```

2. **Queen Rearing - Acceptance Check** (`sql/add_acceptance_check_to_rearing_batches.sql`):
```sql
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS acceptance_check_date DATE;
```

3. **Queen Rearing - Progression Fields** (`sql/add_queen_rearing_progression_fields.sql`):
```sql
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS grafts_accepted INTEGER,
ADD COLUMN IF NOT EXISTS queens_hatched INTEGER,
ADD COLUMN IF NOT EXISTS queens_mated INTEGER;
```

4. **Queen Rearing - Starter Colony** (`sql/add_starter_colony_to_rearing_batches.sql`):
```sql
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS starter_colony_hive_id UUID REFERENCES public.hives(id) ON DELETE SET NULL;
```

5. **Queen Rearing - Cage Dates** (`sql/add_cage_dates_to_rearing_batches.sql`):
```sql
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS first_option_to_cage_date DATE,
ADD COLUMN IF NOT EXISTS second_option_to_cage_date DATE;
```

---

**Last Updated**: October 26, 2025
**Version**: Queen-Rearing-Complete-Overhaul
