-- =====================================================
-- Hive Craic Database Export
-- Generated on: 2025-10-27T10:54:26.551Z
-- =====================================================

-- This export includes:
--   1. Complete database schema (tables, columns, constraints, indexes)
--   2. All data from all tables

-- To restore this database:
--   1. Create a new PostgreSQL database
--   2. Run this SQL file against the new database
--   3. Set up Supabase authentication and configure RLS policies

-- =====================================================
-- SECTION 1: DATABASE SCHEMA (from live database)
-- =====================================================


-- Table: apiaries
CREATE TABLE IF NOT EXISTS public.apiaries (
  id UUID,
  name TEXT,
  location TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  city TEXT,
  eircode TEXT,
  user_id UUID,
  CONSTRAINT apiaries_pkey PRIMARY KEY (id)
);


-- Table: hives
CREATE TABLE IF NOT EXISTS public.hives (
  id UUID,
  apiary_id UUID,
  hive_number TEXT,
  queen_id UUID,
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  queen_marked BOOLEAN,
  queen_marking_color TEXT,
  queen_mated BOOLEAN,
  queen_clipped BOOLEAN,
  colony_established_date DATE,
  queen_installed_date DATE,
  hive_type TEXT,
  configuration JSONB,
  CONSTRAINT hives_pkey PRIMARY KEY (id)
);


-- Table: queens
CREATE TABLE IF NOT EXISTS public.queens (
  id UUID,
  queen_number TEXT,
  mother_id UUID,
  father_id UUID,
  birth_date DATE,
  marking_color TEXT,
  source TEXT,
  subspecies TEXT,
  status TEXT,
  performance_notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  lineage TEXT,
  queen_clipped BOOLEAN,
  user_id UUID,
  mated_at_eircode TIMESTAMP WITH TIME ZONE,
  CONSTRAINT queens_pkey PRIMARY KEY (id)
);


-- Table: inspections
CREATE TABLE IF NOT EXISTS public.inspections (
  id UUID,
  hive_id UUID,
  inspection_date DATE,
  queen_seen BOOLEAN,
  eggs_present BOOLEAN,
  brood_pattern_rating INTEGER,
  temperament_rating INTEGER,
  population_strength INTEGER,
  honey_stores TEXT,
  disease_issues TEXT,
  notes TEXT,
  inspected_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  brood_frames TEXT,
  image_url TEXT,
  weather_temp INTEGER,
  weather_condition TEXT,
  weather_humidity INTEGER,
  weather_wind_speed INTEGER,
  inspection_time TEXT,
  user_id UUID,
  right_sized_frames TEXT,
  swarming_tendency INTEGER,
  calmness INTEGER,
  frames_foundation INTEGER,
  frames_brood INTEGER,
  frames_drawn INTEGER,
  honey_supers INTEGER,
  drone_frames INTEGER,
  store_frames INTEGER,
  recapping INTEGER,
  vsh INTEGER,
  smr INTEGER,
  afb_disease INTEGER,
  efb_disease INTEGER,
  chalkbrood_disease INTEGER,
  nosemosis_disease INTEGER,
  dwv_disease INTEGER,
  iapv_cbpv_disease INTEGER,
  CONSTRAINT inspections_pkey PRIMARY KEY (id)
);


-- Table: varroa_checks
CREATE TABLE IF NOT EXISTS public.varroa_checks (
  id UUID,
  hive_id UUID,
  check_date DATE,
  method TEXT,
  mites_count INTEGER,
  sample_size INTEGER,
  infestation_rate INTEGER,
  action_threshold_reached BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  CONSTRAINT varroa_checks_pkey PRIMARY KEY (id)
);


-- Table: varroa_treatments
CREATE TABLE IF NOT EXISTS public.varroa_treatments (
  id UUID,
  hive_id UUID,
  treatment_date DATE,
  treatment_type TEXT,
  product_name TEXT,
  dosage TEXT,
  temperature TEXT,
  weather_conditions TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  CONSTRAINT varroa_treatments_pkey PRIMARY KEY (id)
);


-- Table: dropdown_categories
CREATE TABLE IF NOT EXISTS public.dropdown_categories (
  id UUID,
  category_name TEXT,
  category_key TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT dropdown_categories_pkey PRIMARY KEY (id)
);


-- Table: dropdown_values
CREATE TABLE IF NOT EXISTS public.dropdown_values (
  id UUID,
  category_id UUID,
  value TEXT,
  display_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT dropdown_values_pkey PRIMARY KEY (id)
);


