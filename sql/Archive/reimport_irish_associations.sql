-- ============================================================================
-- REIMPORT IRISH BEEKEEPING ASSOCIATIONS
-- ============================================================================
-- Import 79 beekeeping associations from Ireland (NI and ROI)
-- Data source: external_references/Ireland_Beekeeper_Associations_Directory.xlsx
--
-- This script will:
-- 1. Delete all existing associations
-- 2. Insert all 79 associations from the directory
-- ============================================================================

-- Clear existing data
TRUNCATE TABLE public.beekeeping_associations RESTART IDENTITY CASCADE;

-- Insert all 79 associations
-- Fields: name, jurisdiction (NI/ROI codes), county_area
INSERT INTO public.beekeeping_associations (name, jurisdiction, county_area) VALUES
  -- Northern Ireland associations (21)
  ('The Cornfield Project', 'NI', '(Coleraine area)'),
  ('Mid Ulster Beekeepers'' Association', 'NI', '(Mid Ulster)'),
  ('Low County Native Irish Honey Bee', 'NI', '(unspecified)'),
  ('East Antrim Beekeepers'' Association', 'NI', 'Antrim'),
  ('Mid Antrim Beekeeping Association', 'NI', 'Antrim'),
  ('Randalstown & District Beekeepers'' Association', 'NI', 'Antrim'),
  ('Rasharkin Beekeepers'' Association', 'NI', 'Antrim'),
  ('Armagh & Monaghan Beekeepers Association', 'NI', 'Armagh/Monaghan'),
  ('Belfast & District Beekeepers'' Association', 'NI', 'Belfast'),
  ('County Cavan Beekeepers Association', 'NI', 'Cavan'),
  ('Derry & District Beekeepers Association', 'NI', 'Derry'),
  ('Foyle Beekeepers Association', 'NI', 'Derry'),
  ('Roe Valley Beekeepers'' Association', 'NI', 'Derry'),
  ('Inishowen Beekeepers Association', 'NI', 'Donegal (Inishowen)'),
  ('Northwest Beekeepers Association', 'NI', 'Donegal (Letterkenny)'),
  ('South Donegal Beekeepers Association', 'NI', 'Donegal (South)'),
  ('Dromore Beekeepers Association', 'NI', 'Down'),
  ('Killinchy & District Beekeeping Association', 'NI', 'Down'),
  ('Fermanagh Beekeepers'' Association', 'NI', 'Fermanagh'),
  ('Three Rivers Beekeepers Association', 'NI', 'Tyrone'),
  ('Clogher Valley Beekeepers'' Association', 'NI', 'Tyrone/Fermanagh'),

  -- Republic of Ireland associations (58)
  ('County Carlow Beekeepers Association', 'ROI', 'Carlow'),
  ('Digges Beekeepers'' Association', 'ROI', 'Cavan (Corlough)'),
  ('Banner Beekeepers Association', 'ROI', 'Clare'),
  ('Beachairí Chorcaigh (Cork Beekeepers)', 'ROI', 'Cork'),
  ('Beacharí Mhuscraí (Ballyvourney)', 'ROI', 'Cork (Ballyvourney)'),
  ('County Cork Beekeepers Association', 'ROI', 'Cork (City/County)'),
  ('Duhallow Beekeepers Association', 'ROI', 'Cork (Duhallow)'),
  ('Dunmanway & District Beekeepers Association', 'ROI', 'Cork (Dunmanway)'),
  ('East Cork Beekeepers Association', 'ROI', 'Cork (East)'),
  ('North Cork Beekeepers Association', 'ROI', 'Cork (North)'),
  ('Carbery Beekeepers'' Association', 'ROI', 'Cork (Skibbereen)'),
  ('South West Cork Beekeepers'' Association', 'ROI', 'Cork (South West)'),
  ('Sliabh Luachra Beekeepers'' Association', 'ROI', 'Cork/Limerick/Kerry'),
  ('County Dublin Beekeepers Association', 'ROI', 'Dublin'),
  ('Fingal North Dublin Beekeepers Association', 'ROI', 'Dublin (Fingal)'),
  ('Kilternan Beekeepers Association', 'ROI', 'Dublin (Kilternan)'),
  ('Eblana Beekeeping Association', 'ROI', 'Dublin (Lucan)'),
  ('Galway Beekeepers'' Association', 'ROI', 'Galway'),
  ('Tribes Beekeepers Association', 'ROI', 'Galway (Clarinbridge)'),
  ('Connemara Beekeepers Association', 'ROI', 'Galway (Connemara)'),
  ('Kerry Beekeepers Association', 'ROI', 'Kerry'),
  ('Beaufort Beekeepers Association', 'ROI', 'Kerry (Beaufort)'),
  ('Iveragh Beekeepers Association', 'ROI', 'Kerry (Iveragh)'),
  ('Killorglin Beekeepers Association', 'ROI', 'Kerry (Killorglin)'),
  ('Sneem Beekeepers'' Association', 'ROI', 'Kerry (Sneem)'),
  ('Collis Sandes Tralee Beekeepers', 'ROI', 'Kerry (Tralee)'),
  ('North Kildare Beekeepers Association', 'ROI', 'Kildare (North)'),
  ('South Kildare Beekeepers Association (SKBA)', 'ROI', 'Kildare (South/West Wicklow)'),
  ('Mid Kilkenny Beekeepers Association', 'ROI', 'Kilkenny (North)'),
  ('South Kilkenny Beekeepers Association', 'ROI', 'Kilkenny (South)'),
  ('Laois Beekeepers Association', 'ROI', 'Laois (Abbeyleix)'),
  ('Dunamaise Beekeepers Association', 'ROI', 'Laois (Portlaoise)'),
  ('County Limerick Beekeepers Association', 'ROI', 'Limerick'),
  ('Three Counties Beekeeping Association', 'ROI', 'Limerick (Knocklong)'),
  ('Longford Beekeepers Association', 'ROI', 'Longford'),
  ('County Louth Beekeepers Association', 'ROI', 'Louth (Dundalk)'),
  ('County Mayo Beekeepers Association', 'ROI', 'Mayo (Ballina)'),
  ('Ballyhaunis Beekeepers Association', 'ROI', 'Mayo (Ballyhaunis)'),
  ('Erris Beekeepers Association', 'ROI', 'Mayo (Erris)'),
  ('Westport Beekeepers Association', 'ROI', 'Mayo (Westport)'),
  ('The Royal County Beekeepers Association', 'ROI', 'Meath'),
  ('County Offaly Beekeepers Association', 'ROI', 'Offaly'),
  ('Suck Valley Beekeepers Association', 'ROI', 'Roscommon/Galway (Suck Valley)'),
  ('Sligo/Leitrim Beekeepers Association', 'ROI', 'Sligo/Leitrim (Collooney)'),
  ('North Tipperary Beekeepers Association', 'ROI', 'Tipperary (North)'),
  ('South Tipperary Beekeepers Association', 'ROI', 'Tipperary (South)'),
  ('Bee Happy Beekeepers Waterford', 'ROI', 'Waterford'),
  ('Co. Waterford Beekeepers Association (Co. WBKA)', 'ROI', 'Waterford'),
  ('East Waterford Beekeepers Association', 'ROI', 'Waterford (East)'),
  ('Belvedere Beekeepers Association', 'ROI', 'Westmeath'),
  ('Lake County Beekeepers Association', 'ROI', 'Westmeath (Mullingar)'),
  ('County Wexford Beekeepers Association', 'ROI', 'Wexford'),
  ('Menapian Beekeepers (Wexford)', 'ROI', 'Wexford'),
  ('Gorey Beekeepers Association', 'ROI', 'Wexford (Gorey)'),
  ('New Ross Beekeepers Association', 'ROI', 'Wexford (New Ross)'),
  ('South Wexford Beekeepers Association', 'ROI', 'Wexford (South)'),
  ('Ashford Beekeepers Association', 'ROI', 'Wicklow (Ashford)'),
  ('Roundwood Beekeepers Association', 'ROI', 'Wicklow (Roundwood)');

-- Verify import
SELECT
  jurisdiction,
  COUNT(*) as count
FROM public.beekeeping_associations
GROUP BY jurisdiction
ORDER BY jurisdiction;

-- Show total count
SELECT COUNT(*) as total_associations FROM public.beekeeping_associations;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Successfully imported 79 Irish beekeeping associations';
  RAISE NOTICE '✅ 21 from Northern Ireland';
  RAISE NOTICE '✅ 58 from Republic of Ireland';
END $$;
