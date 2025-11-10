-- ============================================================================
-- REIMPORT IRISH BEEKEEPING ASSOCIATIONS
-- ============================================================================
-- This script reimports all associations from Ireland_Beekeeper_Associations_Directory.csv
-- 1. Delete all existing associations
-- 2. Insert all 79 associations from the directory with full details
-- ============================================================================

-- Clear existing data (SAFE - no CASCADE)
DELETE FROM public.beekeeping_associations;

-- Insert all 79 associations with complete information
-- Fields: name, jurisdiction, county_area, website, email, affiliation, source
INSERT INTO public.beekeeping_associations (name, jurisdiction, county_area, website, email, affiliation, source) VALUES
  -- Northern Ireland associations (21)
  ('The Cornfield Project', 'NI', 'Coleraine', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Mid Ulster Beekeepers'' Association', 'NI', 'Mid Ulster', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Low County Native Irish Honey Bee', 'NI', 'unspecified', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('East Antrim Beekeepers'' Association', 'NI', 'Antrim', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Mid Antrim Beekeeping Association', 'NI', 'Antrim', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Randalstown & District Beekeepers'' Association', 'NI', 'Antrim', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Rasharkin Beekeepers'' Association', 'NI', 'Antrim', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Armagh & Monaghan Beekeepers Association', 'NI', 'Armagh/Monaghan', 'https://www.facebook.com/armagh.monaghan.beekeepers', 'sec.ambka@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Belfast & District Beekeepers'' Association', 'NI', 'Belfast', 'https://belfastbees.co.uk/', NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('County Cavan Beekeepers Association', 'NI', 'Cavan', NULL, 'cavanbeekeepers@gamil.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Derry & District Beekeepers Association', 'NI', 'Derry', NULL, 'ogbarr@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Foyle Beekeepers Association', 'NI', 'Derry', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Roe Valley Beekeepers'' Association', 'NI', 'Derry', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Inishowen Beekeepers Association', 'NI', 'Donegal', NULL, 'inishowenbeekeeper@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Northwest Beekeepers Association', 'NI', 'Donegal', NULL, 'bluecrann2@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('South Donegal Beekeepers Association', 'NI', 'Donegal', NULL, 'sdonbees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Dromore Beekeepers Association', 'NI', 'Down', 'https://dromorebeekeepers.co.uk/', NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Killinchy & District Beekeeping Association', 'NI', 'Down', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Fermanagh Beekeepers'' Association', 'NI', 'Fermanagh', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Three Rivers Beekeepers Association', 'NI', 'Tyrone', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),
  ('Clogher Valley Beekeepers'' Association', 'NI', 'Tyrone/Fermanagh', NULL, NULL, 'UBKA', 'ubka.org/about/local-associations'),

  -- Republic of Ireland associations (58)
  ('County Carlow Beekeepers Association', 'ROI', 'Carlow', 'http://www.carlowbeekeepers.com', 'carlowbeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Digges Beekeepers'' Association', 'ROI', 'Cavan', NULL, 'secretarydigges@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Banner Beekeepers Association', 'ROI', 'Clare', NULL, 'bannerbees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Beachairí Chorcaigh (Cork Beekeepers)', 'ROI', 'Cork', 'https://www.beachairichorcaigh.org/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Beacharí Mhuscraí (Ballyvourney)', 'ROI', 'Cork', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('County Cork Beekeepers Association', 'ROI', 'Cork', 'https://cocorkbka.org', 'secretaryccbka@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Duhallow Beekeepers Association', 'ROI', 'Cork', NULL, 'secretaryduhallowbeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Dunmanway & District Beekeepers Association', 'ROI', 'Cork', 'https://www.facebook.com/profile.php?id=100064381521487', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('East Cork Beekeepers Association', 'ROI', 'Cork', NULL, 'eastcorkbeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('North Cork Beekeepers Association', 'ROI', 'Cork', NULL, 'ivan.oconnell@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Carbery Beekeepers'' Association', 'ROI', 'Cork', 'https://www.facebook.com/carberybeekeepersassociation', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('South West Cork Beekeepers'' Association', 'ROI', 'Cork', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Sliabh Luachra Beekeepers'' Association', 'ROI', 'Cork/Limerick/Kerry', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('County Dublin Beekeepers Association', 'ROI', 'Dublin', NULL, 'secretary@dublinbees.org', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Fingal North Dublin Beekeepers Association', 'ROI', 'Dublin', 'https://fingalbeekeepers.net', 'info@fingalbeekeepers.net', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Kilternan Beekeepers Association', 'ROI', 'Dublin', NULL, 'yram@xmail.connect.ie', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Eblana Beekeeping Association', 'ROI', 'Dublin', 'https://www.facebook.com/profile.php?id=100067015697542', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Galway Beekeepers'' Association', 'ROI', 'Galway', 'http://galwaybeekeepers.com/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Tribes Beekeepers Association', 'ROI', 'Galway', 'https://TribesBeekeepersAssociation.com', 'secretary@tribesbeekeepersassociation.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Connemara Beekeepers Association', 'ROI', 'Galway', 'https://ConnemaraBeekeepers.ie', 'secretary.connemarabeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Kerry Beekeepers Association', 'ROI', 'Kerry', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Beaufort Beekeepers Association', 'ROI', 'Kerry', 'http://beaufortbeekeepers.org/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Iveragh Beekeepers Association', 'ROI', 'Kerry', NULL, 'ibeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Killorglin Beekeepers Association', 'ROI', 'Kerry', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Sneem Beekeepers'' Association', 'ROI', 'Kerry', 'https://www.sneembeekeepers.com/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Collis Sandes Tralee Beekeepers', 'ROI', 'Kerry', 'https://www.facebook.com/CollisSandesHouse/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('North Kildare Beekeepers Association', 'ROI', 'Kildare', 'https://www.nkbka.com/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('South Kildare Beekeepers Association (SKBA)', 'ROI', 'Kildare', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Mid Kilkenny Beekeepers Association', 'ROI', 'Kilkenny', 'http://midkilkennybees.wordpress.com', 'secmbka@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('South Kilkenny Beekeepers Association', 'ROI', 'Kilkenny', NULL, 'secretaryskbka@hotmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Laois Beekeepers Association', 'ROI', 'Laois', 'https://www.facebook.com/SouthLaoisBKA/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Dunamaise Beekeepers Association', 'ROI', 'Laois', NULL, 'dunamaisebees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('County Limerick Beekeepers Association', 'ROI', 'Limerick', NULL, 'secretarylimerickbee@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Three Counties Beekeeping Association', 'ROI', 'Limerick', 'https://www.facebook.com/3CountiesBeekeepingAssociation/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Longford Beekeepers Association', 'ROI', 'Longford', 'https://www.longfordbeekeepers.com/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('County Louth Beekeepers Association', 'ROI', 'Louth', 'https://louthbeekeeping.com', 'lbkasec@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('County Mayo Beekeepers Association', 'ROI', 'Mayo', NULL, 'judewalsh30@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Ballyhaunis Beekeepers Association', 'ROI', 'Mayo', NULL, 'ballyhaunisbees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Erris Beekeepers Association', 'ROI', 'Mayo', NULL, 'mcdermottireland@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Westport Beekeepers Association', 'ROI', 'Mayo', 'https://wbkc.info', 'secretarywbka@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('The Royal County Beekeepers Association', 'ROI', 'Meath', NULL, 'royalcountybeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('County Offaly Beekeepers Association', 'ROI', 'Offaly', NULL, 'geraldinebyrne.gb@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Suck Valley Beekeepers Association', 'ROI', 'Roscommon/Galway', NULL, 'SVBKAsecretary@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Sligo/Leitrim Beekeepers Association', 'ROI', 'Sligo/Leitrim', NULL, 'slba.secretary@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('North Tipperary Beekeepers Association', 'ROI', 'Tipperary', 'https://www.northtippbees.com', 'northtippbees.secretary@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('South Tipperary Beekeepers Association', 'ROI', 'Tipperary', 'https://southtippbees.com', 'southtippbees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Bee Happy Beekeepers Waterford', 'ROI', 'Waterford', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Co. Waterford Beekeepers Association (Co. WBKA)', 'ROI', 'Waterford', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('East Waterford Beekeepers Association', 'ROI', 'Waterford', NULL, 'waterfordbees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Belvedere Beekeepers Association', 'ROI', 'Westmeath', NULL, NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Lake County Beekeepers Association', 'ROI', 'Westmeath', 'https://www.instagram.com/lakecountybeekeeping', 'Lcba24sec@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('County Wexford Beekeepers Association', 'ROI', 'Wexford', 'https://countywexfordbeekeepersassociation.com', 'countywexfordbeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Menapian Beekeepers (Wexford)', 'ROI', 'Wexford', 'https://www.facebook.com/menapianbee/', NULL, 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs'),
  ('Gorey Beekeepers Association', 'ROI', 'Wexford', 'https://goreybeekeepers.com', 'secretary.goreybeekeepers@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('New Ross Beekeepers Association', 'ROI', 'Wexford', NULL, 'Timnuttall2003@yahoo.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('South Wexford Beekeepers Association', 'ROI', 'Wexford', NULL, 'secretaryswbka@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Ashford Beekeepers Association', 'ROI', 'Wicklow', NULL, 'wicklowbees@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you'),
  ('Roundwood Beekeepers Association', 'ROI', 'Wicklow', NULL, 'secretary.roundwoodbka@gmail.com', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you');

-- Verify import
SELECT
  '=== IMPORT SUMMARY ===' as info,
  jurisdiction,
  COUNT(*) as count
FROM public.beekeeping_associations
GROUP BY jurisdiction
ORDER BY jurisdiction;

-- Show total
SELECT
  '=== TOTAL ===' as info,
  COUNT(*) as total_associations
FROM public.beekeeping_associations;

-- Success message
DO $$
DECLARE
  v_ni_count INTEGER;
  v_roi_count INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_ni_count FROM public.beekeeping_associations WHERE jurisdiction = 'NI';
  SELECT COUNT(*) INTO v_roi_count FROM public.beekeeping_associations WHERE jurisdiction = 'ROI';
  SELECT COUNT(*) INTO v_total FROM public.beekeeping_associations;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ASSOCIATIONS IMPORT COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Northern Ireland: %', v_ni_count;
  RAISE NOTICE '✅ Republic of Ireland: %', v_roi_count;
  RAISE NOTICE '✅ Total associations: %', v_total;
  RAISE NOTICE '========================================';
END $$;
