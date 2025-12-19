// Simplified schema description for LLM context when generating SQL queries
// This helps the AI understand the database structure without exposing full DDL

export const DB_SCHEMA = `
Database Schema for Beekeeping App:

TABLES:

1. apiaries
   - id (uuid, primary key)
   - user_id (uuid)
   - name (text)
   - location (text)
   - city (text)
   - eircode (text) - Irish postal code
   - latitude, longitude (numeric) - GPS coordinates
   - share_location (boolean)
   - notes (text)
   - created_at (timestamp)

2. hives
   - id (uuid, primary key)
   - user_id (uuid)
   - apiary_id (uuid, foreign key to apiaries)
   - hive_number (text) - e.g., "H1", "Hive 2"
   - hive_type (text) - e.g., "National", "Langstroth"
   - status (text) - hive status
   - configuration (jsonb)
   - colony_id (text) - colony identifier
   - colony_established_date (date)
   - queen_id (uuid)
   - queen_marked (boolean)
   - queen_marking_color (text)
   - queen_mated (boolean)
   - queen_clipped (boolean)
   - queen_installed_date (date)
   - archived_at (timestamp) - NULL if active, has date if archived
   - archive_reason_id (uuid)
   - archive_notes (text)
   - notes (text)
   - created_at (timestamp)

3. queens
   - id (uuid, primary key)
   - user_id (uuid)
   - queen_number (text)
   - source (text) - e.g., "Purchased", "Swarm", "Raised"
   - subspecies (text) - e.g., "AMM", "Italian", "Carniolan"
   - marking_color (text)
   - birth_date (date)
   - status (text) - e.g., "Active", "Superseded", "Dead"
   - mother_id (uuid, self-reference for lineage)
   - father_id (uuid)
   - lineage (text)
   - queen_clipped (boolean)
   - mated_at_eircode (text)
   - performance_notes (text)
   - created_at (timestamp)

4. inspections
   - id (uuid, primary key)
   - user_id (uuid)
   - hive_id (uuid, foreign key to hives)
   - colony_id (text)
   - inspection_date (date)
   - inspection_time (time)
   - weather_temp (numeric)
   - weather_condition (text)
   - weather_humidity (numeric)
   - weather_wind_speed (numeric)
   - queen_seen (boolean)
   - eggs_present (boolean)
   - brood_pattern_rating (integer, 1-5 scale)
   - temperament_rating (integer, 1-5 scale)
   - population_strength (text)
   - honey_stores (text)
   - disease_issues (text)
   - frames_brood (integer)
   - frames_drawn (integer)
   - frames_foundation (integer)
   - store_frames (integer)
   - honey_supers (integer)
   - drone_frames (integer)
   - drone_brood_present (boolean)
   - drones_present (boolean)
   - weight (numeric)
   - queen_cups (boolean)
   - queen_cups_number (integer)
   - swarm_cells (boolean)
   - swarm_cells_number (integer)
   - supercedure_cells (boolean)
   - supercedure_cells_number (integer)
   - emergency_cells (boolean)
   - emergency_cells_number (integer)
   - calmness (integer)
   - swarming_tendency (integer)
   - notes (text)
   - image_url (text)
   - created_at (timestamp)

5. varroa_checks
   - id (uuid, primary key)
   - user_id (uuid)
   - hive_id (uuid, foreign key to hives)
   - colony_id (text)
   - check_date (date)
   - method (text) - e.g., "Alcohol Wash", "Sugar Roll", "Natural Drop"
   - mites_count (integer) - number of mites found
   - sample_size (integer)
   - infestation_rate (numeric) - calculated percentage
   - action_threshold_reached (boolean)
   - notes (text)
   - created_at (timestamp)

6. varroa_treatments
   - id (uuid, primary key)
   - user_id (uuid)
   - hive_id (uuid, foreign key to hives)
   - colony_id (text)
   - treatment_date (date)
   - treatment_type (text) - e.g., "Oxalic Acid", "Apivar", "Apiguard"
   - dosage (text)
   - temperature (numeric)
   - weather_conditions (text)
   - notes (text)
   - created_at (timestamp)

7. harvests
   - id (uuid, primary key)
   - user_id (uuid)
   - hive_id (uuid, foreign key to hives)
   - colony_id (text)
   - harvest_date (date)
   - honey_weight (numeric)
   - wax_weight (numeric)
   - unit (text) - e.g., "kg", "lbs"
   - frames_harvested (integer)
   - notes (text)
   - created_at (timestamp)

8. feedings
   - id (uuid, primary key)
   - user_id (uuid)
   - hive_id (uuid, foreign key to hives)
   - colony_id (text)
   - feed_date (date)
   - feed_type (text) - e.g., "Sugar Syrup", "Fondant", "Pollen Patty"
   - quantity (numeric)
   - unit (text) - e.g., "kg", "liters"
   - notes (text)
   - created_at (timestamp)

9. rearing_batches
   - id (uuid, primary key)
   - user_id (uuid)
   - batch_name (text)
   - graft_date (date)
   - mother_queen_id (uuid, foreign key to queens)
   - starter_colony_hive_id (uuid)
   - cell_count (integer)
   - grafts_accepted (integer)
   - acceptance_check_date (date)
   - emergence_date (date)
   - queens_hatched (integer)
   - queens_mated (integer)
   - status (text) - e.g., "In Progress", "Completed", "Failed"
   - notes (text)
   - created_at (timestamp)

IMPORTANT NOTES FOR SQL GENERATION:
- Always filter by user_id = '$USER_ID' (will be replaced with actual user ID)
- Use proper date filtering: check_date >= 'YYYY-MM-DD'
- For active hives only: archived_at IS NULL
- For archived hives: archived_at IS NOT NULL
- Join tables using foreign keys: hive_id, apiary_id, etc.
- For counts: SELECT COUNT(*) FROM table WHERE user_id = '$USER_ID'
- For varroa data, use mites_count (not mite_count)
- For feeding dates, use feed_date (not feeding_date)
`

export default DB_SCHEMA
