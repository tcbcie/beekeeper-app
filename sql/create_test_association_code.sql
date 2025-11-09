-- Create a test association code for testing
-- Run this in Supabase SQL Editor

-- First, let's check what associations exist
SELECT id, name, jurisdiction FROM beekeeping_associations LIMIT 5;

-- Create a test association code (replace the association_id with one from above)
-- You'll need to update the association_id UUID below with an actual association ID

/*
INSERT INTO registration_codes (
  code,
  description,
  code_type,
  association_id,
  subscription_expires_at,
  is_active,
  max_uses,
  current_uses
) VALUES (
  'ASHFORD2026',
  'Test Association Code for Ashford',
  'association',
  'YOUR-ASSOCIATION-UUID-HERE',  -- Replace with actual association UUID
  '2026-12-31 23:59:59+00',  -- Expires end of 2026
  true,
  100,  -- Max 100 uses
  0  -- No uses yet
);
*/

-- To create it properly:
-- 1. Run the SELECT query above to get an association ID
-- 2. Replace 'YOUR-ASSOCIATION-UUID-HERE' with the actual UUID
-- 3. Uncomment the INSERT statement
-- 4. Run the full query