-- Table: rearing_batches
CREATE TABLE IF NOT EXISTS public.rearing_batches (
  id UUID,
  batch_name TEXT,
  mother_queen_id UUID,
  graft_date DATE,
  cell_count INTEGER,
  emergence_date DATE,
  status TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  acceptance_check_date DATE,
  grafts_accepted INTEGER,
  queens_hatched INTEGER,
  queens_mated INTEGER,
  starter_colony_hive_id UUID,
  first_option_to_cage_date DATE,
  second_option_to_cage_date DATE,
  enable_browser_notifications BOOLEAN,
  enable_email_digest BOOLEAN,
  CONSTRAINT rearing_batches_pkey PRIMARY KEY (id)
);


-- Table: support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID,
  user_id UUID,
  ticket_type TEXT,
  subject TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  admin_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);


-- Table: user_profiles
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  first_name TEXT,
  last_name TEXT,
  mobile_number TEXT,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id)
);

-- Note: This schema is inferred from live data.
-- Foreign key constraints, indexes, triggers, and RLS policies
-- should be recreated based on your specific requirements.

-- =====================================================
-- SECTION 2: DATA EXPORT
-- =====================================================


-- Table: apiaries
-- Records: 3

INSERT INTO apiaries (id, name, location, notes, created_by, created_at, city, eircode, user_id) VALUES ('53e4f795-25ee-4ae9-a881-fb783406ad00', 'Colm (AP01)', 'Back at the Field', '', NULL, '2025-10-19T16:49:50.574661+00:00', 'Annaghdown', 'H91 E6K2', '08e38bd9-30b0-4183-92c2-fc3b7600a46a');
INSERT INTO apiaries (id, name, location, notes, created_by, created_at, city, eircode, user_id) VALUES ('5233097b-500c-44cd-8da8-5f6b1fc7c03d', 'Tom (AP02)', 'Back at the field in the woods', '', NULL, '2025-10-18T17:46:53.711301+00:00', 'Annaghdown', 'H91 Y7W2', '08e38bd9-30b0-4183-92c2-fc3b7600a46a');
INSERT INTO apiaries (id, name, location, notes, created_by, created_at, city, eircode, user_id) VALUES ('7e73bb19-6bbc-49a3-b160-66e41ac99c1b', 'Home (AP03) ', '', '', NULL, '2025-10-25T15:11:04.630101+00:00', 'Annaghdown', 'H91 R9T8', '08e38bd9-30b0-4183-92c2-fc3b7600a46a');


-- Table: hives
-- Records: 6

INSERT INTO hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration) VALUES ('7b67eb2c-05cb-4e41-95a0-1e2e8855fdae', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '37-DA (R3)', '14378b9c-ea72-4bd9-b8a4-e983bf621dbe', 'active', '', '2025-10-19T19:15:57.185342+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, '', false, false, '2023-08-07', '2025-08-07', 'Production', '{"feeder":false,"brood_boxes":1,"feeder_type":"","honey_supers":0,"queen_excluder":false,"entrance_reducer":false,"varroa_mesh_floor":"closed","right_sized_broodbox":true}');
INSERT INTO hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration) VALUES ('9cf84ad7-5030-4e4b-b7dc-6a15315d1f7c', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '64-DA (R1)', '728b4ed3-3c7e-4db3-8e26-b0faa8fa0450', 'active', '', '2025-10-19T14:55:17.31296+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, '', false, false, '2025-07-13', '2025-06-30', 'Production', '{"feeder":false,"brood_boxes":1,"feeder_type":"","honey_supers":0,"queen_excluder":false,"entrance_reducer":false,"varroa_mesh_floor":"closed","right_sized_broodbox":true}');
INSERT INTO hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration) VALUES ('83fd855e-18f8-4e64-ba12-3df41493fe1c', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '76-DA (R2)', '2a97687a-90f3-495d-9bd5-de519f275fab', 'active', '', '2025-10-19T18:57:35.281915+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, '', false, false, '2024-09-18', '2025-06-01', 'Production', '{"feeder":false,"brood_boxes":1,"feeder_type":"","honey_supers":0,"queen_excluder":false,"entrance_reducer":false,"varroa_mesh_floor":"closed","right_sized_broodbox":true}');
INSERT INTO hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration) VALUES ('24e85d09-86d7-4c7f-991b-f229d351c98f', '7e73bb19-6bbc-49a3-b160-66e41ac99c1b', '60-MN', NULL, 'active', '', '2025-10-25T17:42:06.486449+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', true, 'Blue', false, false, '2025-10-25', '2025-10-25', 'Split', '{"feeder":false,"brood_boxes":3,"feeder_type":"","honey_supers":0,"queen_excluder":false,"entrance_reducer":true,"varroa_mesh_floor":"closed","right_sized_broodbox":false}');
INSERT INTO hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration) VALUES ('ef58668a-93a0-4c3d-aafe-e114de245152', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '26-DA (R4)', 'ae42216a-2e8f-497f-a6de-fa096f0a6846', 'active', '', '2025-10-19T19:22:24.027626+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, '', false, false, '2024-06-02', '2025-07-05', 'Production', '{"feeder":false,"brood_boxes":1,"feeder_type":"","honey_supers":0,"queen_excluder":false,"entrance_reducer":false,"bottom_board_type":"screened","varroa_mesh_floor":"closed","right_sized_broodbox":true}');
INSERT INTO hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration) VALUES ('3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '53e4f795-25ee-4ae9-a881-fb783406ad00', '29-DA (R1R2)', 'b27cff7f-562b-4fcc-a8af-24968fe507a4', 'active', '', '2025-10-19T21:30:18.960898+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, '', false, false, '2024-05-01', '2024-06-09', 'Production', '{"feeder":false,"brood_boxes":1,"feeder_type":"","honey_supers":0,"queen_excluder":false,"entrance_reducer":false,"varroa_mesh_floor":"closed","right_sized_broodbox":true}');


