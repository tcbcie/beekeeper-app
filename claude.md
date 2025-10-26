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
  - Number of grafts tracking
  - Acceptance check date (auto-calculated as graft date + 1 day)
  - Expected emergence date tracking
  - Batch status management (grafted, emerged, mated, completed)
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

### October 26, 2025 - Queen Rearing Enhancements
- **Field Renaming**:
  - "Mother Queen" → "Breeder Queen" (now explicitly optional)
  - "Cell Count" → "Number of Grafts"
- **New Acceptance Check Feature**:
  - Added `acceptance_check_date` field to rearing_batches table
  - Auto-calculates to Graft Date + 1 day with manual override capability
  - Displays in batch list table
  - Database migration: `sql/add_acceptance_check_to_rearing_batches.sql`
- **Implementation Details**:
  - useEffect with infinite loop prevention for auto-calculation
  - Only auto-calculates when creating new batches (not editing)
  - Updated TypeScript interfaces and form handling

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

2. **Queen Rearing Acceptance Check** (`sql/add_acceptance_check_to_rearing_batches.sql`):
```sql
ALTER TABLE public.rearing_batches
ADD COLUMN IF NOT EXISTS acceptance_check_date DATE;
```

---

**Last Updated**: October 26, 2025
**Version**: Queen-Rearing-Enhancements
