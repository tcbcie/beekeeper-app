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
- `/dashboard/hives` - Manage apiaries and hives
- `/dashboard/inspections` - Record and view hive inspections
- `/dashboard/settings` - User settings, categories, support tickets
- `/dashboard/varroa-check` - Track varroa mite infestations
- `/dashboard/varroa-treatment` - Log varroa treatment applications

## Features

### Hives Management
- Create and manage hives within apiaries
- Track queen assignment
- View inspection averages (brood frames, temperament, population, etc.)
- Date range filtering (3 months, 6 months, 1 year, custom)
- Right-sized broodbox tracking

### Inspections
- Detailed hive inspection records
- Track queen presence, eggs, diseases
- Weather information (temperature, conditions, humidity, wind speed)
- Weather condition indicators
- Frame-level observations

### Varroa Management
- **Varroa Checks**: Track mite counts and infestation rates
- Supports multiple check methods (floor board screening, alcohol wash, etc.)
- Auto-calculation of infestation rates
- **Varroa Treatment**: Log treatment applications
- Track treatment products, dates, and effectiveness

### Support Ticket System
- Users can submit support tickets (problems/suggestions)
- Admin dashboard for ticket management
- Ticket filtering by status (open, in_progress, resolved, closed)
- Priority levels (low, normal, high, urgent)
- Admin notes visible to users
- Ticket statistics and analytics

### User Management
- Role-based access (User, Admin)
- User profile management with email support
- Settings and preferences

## Important Implementation Notes

### React Hooks Best Practices
- All data-fetching functions use `useCallback` with proper dependency arrays
- Functions are defined before they're used in useEffect dependencies
- Proper memoization prevents unnecessary re-renders

### TypeScript
- Strict type checking enabled
- Proper interfaces for all data structures:
  - `Hive`, `Apiary`, `Queen`, `Inspection`
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

## Recent Changes (Latest Session)

### React Hooks Fixes
- Fixed useCallback dependencies throughout dashboard pages
- Reordered function definitions to prevent initialization errors
- Proper dependency arrays in all useEffect hooks

### Support Ticket System Improvements
- Fixed ticket editing UI - now shows full ticket details in edit mode
- Fixed user email display with fallback to profiles table
- Enhanced Edit/Delete buttons with better visibility
- TypeScript type safety improvements
- Improved error handling in ticket fetching

### Cross-Origin Configuration
- Added allowedDevOrigins for local network development

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

---

**Last Updated**: October 25, 2025
**Version**: Post-ticket-management-fixes
