# Demo Account

## Overview
A demonstration account exists for showcasing the HiveCraic app without exposing personal data.

## Credentials
- **Email:** `demo@hivecraic.com`
- **Password:** `HiveCraic2026!`

## Account Details
- **User ID:** `10b5ecdd-d1f8-41a0-b756-73ac1f5c68d1`
- **Role:** User
- **Subscription Expiry:** 2099-12-31 (effectively never expires)

## Data
The demo account contains a full copy of production data (as of 14 Feb 2026):

| Table | Records |
|-------|---------|
| Apiaries | 3 |
| Hives | 11 |
| Queens | 11 |
| Colonies | 11 |
| Inspections | 44 |
| Varroa Checks | 55 |
| Varroa Treatments | 18 |
| Harvests | 2 |
| Colony Movements | 11 |
| Tasks/Events | 8 |
| GDD Records | 22 |
| Financial Records | 11 |
| Purchase Items | 1 |
| Bulk Containers | 1 |
| Batch Runs | 2 |
| Hive Config History | 10 |
| Container Harvests | 1 |
| Batch Containers | 2 |

## Data Differences from Source
- Colony numbers have a 'D' suffix (e.g. `COL-64-DAD` instead of `COL-64-DA`)
- Batch codes and trace codes have a 'D' suffix
- `queens.batch_id` is NULL (rearing batches were not copied)
- All user/owner references point to the demo user ID

## Refreshing Demo Data
To refresh the demo data, delete all records owned by the demo user, then re-run the data copy process. The auth user and profile can be kept.

## Important: Manual Auth User Creation Notes
When manually inserting into `auth.users`, two things are required for login to work:
1. **`auth.identities` record** — Supabase requires an identity row linked to the user for password-based auth. Without it, login returns a 500 error.
2. **No NULL string columns** — The `email_change` and `email_change_token_new` columns must be set to `''` (empty string), not NULL. Supabase's Go auth server cannot scan NULL into Go `string` types.

## Security Notes
- The demo account has standard RLS policies applied
- It cannot see or modify data from other users
- Password should be changed if the account is used in a public-facing context
