-- ============================================================================
-- RESTORE BEEKEEPING DATA FROM 2025-11-03 BACKUP
-- ============================================================================
-- This script restores all beekeeping data from the CSV export
-- Order matters: apiaries → queens → hives → inspections → varroa checks/treatments
-- ============================================================================

-- 1. RESTORE APIARIES (3 records)
INSERT INTO public.apiaries (id, name, location, notes, created_at, city, eircode, user_id) VALUES
  ('53e4f795-25ee-4ae9-a881-fb783406ad00', 'Colm (AP01)', 'Back at the Field', NULL, '2025-10-19T16:49:50.574661+00:00', 'Annaghdown', 'H91 E6K2', '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
  ('5233097b-500c-44cd-8da8-5f6b1fc7c03d', 'Tom (AP02)', 'Back at the field in the woods', NULL, '2025-10-18T17:46:53.711301+00:00', 'Annaghdown', 'H91 Y7W2', '08e38bd9-30b0-4183-92c2-fc3b7600a46a'),
  ('7e73bb19-6bbc-49a3-b160-66e41ac99c1b', 'Home (AP03) ', NULL, NULL, '2025-10-25T15:11:04.630101+00:00', 'Annaghdown', 'H91 R9T8', '08e38bd9-30b0-4183-92c2-fc3b7600a46a')
ON CONFLICT (id) DO NOTHING;

-- 2. RESTORE QUEENS (11 records)
INSERT INTO public.queens (id, queen_number, mother_id, father_id, birth_date, marking_color, source, subspecies, status, performance_notes, created_at, lineage, queen_clipped, user_id, mated_at_eircode) VALUES
  ('728b4ed3-3c7e-4db3-8e26-b0faa8fa0450', '9B', NULL, NULL, '2025-08-09', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', 'Notes', '2025-10-18T16:36:17.458048+00:00', 'RZ023=.25-RZ018xOP(HD)-RZ026xOP', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 XT7F'),
  ('ae42216a-2e8f-497f-a6de-fa096f0a6846', '1B', NULL, NULL, '2025-07-05', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', 'Crafted from 26-DA mated at the Clubs Apiary Claringbridge', '2025-10-19T19:31:00.539698+00:00', 'RZ026=.25-RZ026xOP(CG)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 RW3Y'),
  ('14378b9c-ea72-4bd9-b8a4-e983bf621dbe', '15B', NULL, NULL, '2025-10-09', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-19T19:19:18.128244+00:00', 'RZ037=.25-RZ018xOP(HD)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 XT7F'),
  ('2a97687a-90f3-495d-9bd5-de519f275fab', 'n/a', NULL, NULL, '2025-07-05', 'Blue', 'Swarm Cell', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-19T18:59:57.965536+00:00', 'RZ076=.25-RZ076XOP(AN)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 E6K2'),
  ('2c3ed5f1-64a1-4455-8bc2-bbf992287a7f', '12B', NULL, NULL, '2025-09-02', 'Blue', 'Emergency Cell', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-27T15:15:51.926765+00:00', 'RZ060=.25-RZ060xOP(AN)-.25-RZ060xOP(AN)-.25-RZ026xOP(CG)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 R9T8'),
  ('4cb5e3db-60a5-464e-bd68-36f56a71a87b', '36-DA', NULL, NULL, '2025-05-30', 'Blue', 'Bred', NULL, 'active', NULL, '2025-10-30T19:00:37.695344+00:00', 'RZ018=.25-RZ026xSTD(CG)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 RW3Y'),
  ('b27cff7f-562b-4fcc-a8af-24968fe507a4', '29-DA', NULL, NULL, '2025-07-05', 'Blue', 'Swarm Cell', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-19T21:34:08.241672+00:00', 'RZ029=.25-RZ29xOP(AN).24-RZ037xOP', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 R9T8'),
  ('ad89365e-b9c3-4e0f-8117-d1388960fc89', '30-DA', NULL, NULL, '2025-06-30', 'Blue', 'Swarm Cell', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-30T19:07:59.3658+00:00', 'RZ030=.25-RZ030xOP(AN).24-RZ037xOP', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 E6K2'),
  ('5cbfbf3c-2b70-4065-a400-2370f66b4d21', '7B', NULL, NULL, '2025-07-20', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-30T19:15:13.037305+00:00', 'RZ056=.25-UGMul1.6xOP(AN)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 R9T8'),
  ('466ac211-db21-43b6-b844-52ff82a05f01', '8B', NULL, NULL, '2025-09-03', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-30T19:17:57.784737+00:00', 'RZ039=.25-RZ018xOP(AN).25-RZ026xOP(CG)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 R9T8'),
  ('4a5370fc-0a6f-4e7c-b5cc-0d9d67258907', '14B', NULL, NULL, '2025-09-08', 'Blue', 'Bred', 'Apis mellifera mellifera (AMM)', 'active', NULL, '2025-10-30T19:32:19.90555+00:00', 'RZ059=.25-RZ018xOP(HD)', false, '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 'H91 XT7F')
ON CONFLICT (id) DO NOTHING;

-- 3. RESTORE HIVES (11 records)
-- Note: configuration column contains JSON data
INSERT INTO public.hives (id, apiary_id, hive_number, queen_id, status, notes, created_at, user_id, queen_marked, queen_marking_color, queen_mated, queen_clipped, colony_established_date, queen_installed_date, hive_type, configuration, order_in_apiary, row_in_apiary, order_direction) VALUES
  ('7b67eb2c-05cb-4e41-95a0-1e2e8855fdae', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '37-DA', '14378b9c-ea72-4bd9-b8a4-e983bf621dbe', 'active', NULL, '2025-10-19T19:15:57.185342+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2023-08-07', '2025-08-07', 'Production', '{}', 3, 1, 'entrances'),
  ('9cf84ad7-5030-4e4b-b7dc-6a15315d1f7c', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '64-DA', '728b4ed3-3c7e-4db3-8e26-b0faa8fa0450', 'active', NULL, '2025-10-19T14:55:17.31296+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2025-07-13', '2025-06-30', 'Production', '{}', 1, 1, 'entrances'),
  ('83fd855e-18f8-4e64-ba12-3df41493fe1c', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '76-DA', '2a97687a-90f3-495d-9bd5-de519f275fab', 'active', NULL, '2025-10-19T18:57:35.281915+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2024-09-18', '2025-06-01', 'Production', '{}', 2, 1, 'entrances'),
  ('ef58668a-93a0-4c3d-aafe-e114de245152', '5233097b-500c-44cd-8da8-5f6b1fc7c03d', '26-DA', 'ae42216a-2e8f-497f-a6de-fa096f0a6846', 'active', NULL, '2025-10-19T19:22:24.027626+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2024-06-02', '2025-07-05', 'Production', '{}', 4, 1, 'entrances'),
  ('3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '53e4f795-25ee-4ae9-a881-fb783406ad00', '29-DA', 'b27cff7f-562b-4fcc-a8af-24968fe507a4', 'active', NULL, '2025-10-19T21:30:18.960898+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', true, 'Blue', false, false, '2024-05-01', '2024-06-09', 'Production', '{}', 1, 1, 'entrances'),
  ('24e85d09-86d7-4c7f-991b-f229d351c98f', '7e73bb19-6bbc-49a3-b160-66e41ac99c1b', '60-MN+', '2c3ed5f1-64a1-4455-8bc2-bbf992287a7f', 'active', NULL, '2025-10-25T17:42:06.486449+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', true, 'Blue', false, false, '2025-10-25', '2025-10-25', 'Split', '{}', 1, NULL, 'entrances'),
  ('2ab7eb33-fb7a-4e6e-ab88-f01b9c40ded3', '7e73bb19-6bbc-49a3-b160-66e41ac99c1b', '36-DA', '4cb5e3db-60a5-464e-bd68-36f56a71a87b', 'active', NULL, '2025-10-30T18:58:07.210611+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2025-05-22', '2025-06-21', 'Production', '{}', 2, NULL, 'entrances'),
  ('6d776ad9-d625-4bcd-add7-ce373f83abfb', '7e73bb19-6bbc-49a3-b160-66e41ac99c1b', '59-DAN', '4a5370fc-0a6f-4e7c-b5cc-0d9d67258907', 'active', NULL, '2025-10-30T19:30:38.073608+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2025-09-09', '2025-09-08', 'Split', '{}', 3, NULL, 'entrances'),
  ('09ff8241-1277-49b1-a639-9c47f1903111', '53e4f795-25ee-4ae9-a881-fb783406ad00', '30-DA', 'ad89365e-b9c3-4e0f-8117-d1388960fc89', 'active', NULL, '2025-10-30T19:06:07.098168+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2025-05-02', '2025-06-30', 'Production', '{}', 2, 1, 'entrances'),
  ('8268dadf-7069-4085-ace1-ab294e4a292c', '53e4f795-25ee-4ae9-a881-fb783406ad00', '53-DA', '5cbfbf3c-2b70-4065-a400-2370f66b4d21', 'active', NULL, '2025-10-30T19:13:40.460166+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2025-07-25', '2025-07-25', 'Production', '{}', 2, 2, 'entrances'),
  ('4ab6b769-3b40-4d32-b00b-710e44e95826', '53e4f795-25ee-4ae9-a881-fb783406ad00', '57-DA', '466ac211-db21-43b6-b844-52ff82a05f01', 'active', NULL, '2025-10-30T19:16:32.217047+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', false, NULL, false, false, '2023-02-02', '2025-06-28', 'Production', '{}', 1, 2, 'entrances')
ON CONFLICT (id) DO NOTHING;

-- 4. RESTORE INSPECTIONS (5 records)
INSERT INTO public.inspections (id, hive_id, inspection_date, queen_seen, eggs_present, brood_pattern_rating, temperament_rating, population_strength, honey_stores, disease_issues, notes, inspected_by, created_at, brood_frames, image_url, weather_temp, weather_condition, weather_humidity, weather_wind_speed, inspection_time, user_id, right_sized_frames, swarming_tendency, calmness, frames_foundation, frames_brood, frames_drawn, honey_supers, drone_frames, store_frames, recapping, vsh, smr, afb_disease, efb_disease, chalkbrood_disease, nosemosis_disease, dwv_disease, iapv_cbpv_disease, weight) VALUES
  ('37edb233-f681-43b9-b3b8-6d158dc4f822', '9cf84ad7-5030-4e4b-b7dc-6a15315d1f7c', '2025-10-19', false, false, 0, 0, 0, NULL, NULL, 'Move to AP02.', NULL, '2025-10-19T15:33:22.749204+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '14:26:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, NULL),
  ('cbcd4648-6608-41ac-bd23-0d752ac215cb', '83fd855e-18f8-4e64-ba12-3df41493fe1c', '2025-10-19', false, false, 0, 0, 0, NULL, NULL, 'Moved hive to AP02.', NULL, '2025-10-19T19:05:17.786494+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '13:27:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, NULL),
  ('0ef27d9c-1009-48ea-9a13-e5a14772a333', 'ef58668a-93a0-4c3d-aafe-e114de245152', '2025-10-19', false, false, 0, 0, 0, NULL, NULL, 'Moved hive to AP02.', NULL, '2025-10-19T19:53:51.112782+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '14:27:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, NULL),
  ('267d553b-7ba4-4e4c-8a97-23774d7152d8', '7b67eb2c-05cb-4e41-95a0-1e2e8855fdae', '2025-10-19', false, false, 0, 0, 0, NULL, NULL, 'Moved hive to AP02.', NULL, '2025-10-19T19:55:44.135784+00:00', NULL, NULL, 14, 'Slight Rain Showers', 92, 19, '14:27:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', NULL, 3, 3, 0, 0, 0, 0, 0, 0, 3, 3, 3, 0, 0, 0, 0, 0, 0, NULL),
  ('167b512b-2b57-4bf8-85ac-601b4a36fcba', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-20', false, false, 0, 4, 2, NULL, NULL, NULL, NULL, '2025-10-20T13:22:58.05602+00:00', NULL, 'https://tbhofdmfzwibysnnssnx.supabase.co/storage/v1/object/public/inspection-images/inspections/vky67x94w5h_1760966555279.jpg', 12, 'Partly Cloudy', 61, 18, '14:21:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL)
ON CONFLICT (id) DO NOTHING;

-- 5. RESTORE VARROA CHECKS (1 record)
INSERT INTO public.varroa_checks (id, hive_id, check_date, method, mites_count, sample_size, infestation_rate, action_threshold_reached, notes, created_at, updated_at, user_id) VALUES
  ('214c8bc3-4a3d-4173-9551-0e0d1d39b432', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-20', 'Floor Board Screening', 12, 4, 3, false, NULL, '2025-10-20T13:20:59.704891+00:00', '2025-10-21T18:58:16.415055+00:00', '08e38bd9-30b0-4183-92c2-fc3b7600a46a')
ON CONFLICT (id) DO NOTHING;

-- 6. RESTORE VARROA TREATMENTS (1 record)
INSERT INTO public.varroa_treatments (id, user_id, hive_id, treatment_date, treatment_type, dosage, temperature, weather_conditions, notes, created_at, updated_at) VALUES
  ('98d1e179-2201-482f-ba0d-d25d31b57c8a', '08e38bd9-30b0-4183-92c2-fc3b7600a46a', '3b8820f5-65ea-4e6f-bd8b-057860d8ba52', '2025-10-20', 'BieneWohl', '20ml', 8, 'Partly cloudy, Wind: 12 km/h', NULL, '2025-11-02T00:05:44.31223+00:00', '2025-11-03T12:48:22.98786+00:00')
ON CONFLICT (id) DO NOTHING;

-- Verification queries
SELECT '=== RESTORATION SUMMARY ===' as info;

SELECT 'Apiaries' as table_name, COUNT(*) as restored_count FROM public.apiaries WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'
UNION ALL
SELECT 'Queens', COUNT(*) FROM public.queens WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'
UNION ALL
SELECT 'Hives', COUNT(*) FROM public.hives WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'
UNION ALL
SELECT 'Inspections', COUNT(*) FROM public.inspections WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'
UNION ALL
SELECT 'Varroa Checks', COUNT(*) FROM public.varroa_checks WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a'
UNION ALL
SELECT 'Varroa Treatments', COUNT(*) FROM public.varroa_treatments WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';

-- Success message
DO $$
DECLARE
  v_apiaries INTEGER;
  v_queens INTEGER;
  v_hives INTEGER;
  v_inspections INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_apiaries FROM public.apiaries WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';
  SELECT COUNT(*) INTO v_queens FROM public.queens WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';
  SELECT COUNT(*) INTO v_hives FROM public.hives WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';
  SELECT COUNT(*) INTO v_inspections FROM public.inspections WHERE user_id = '08e38bd9-30b0-4183-92c2-fc3b7600a46a';

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ DATA RESTORATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Apiaries restored: %', v_apiaries;
  RAISE NOTICE '✅ Queens restored: %', v_queens;
  RAISE NOTICE '✅ Hives restored: %', v_hives;
  RAISE NOTICE '✅ Inspections restored: %', v_inspections;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'All your beekeeping data has been restored!';
  RAISE NOTICE '========================================';
END $$;
