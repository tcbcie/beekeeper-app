-- ============================================================================
-- IMPORT IRISH BEEKEEPING ASSOCIATIONS
-- ============================================================================
-- Import 79 beekeeping associations from Ireland (NI and ROI)
-- Data source: external_references/Ireland_Beekeeper_Associations_Directory.xlsx
--
-- Fields:
-- - Jurisdiction: NI (Northern Ireland) or ROI (Republic of Ireland)
-- - County/Area: Geographic location
-- - Association: Full association name
-- - Affiliation: UBKA, FIBKA, or IBA
-- - Source: Where the data came from
-- - Website/Email: Contact information (where available)
-- ============================================================================

-- Insert all 79 associations
INSERT INTO public.beekeeping_associations (name, jurisdiction, county_area, affiliation, source, website, email) VALUES
  ('The Cornfield Project', 'NI', '(Coleraine area)', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Mid Ulster Beekeepers'' Association', 'NI', '(Mid Ulster)', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Low County Native Irish Honey Bee', 'NI', '(unspecified)', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('East Antrim Beekeepers'' Association', 'NI', 'Antrim', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Mid Antrim Beekeeping Association', 'NI', 'Antrim', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Randalstown & District Beekeepers'' Association', 'NI', 'Antrim', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Rasharkin Beekeepers'' Association', 'NI', 'Antrim', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Armagh & Monaghan Beekeepers Association', 'NI', 'Armagh/Monaghan', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://www.facebook.com/armagh.monaghan.beekeepers', 'sec.ambka@gmail.com'),
  ('Belfast & District Beekeepers'' Association', 'NI', 'Belfast', 'UBKA', 'ubka.org/about/local-associations', 'https://belfastbees.co.uk/', NULL),
  ('County Cavan Beekeepers Association', 'NI', 'Cavan', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'cavanbeekeepers@gamil.com'),
  ('Derry & District Beekeepers Association', 'NI', 'Derry', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'ogbarr@gmail.com'),
  ('Foyle Beekeepers Association', 'NI', 'Derry', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Roe Valley Beekeepers'' Association', 'NI', 'Derry', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Inishowen Beekeepers Association', 'NI', 'Donegal (Inishowen)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'inishowenbeekeeper@gmail.com'),
  ('Northwest Beekeepers Association', 'NI', 'Donegal (Letterkenny)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'bluecrann2@gmail.com'),
  ('South Donegal Beekeepers Association', 'NI', 'Donegal (South)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'sdonbees@gmail.com'),
  ('Dromore Beekeepers Association', 'NI', 'Down', 'UBKA', 'ubka.org/about/local-associations', 'https://dromorebeekeepers.co.uk/', NULL),
  ('Killinchy & District Beekeeping Association', 'NI', 'Down', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Fermanagh Beekeepers'' Association', 'NI', 'Fermanagh', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Three Rivers Beekeepers Association', 'NI', 'Tyrone', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),
  ('Clogher Valley Beekeepers'' Association', 'NI', 'Tyrone/Fermanagh', 'UBKA', 'ubka.org/about/local-associations', NULL, NULL),

  -- Republic of Ireland associations
  ('County Carlow Beekeepers Association', 'ROI', 'Carlow', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'http://www.carlowbeekeepers.com', 'carlowbeekeepers@gmail.com'),
  ('Digges Beekeepers'' Association', 'ROI', 'Cavan (Corlough)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretarydigges@gmail.com'),
  ('Banner Beekeepers Association', 'ROI', 'Clare', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'bannerbees@gmail.com'),
  ('Beachairí Chorcaigh (Cork Beekeepers)', 'ROI', 'Cork', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.beachairichorcaigh.org/', NULL),
  ('Beacharí Mhuscraí (Ballyvourney)', 'ROI', 'Cork (Ballyvourney)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('County Cork Beekeepers Association', 'ROI', 'Cork (City/County)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://cocorkbka.org', 'secretaryccbka@gmail.com'),
  ('Duhallow Beekeepers Association', 'ROI', 'Cork (Duhallow)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretaryduhallowbeekeepers@gmail.com'),
  ('Dunmanway & District Beekeepers Association', 'ROI', 'Cork (Dunmanway)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/profile.php?id=100064381521487', NULL),
  ('East Cork Beekeepers Association', 'ROI', 'Cork (East)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'eastcorkbeekeepers@gmail.com'),
  ('North Cork Beekeepers Association', 'ROI', 'Cork (North)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'ivan.oconnell@gmail.com'),
  ('Carbery Beekeepers'' Association', 'ROI', 'Cork (Skibbereen)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/carberybeekeepersassociation', NULL),
  ('South West Cork Beekeepers'' Association', 'ROI', 'Cork (South West)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('Sliabh Luachra Beekeepers'' Association', 'ROI', 'Cork/Limerick/Kerry', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('County Dublin Beekeepers Association', 'ROI', 'Dublin', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretary@dublinbees.org'),
  ('Fingal North Dublin Beekeepers Association', 'ROI', 'Dublin (Fingal)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://fingalbeekeepers.net', 'info@fingalbeekeepers.net'),
  ('Kilternan Beekeepers Association', 'ROI', 'Dublin (Kilternan)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'yram@xmail.connect.ie'),
  ('Eblana Beekeeping Association', 'ROI', 'Dublin (Lucan)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/profile.php?id=100067015697542', NULL),
  ('Galway Beekeepers'' Association', 'ROI', 'Galway', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'http://galwaybeekeepers.com/', NULL),
  ('Tribes Beekeepers Association', 'ROI', 'Galway (Clarinbridge)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://TribesBeekeepersAssociation.com', 'secretary@tribesbeekeepersassociation.com'),
  ('Connemara Beekeepers Association', 'ROI', 'Galway (Connemara)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://ConnemaraBeekeepers.ie', 'secretary.connemarabeekeepers@gmail.com'),
  ('Kerry Beekeepers Association', 'ROI', 'Kerry', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('Beaufort Beekeepers Association', 'ROI', 'Kerry (Beaufort)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'http://beaufortbeekeepers.org/', NULL),
  ('Iveragh Beekeepers Association', 'ROI', 'Kerry (Iveragh)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'ibeekeepers@gmail.com'),
  ('Killorglin Beekeepers Association', 'ROI', 'Kerry (Killorglin)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('Sneem Beekeepers'' Association', 'ROI', 'Kerry (Sneem)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.sneembeekeepers.com/', NULL),
  ('Collis Sandes Tralee Beekeepers', 'ROI', 'Kerry (Tralee)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/CollisSandesHouse/', NULL),
  ('North Kildare Beekeepers Association', 'ROI', 'Kildare (North)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.nkbka.com/', NULL),
  ('South Kildare Beekeepers Association (SKBA)', 'ROI', 'Kildare (South/West Wicklow)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('Mid Kilkenny Beekeepers Association', 'ROI', 'Kilkenny (North)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'http://midkilkennybees.wordpress.com', 'secmbka@gmail.com'),
  ('South Kilkenny Beekeepers Association', 'ROI', 'Kilkenny (South)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretaryskbka@hotmail.com'),
  ('Laois Beekeepers Association', 'ROI', 'Laois (Abbeyleix)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/SouthLaoisBKA/', NULL),
  ('Dunamaise Beekeepers Association', 'ROI', 'Laois (Portlaoise)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'dunamaisebees@gmail.com'),
  ('County Limerick Beekeepers Association', 'ROI', 'Limerick', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretarylimerickbee@gmail.com'),
  ('Three Counties Beekeeping Association', 'ROI', 'Limerick (Knocklong)', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/3CountiesBeekeepingAssociation/', NULL),
  ('Longford Beekeepers Association', 'ROI', 'Longford', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.longfordbeekeepers.com/', NULL),
  ('County Louth Beekeepers Association', 'ROI', 'Louth (Dundalk)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://louthbeekeeping.com', 'lbkasec@gmail.com'),
  ('County Mayo Beekeepers Association', 'ROI', 'Mayo (Ballina)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'judewalsh30@gmail.com'),
  ('Ballyhaunis Beekeepers Association', 'ROI', 'Mayo (Ballyhaunis)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'ballyhaunisbees@gmail.com'),
  ('Erris Beekeepers Association', 'ROI', 'Mayo (Erris)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'mcdermottireland@gmail.com'),
  ('Westport Beekeepers Association', 'ROI', 'Mayo (Westport)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://wbkc.info', 'secretarywbka@gmail.com'),
  ('The Royal County Beekeepers Association', 'ROI', 'Meath', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'royalcountybeekeepers@gmail.com'),
  ('County Offaly Beekeepers Association', 'ROI', 'Offaly', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'geraldinebyrne.gb@gmail.com'),
  ('Suck Valley Beekeepers Association', 'ROI', 'Roscommon/Galway (Suck Valley)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'SVBKAsecretary@gmail.com'),
  ('Sligo/Leitrim Beekeepers Association', 'ROI', 'Sligo/Leitrim (Collooney)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'slba.secretary@gmail.com'),
  ('North Tipperary Beekeepers Association', 'ROI', 'Tipperary (North)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://www.northtippbees.com', 'northtippbees.secretary@gmail.com'),
  ('South Tipperary Beekeepers Association', 'ROI', 'Tipperary (South)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://southtippbees.com', 'southtippbees@gmail.com'),
  ('Bee Happy Beekeepers Waterford', 'ROI', 'Waterford', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('Co. Waterford Beekeepers Association (Co. WBKA)', 'ROI', 'Waterford', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('East Waterford Beekeepers Association', 'ROI', 'Waterford (East)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'waterfordbees@gmail.com'),
  ('Belvedere Beekeepers Association', 'ROI', 'Westmeath', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', NULL, NULL),
  ('Lake County Beekeepers Association', 'ROI', 'Westmeath (Mullingar)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://www.instagram.com/lakecountybeekeeping', 'Lcba24sec@gmail.com'),
  ('County Wexford Beekeepers Association', 'ROI', 'Wexford', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://countywexfordbeekeepersassociation.com', 'countywexfordbeekeepers@gmail.com'),
  ('Menapian Beekeepers (Wexford)', 'ROI', 'Wexford', 'IBA', 'irishbeekeepers.ie/membership/affiliated_clubs', 'https://www.facebook.com/menapianbee/', NULL),
  ('Gorey Beekeepers Association', 'ROI', 'Wexford (Gorey)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', 'https://goreybeekeepers.com', 'secretary.goreybeekeepers@gmail.com'),
  ('New Ross Beekeepers Association', 'ROI', 'Wexford (New Ross)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'Timnuttall2003@yahoo.com'),
  ('South Wexford Beekeepers Association', 'ROI', 'Wexford (South)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretaryswbka@gmail.com'),
  ('Ashford Beekeepers Association', 'ROI', 'Wicklow (Ashford)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'wicklowbees@gmail.com; abka.secretary@gmail.com'),
  ('Roundwood Beekeepers Association', 'ROI', 'Wicklow (Roundwood)', 'FIBKA', 'irishbeekeeping.ie/beekeeping-near-you', NULL, 'secretary.roundwoodbka@gmail.com')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  total_count INTEGER;
  ni_count INTEGER;
  roi_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.beekeeping_associations;
  SELECT COUNT(*) INTO ni_count FROM public.beekeeping_associations WHERE jurisdiction = 'NI';
  SELECT COUNT(*) INTO roi_count FROM public.beekeeping_associations WHERE jurisdiction = 'ROI';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'IRISH BEEKEEPING ASSOCIATIONS IMPORTED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total associations: %', total_count;
  RAISE NOTICE 'Northern Ireland (NI): %', ni_count;
  RAISE NOTICE 'Republic of Ireland (ROI): %', roi_count;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Sample associations:';
END $$;

-- Show sample of imported data
SELECT
  jurisdiction,
  county_area,
  name,
  affiliation
FROM public.beekeeping_associations
ORDER BY jurisdiction, county_area
LIMIT 10;

-- Show breakdown by affiliation
SELECT
  affiliation,
  COUNT(*) as association_count
FROM public.beekeeping_associations
GROUP BY affiliation
ORDER BY association_count DESC;
