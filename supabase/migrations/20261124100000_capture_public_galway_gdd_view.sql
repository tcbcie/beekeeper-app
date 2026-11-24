-- Records two views that were created by hand through the Supabase MCP and had no migration file.
-- The definitions and grants below are copied from the live database (24/11/2026); applying this
-- file changes nothing there. It exists so the schema can be recreated from the repo.
--
-- shared_gdd_records_community: internal only (no anon / authenticated grants since security batch 4).
-- public_galway_gdd: anon-readable, shared Galway records without user ids or coordinates. Read by the
-- tcbc.ie research embed and the public phenology feed (/api/embed/phenology).

CREATE OR REPLACE VIEW public.shared_gdd_records_community AS
SELECT gr.id,
    gr.vegetation_type_id,
    gr.year,
    gr.start_date,
    gr.end_date,
    gr.gdd_value,
    gr.user_id,
    dv.value AS vegetation_name,
    a.city,
    a.latitude,
    a.longitude
FROM gdd_records gr
    JOIN apiaries a ON gr.apiary_id = a.id
    LEFT JOIN dropdown_values dv ON gr.vegetation_type_id = dv.id
WHERE gr.is_shared = true AND a.latitude IS NOT NULL AND a.longitude IS NOT NULL;

REVOKE ALL ON public.shared_gdd_records_community FROM anon, authenticated;

CREATE OR REPLACE VIEW public.public_galway_gdd AS
SELECT id,
    vegetation_type_id,
    vegetation_name,
    year,
    start_date,
    end_date,
    gdd_value,
    city
FROM shared_gdd_records_community
WHERE latitude >= 53.00 AND latitude <= 53.80 AND longitude >= -10.20 AND longitude <= -8.30;

GRANT SELECT ON public.public_galway_gdd TO anon;