-- Table: queens
-- Records: 5

INSERT INTO queens (id, queen_number, mother_id, father_id, birth_date, marking_color, source, subspecies, status, performance_notes, created_by, created_at, lineage, queen_clipped, user_id, mated_at_eircode) VALUES ('728b4ed3-3c7e-4db3-8e26-b0faa8fa0450', '9B', NULL, NULL, '2025-08-09', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', 'Notes', NULL, '2025-10-18T16:36:17.458048+00:00', 'RZ023=.25-RZ018xOP(HD)-RZ026xOP', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 XT7F');
INSERT INTO queens (id, queen_number, mother_id, father_id, birth_date, marking_color, source, subspecies, status, performance_notes, created_by, created_at, lineage, queen_clipped, user_id, mated_at_eircode) VALUES ('b27cff7f-562b-4fcc-a8af-24968fe507a4', 'n/a', NULL, NULL, '2025-07-05', 'Blue', 'Swarm Cell', 'Apis mellifera mellifera (AMM)', 'active', '', NULL, '2025-10-19T21:34:08.241672+00:00', 'RZ029=.25-RZ29xOP(AN).24-RZ037xOP', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 R9T8');
INSERT INTO queens (id, queen_number, mother_id, father_id, birth_date, marking_color, source, subspecies, status, performance_notes, created_by, created_at, lineage, queen_clipped, user_id, mated_at_eircode) VALUES ('ae42216a-2e8f-497f-a6de-fa096f0a6846', '1B', NULL, NULL, '2025-07-05', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', 'Crafted from 26-DA mated at the Clubs Apiary Claringbridge', NULL, '2025-10-19T19:31:00.539698+00:00', 'RZ026=.25-RZ026xOP(CG)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 RW3Y');
INSERT INTO queens (id, queen_number, mother_id, father_id, birth_date, marking_color, source, subspecies, status, performance_notes, created_by, created_at, lineage, queen_clipped, user_id, mated_at_eircode) VALUES ('14378b9c-ea72-4bd9-b8a4-e983bf621dbe', '15B', NULL, NULL, '2025-10-09', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', '', NULL, '2025-10-19T19:19:18.128244+00:00', 'RZ037=.25-RZ018xOP(HD)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 XT7F');
INSERT INTO queens (id, queen_number, mother_id, father_id, birth_date, marking_color, source, subspecies, status, performance_notes, created_by, created_at, lineage, queen_clipped, user_id, mated_at_eircode) VALUES ('2a97687a-90f3-495d-9bd5-de519f275fab', 'n/a', NULL, NULL, '2025-07-05', 'Blue', 'Swarm Cell', 'Apis mellifera mellifera (AMM)', 'active', '', NULL, '2025-10-19T18:59:57.965536+00:00', 'RZ076=.25-RZ076XOP(AN)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 E6K2');


-- Table: inspections
-- Records: 5

INSERT INTO inspections (id, hive_id, inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_stores, disease_issues, notes, inspected_by, created_at, brood_frames, image_url, weather_temp, weather_condition, weather_humidity, weather_wind_speed, inspection_time, user_id, right_sized_frames, swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn, honey_supers, drone_frames, store_frames, recapping, vsh, smr, afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease) VALUES ('37edb233-f681-43b9-b3b8-6d158dc4f822', '9cf84ad7-5030-4e4b-b7dc-6a15315d1f7c', '2025-10-19', false, false, 0, 0, 0, '', '', 'Move to AP02.', NULL, '2025-10-19T15:33:22.749204+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '14:26:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0);
INSERT INTO inspections (id, hive_id, inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_stores, disease_issues, notes, inspected_by, created_at, brood_frames, image_url, weather_temp, weather_condition, weather_humidity, weather_wind_speed, inspection_time, user_id, right_sized_frames, swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn, honey_supers, drone_frames, store_frames, recapping, vsh, smr, afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease) VALUES ('cbcd4648-6608-41ac-bd23-0d752ac215cb', '83fd855e-18f8-4e64-ba12-3df41493fe1c', '2025-10-19', false, false, 0, 0, 0, '', '', 'Moved hive to AP02.', NULL, '2025-10-19T19:05:17.786494+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '13:27:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0);
INSERT INTO inspections (id, hive_id, inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_stores, disease_issues, notes, inspected_by, created_at, brood_frames, image_url, weather_temp, weather_condition, weather_humidity, weather_wind_speed, inspection_time, user_id, right_sized_frames, swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn, honey_supers, drone_frames, store_frames, recapping, vsh, smr, afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease) VALUES ('0ef27d9c-1009-48ea-9a13-e5a14772a333', 'ef58668a-93a0-4c3d-aafe-e114de245152', '2025-10-19', false, false, 0, 0, 0, '', '', 'Moved hive to AP02.', NULL, '2025-10-19T19:53:51.112782+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '14:27:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0);
INSERT INTO inspections (id, hive_id, inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_stores, disease_issues, notes, inspected_by, created_at, brood_frames, image_url, weather_temp, weather_condition, weather_humidity, weather_wind_speed, inspection_time, user_id, right_sized_frames, swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn, honey_supers, drone_frames, store_frames, recapping, vsh, smr, afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease) VALUES ('267d553b-7ba4-4e4c-8a97-23774d7152d8', '7b67eb2c-05cb-4e41-95a0-1e2e8855fdae', '2025-10-19', false, false, 0, 0, 0, '', '', 'Moved hive to AP02.', NULL, '2025-10-19T19:55:44.135784+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '14:27:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0);
INSERT INTO inspections (id, hive_id, inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_stores, disease_issues, notes, inspected_by, created_at, brood_frames, image_url, weather_temp, weather_condition, weather_humidity, weather_wind_speed, inspection_time, user_id, right_sized_frames, swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn, honey_supers, drone_frames, store_frames, recapping, vsh, smr, afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease) VALUES ('167b512b-2b57-4bf8-85ac-601b4a36fcba', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-20', false, false, 0, 4, 2, '', '', '', NULL, '2025-10-20T13:22:58.05602+00:00', NULL, 'https://tbhofdmfzwibysnnssnx.supabase.co/storage/v1/object/public/inspection-images/inspections/vky67x94w5h_1760966555279.jpg', 10, 'Slight Rain', 91, 20, '14:21:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 10, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0);


-- Table: varroa_checks
-- Records: 2

INSERT INTO varroa_checks (id, hive_id, check_date, method, mites_count, sample_size, infestation_rate, action_threshold_reached, notes, created_at, updated_at, user_id) VALUES ('214c8bc3-4a3d-4173-9551-0e0d1d39b432', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-20', 'Floor Board Screening', 12, 4, 3, false, '', '2025-10-20T13:20:59.704891+00:00', '2025-10-21T18:58:16.415055+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a');
INSERT INTO varroa_checks (id, hive_id, check_date, method, mites_count, sample_size, infestation_rate, action_threshold_reached, notes, created_at, updated_at, user_id) VALUES ('a7aa60b5-af49-4d74-b3a9-f657a96140b4', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-25', 'Floor Board Screening', 7, 5, 1.4, false, '', '2025-10-25T15:38:03.894585+00:00', '2025-10-25T15:38:03.894585+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a');


-- Table: varroa_treatments
-- Records: 1

INSERT INTO varroa_treatments (id, hive_id, treatment_date, treatment_type, product_name, dosage, temperature, weather_conditions, notes, created_at, updated_at, user_id) VALUES ('0e9d7986-3629-40b9-9df6-144a0a61eefc', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-20', 'Oxalic Acid', 'BienenWohl', '30ml', NULL, '', '', '2025-10-20T13:19:36.291603+00:00', '2025-10-21T18:58:16.415055+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a');


-- Table: dropdown_categories
-- Records: 5

INSERT INTO dropdown_categories (id, category_name, category_key, description, created_at, updated_at) VALUES ('66b34a67-7555-4efa-b841-386d08b38d53', 'Queen Source', 'queen_source', 'Where the queen came from (bred, purchased, or swarm)', '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_categories (id, category_name, category_key, description, created_at, updated_at) VALUES ('51919bd1-f02b-4579-bd94-a8aadb9083fa', 'Queen Status', 'queen_status', 'Current status of the queen bee', '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_categories (id, category_name, category_key, description, created_at, updated_at) VALUES ('dd2abaa9-5131-48c8-aafb-7b62bc9b32c7', 'Honey Stores Level', 'honey_stores_level', 'Amount of honey stores in the hive during inspection', '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_categories (id, category_name, category_key, description, created_at, updated_at) VALUES ('2f08ae0c-3e0f-4714-9f30-5d3ef80b7297', 'Varroa Treatment Product Name', 'varroa_treatment_product', 'Product names for varroa mite treatments', '2025-10-19T11:49:57.616523+00:00', '2025-10-19T11:49:57.616523+00:00');
INSERT INTO dropdown_categories (id, category_name, category_key, description, created_at, updated_at) VALUES ('aee31758-a524-403d-9d64-6b1789e94cd2', 'Bee Subspecies', 'bee_subspecies', 'Common bee subspecies and breeds for queen classification', '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');


-- Table: dropdown_values
-- Records: 25

INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('ba84ecf8-03a4-43df-a43e-1739374c43a8', '66b34a67-7555-4efa-b841-386d08b38d53', 'Bred', 1, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('77300419-e755-4602-a83d-f172aac882df', '66b34a67-7555-4efa-b841-386d08b38d53', 'Purchased', 2, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('c7401aff-639e-4d1d-8053-64b46680e9ac', '66b34a67-7555-4efa-b841-386d08b38d53', 'Swarm', 3, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('51d3fffb-1500-4403-b83c-8f4a0835c970', '51919bd1-f02b-4579-bd94-a8aadb9083fa', 'Active', 1, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('00809106-9579-4e20-97e5-bc37a3769a42', '51919bd1-f02b-4579-bd94-a8aadb9083fa', 'Retired', 2, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('b3e5a1f7-eac3-47c5-aecf-d7ac3b434d6e', '51919bd1-f02b-4579-bd94-a8aadb9083fa', 'Dead', 3, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('9047baf2-51f6-40dd-8238-eb6d7ed5a82e', 'dd2abaa9-5131-48c8-aafb-7b62bc9b32c7', 'Low', 1, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('cdcb4f79-1f9e-4d71-80e4-5692fef45687', 'dd2abaa9-5131-48c8-aafb-7b62bc9b32c7', 'Medium', 2, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('550306de-6175-490b-a869-02dee8755348', 'dd2abaa9-5131-48c8-aafb-7b62bc9b32c7', 'Good', 3, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('e0f7de83-a278-4bd9-907d-616e70a5dc3c', 'dd2abaa9-5131-48c8-aafb-7b62bc9b32c7', 'Excellent', 4, true, '2025-10-19T11:40:50.463315+00:00', '2025-10-19T11:40:50.463315+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('baf651ae-41cc-48c7-903b-5428e8167de6', '2f08ae0c-3e0f-4714-9f30-5d3ef80b7297', 'BienenWohl', 8, true, '2025-10-19T11:51:06.254327+00:00', '2025-10-19T11:51:06.254327+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('de52c3f3-c760-4c44-8381-d6118eb7d7ed', '2f08ae0c-3e0f-4714-9f30-5d3ef80b7297', 'Oxalic Acid', 7, false, '2025-10-19T11:49:57.616523+00:00', '2025-10-19T11:51:57.025293+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('d5e54f14-53e2-464b-ac88-df70fe88cfde', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Italian (Apis mellifera ligustica)', 1, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('8bc5f86c-c1fc-4324-a289-7e387b69b1a7', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Carniolan (Apis mellifera carnica)', 2, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('bb47df30-a86c-438c-a644-a7570003c5de', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Buckfast', 3, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('c1fdfcfd-e7de-4ff8-a079-806851869aac', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Russian', 4, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('3610d0ae-a405-4271-ba9a-40429b47aabb', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Caucasian (Apis mellifera caucasia)', 5, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('1504f387-8118-4545-b360-5b3e355c2eee', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Africanized', 7, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('15c20919-9fb1-4731-b6b8-aaf875bb971a', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'VSH (Varroa Sensitive Hygiene)', 8, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('ae711552-e86b-45c9-acaa-d7d3a2ba19e0', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Hybrid', 9, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('396b55c5-8b51-4812-b399-6bed52add9db', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Unknown', 10, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:07:47.592146+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('76f183f0-b20f-4b95-965a-ad4ed7578206', 'aee31758-a524-403d-9d64-6b1789e94cd2', 'Apis mellifera mellifera (AMM)', 6, true, '2025-10-19T15:07:47.592146+00:00', '2025-10-19T15:08:40.407443+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('3e4d0877-8e03-4004-8586-61996d3a008b', '66b34a67-7555-4efa-b841-386d08b38d53', 'Swarm Cell', 4, true, '2025-10-24T11:40:30.497021+00:00', '2025-10-24T11:40:30.497021+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('05b7ec5a-d03d-4c94-a963-a08fbaf2ade4', '66b34a67-7555-4efa-b841-386d08b38d53', 'Supersedure', 5, true, '2025-10-24T11:40:51.352846+00:00', '2025-10-24T11:40:51.352846+00:00');
INSERT INTO dropdown_values (id, category_id, value, display_order, is_active, created_at, updated_at) VALUES ('a3c2930c-5f42-4162-a9cd-0876a715c541', '66b34a67-7555-4efa-b841-386d08b38d53', 'Emergency Cell', 6, true, '2025-10-24T11:41:14.29696+00:00', '2025-10-24T11:41:14.29696+00:00');


-- Table: rearing_batches
-- Records: 1

INSERT INTO rearing_batches (id, batch_name, mother_queen_id, graft_date, cell_count, emergence_date, status, notes, created_by, created_at, user_id, acceptance_check_date, grafts_accepted, queens_hatched, queens_mated, starter_colony_hive_id, first_option_to_cage_date, second_option_to_cage_date, enable_browser_notifications, enable_email_digest) VALUES ('6306d809-b847-4652-8e9c-94219ddc8a75', 'Test Batch', 'ae42216a-2e8f-497f-a6de-fa096f0a6846', '2025-10-26', 6, '2025-11-07', 'grafted', NULL, NULL, '2025-10-26T16:32:48.316302+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', '2025-10-27', 3, 1, 1, '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-31', '2025-11-05', true, true);


-- Table: support_tickets
-- Records: 1

INSERT INTO support_tickets (id, user_id, ticket_type, subject, description, status, priority, admin_notes, resolved_by, resolved_at, created_at, updated_at) VALUES ('f6d4dfbd-fe98-4ad0-9526-32e6627e1bdc', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'suggestion', 'To do', 'Add memberships to the user profile - (local association, nibs, FBIKA and Irish beekeeping ...)
Add options for user to export their data
Add a field to the user profile called status. This is only editable by admin in the user/settings page. Available values are "Member", "Supporter".
Add team feature
Move Support from main menu into a tab/section in "About"
Update Varroa treatments
Add version and build date to dashboard
For the SQL export include the schema
Hive number in the apiary', 'open', 'normal', NULL, NULL, NULL, '2025-10-25T16:20:20.094844+00:00', '2025-10-26T16:24:13.929632+00:00');


-- Table: user_profiles
-- Records: 3

INSERT INTO user_profiles (id, role, created_at, updated_at, first_name, last_name, mobile_number) VALUES ('195075a4-a403-425d-8146-419cd04625c5', 'User', '2025-10-21T20:53:19.349879+00:00', '2025-10-21T20:53:19.349879+00:00', NULL, NULL, NULL);
INSERT INTO user_profiles (id, role, created_at, updated_at, first_name, last_name, mobile_number) VALUES ('85cd0893-a4e7-402e-9822-e630d7b91649', 'User', '2025-10-21T20:53:19.349879+00:00', '2025-10-21T20:53:19.349879+00:00', NULL, NULL, NULL);
INSERT INTO user_profiles (id, role, created_at, updated_at, first_name, last_name, mobile_number) VALUES ('08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'Admin', '2025-10-21T20:53:19.349879+00:00', '2025-10-21T20:53:19.349879+00:00', NULL, NULL, NULL);


-- =====================================================
-- END OF EXPORT
-- =====================================================
