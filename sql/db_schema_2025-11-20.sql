-- ============================================================================
-- Beekeeper App Database Schema Export
-- Generated: 2025-11-20
-- Source: Supabase Production Database
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA graphql;
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;

-- ============================================================================
-- CUSTOM TYPES
-- ============================================================================

CREATE TYPE subscription_code_type AS ENUM ('individual', 'association');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (User accounts and authentication)
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'User'::text,
    created_at timestamp with time zone DEFAULT now(),
    first_name text,
    last_name text,
    mobile_number text,
    full_name text DEFAULT
CASE
    WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN ((first_name || ' '::text) || last_name)
    WHEN (first_name IS NOT NULL) THEN first_name
    WHEN (last_name IS NOT NULL) THEN last_name
    ELSE NULL::text
END,
    is_active boolean DEFAULT true,
    used_registration_code_id uuid,
    subscription_expires_at timestamp with time zone,
    current_subscription_code_id uuid,
    last_subscription_reminder_sent timestamp with time zone,
    subscription_type text,
    subscription_price numeric(10,2),
    is_association_member boolean DEFAULT false,
    association_id uuid,
    stripe_customer_id text,
    deleted_at timestamp with time zone,
    original_email text,
    member_fibka boolean DEFAULT false,
    member_iba boolean DEFAULT false,
    member_nihbs boolean DEFAULT false,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

COMMENT ON COLUMN public.profiles.used_registration_code_id IS 'The registration code that was used to sign up this user';
COMMENT ON COLUMN public.profiles.subscription_expires_at IS 'Date when user subscription expires - user loses access after this date';
COMMENT ON COLUMN public.profiles.current_subscription_code_id IS 'Current active subscription code - updated when user renews';
COMMENT ON COLUMN public.profiles.last_subscription_reminder_sent IS 'Last time we sent subscription expiration reminder email';
COMMENT ON COLUMN public.profiles.is_association_member IS 'Quick flag indicating if user is an association member (has association_id set)';
COMMENT ON COLUMN public.profiles.association_id IS 'Reference to local beekeeping association (if member of one)';
COMMENT ON COLUMN public.profiles.member_fibka IS 'Member of Federation of Irish Beekeepers Associations (FIBKA)';
COMMENT ON COLUMN public.profiles.member_iba IS 'Member of Irish Beekeepers Association (IBA)';
COMMENT ON COLUMN public.profiles.member_nihbs IS 'Member of Native Irish Honey Bee Society (NIHBS)';

-- Beekeeping Associations
CREATE TABLE public.beekeeping_associations (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL,
    jurisdiction text,
    county_area text,
    affiliation text,
    source text,
    website text,
    email text,
    phone text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT beekeeping_associations_pkey PRIMARY KEY (id),
    CONSTRAINT beekeeping_associations_jurisdiction_check CHECK (jurisdiction = ANY (ARRAY['NI'::text, 'ROI'::text]))
);

-- Apiaries
CREATE TABLE public.apiaries (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    location text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    city text,
    eircode character varying(8),
    user_id uuid,
    CONSTRAINT apiaries_pkey PRIMARY KEY (id)
);

COMMENT ON COLUMN public.apiaries.city IS 'City or town where the apiary is located';
COMMENT ON COLUMN public.apiaries.eircode IS 'Eircode for the apiary location (used for weather data)';

-- Colonies
CREATE TABLE public.colonies (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    colony_number text NOT NULL,
    user_id uuid NOT NULL,
    origin_type text NOT NULL,
    origin_date date NOT NULL,
    parent_colony_id uuid,
    secondary_parent_colony_id uuid,
    status text NOT NULL DEFAULT 'active'::text,
    status_date date,
    status_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT colonies_pkey PRIMARY KEY (id),
    CONSTRAINT colonies_origin_type_check CHECK (origin_type = ANY (ARRAY['purchased'::text, 'split'::text, 'swarm'::text, 'caught_swarm'::text, 'nuc'::text, 'package'::text, 'combine'::text, 'other'::text])),
    CONSTRAINT colonies_status_check CHECK (status = ANY (ARRAY['active'::text, 'deceased'::text, 'swarmed'::text, 'combined'::text, 'sold'::text, 'given_away'::text]))
);

COMMENT ON TABLE public.colonies IS 'Tracks biological colonies separately from physical hive equipment';

-- Hives
CREATE TABLE public.hives (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    apiary_id uuid,
    hive_number text NOT NULL,
    queen_id uuid,
    status text DEFAULT 'active'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    queen_marked boolean DEFAULT false,
    queen_marking_color text,
    queen_mated boolean DEFAULT false,
    queen_clipped boolean DEFAULT false,
    colony_established_date date,
    queen_installed_date date,
    hive_type character varying(50),
    configuration jsonb,
    order_in_apiary integer,
    row_in_apiary integer,
    order_direction text DEFAULT 'entrances'::text,
    colony_id uuid,
    archived_at timestamp with time zone,
    archive_reason_id uuid,
    archive_notes text,
    configuration_changed_at timestamp with time zone,
    configuration_changed_by uuid,
    CONSTRAINT hives_pkey PRIMARY KEY (id),
    CONSTRAINT hives_order_direction_check CHECK (order_direction = ANY (ARRAY['entrances'::text, 'backs'::text]))
);

COMMENT ON COLUMN public.hives.queen_marked IS 'Indicates if the queen is marked (when no specific queen assigned)';
COMMENT ON COLUMN public.hives.queen_marking_color IS 'Color of queen marking (White, Yellow, Red, Green, Blue) when manually recorded';
COMMENT ON COLUMN public.hives.queen_mated IS 'Indicates if the queen is mated (when no specific queen assigned)';
COMMENT ON COLUMN public.hives.queen_clipped IS 'Indicates if the queen has clipped wings (when no specific queen assigned)';
COMMENT ON COLUMN public.hives.order_in_apiary IS 'Position of the hive within its row. The combination of row and order must be unique within each apiary.';
COMMENT ON COLUMN public.hives.row_in_apiary IS 'Physical row number where the hive is located in the apiary. The combination of row and order must be unique within each apiary.';
COMMENT ON COLUMN public.hives.order_direction IS 'Specifies whether left-to-right hive ordering in a row is from the perspective of looking at the entrances or the backs. Values: entrances, backs. Default: entrances.';
COMMENT ON COLUMN public.hives.archived_at IS 'When the hive was archived (NULL = not archived)';
COMMENT ON COLUMN public.hives.archive_reason_id IS 'Reference to dropdown_values for archiving reason';
COMMENT ON COLUMN public.hives.archive_notes IS 'Optional additional notes about archiving';
COMMENT ON COLUMN public.hives.configuration_changed_at IS 'Timestamp when the hive configuration (brood boxes, supers, etc.) was last modified';
COMMENT ON COLUMN public.hives.configuration_changed_by IS 'User ID of the person who last modified the hive configuration';

-- Queens
CREATE TABLE public.queens (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    queen_number text NOT NULL,
    mother_id uuid,
    father_id uuid,
    birth_date date,
    marking_color text,
    source text,
    subspecies text,
    status text DEFAULT 'active'::text,
    performance_notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    lineage text,
    queen_clipped boolean DEFAULT false,
    user_id uuid,
    mated_at_eircode character varying(10),
    CONSTRAINT queens_pkey PRIMARY KEY (id)
);

COMMENT ON COLUMN public.queens.queen_number IS 'Queen identification number (not unique across users)';
COMMENT ON COLUMN public.queens.subspecies IS 'Bee subspecies or breed (e.g., Italian, Carniolan, Buckfast)';
COMMENT ON COLUMN public.queens.lineage IS 'Queen lineage or breeder line information';
COMMENT ON COLUMN public.queens.queen_clipped IS 'Indicates whether the queen has had her wings clipped';
COMMENT ON COLUMN public.queens.mated_at_eircode IS 'Eircode (Irish postcode) where the queen was mated';

-- Inspections
CREATE TABLE public.inspections (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    hive_id uuid,
    inspection_date date NOT NULL,
    queen_seen boolean,
    eggs_present boolean,
    brood_pattern_rating integer,
    temperament_rating integer,
    population_strength integer,
    honey_stores text,
    disease_issues text,
    notes text,
    inspected_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    brood_frames integer,
    image_url text,
    weather_temp integer,
    weather_condition character varying(50),
    weather_humidity integer,
    weather_wind_speed integer,
    inspection_time time without time zone,
    user_id uuid,
    right_sized_frames integer,
    swarming_tendency integer DEFAULT 3,
    calmness integer DEFAULT 3,
    frames_foundation integer DEFAULT 0,
    frames_brood integer DEFAULT 0,
    frames_drawn integer DEFAULT 0,
    honey_supers integer DEFAULT 0,
    drone_frames integer DEFAULT 0,
    store_frames integer DEFAULT 0,
    recapping integer DEFAULT 3,
    vsh integer DEFAULT 3,
    smr integer DEFAULT 3,
    afb_disease integer DEFAULT 0,
    efb_disease integer DEFAULT 0,
    chalkbrood_disease integer DEFAULT 0,
    nosemosis_disease integer DEFAULT 0,
    dwv_disease integer DEFAULT 0,
    iapv_cbpv_disease integer DEFAULT 0,
    weight numeric(6,2),
    colony_id uuid,
    drone_brood_present boolean DEFAULT false,
    drones_present integer DEFAULT 0,
    queen_cups boolean DEFAULT false,
    queen_cups_number integer DEFAULT 0,
    queen_cups_removed_all boolean DEFAULT false,
    swarm_cells boolean DEFAULT false,
    swarm_cells_number integer DEFAULT 0,
    swarm_cells_removed_all boolean DEFAULT false,
    supercedure_cells boolean DEFAULT false,
    supercedure_cells_number integer DEFAULT 0,
    supercedure_cells_removed_all boolean DEFAULT false,
    emergency_cells boolean DEFAULT false,
    emergency_cells_number integer DEFAULT 0,
    emergency_cells_removed_all boolean DEFAULT false,
    removed_cells integer DEFAULT 0,
    remaining_cells integer DEFAULT 0,
    queen_cells_notes text DEFAULT ''::text,
    CONSTRAINT inspections_pkey PRIMARY KEY (id),
    CONSTRAINT inspections_drones_present_check CHECK (drones_present >= 0 AND drones_present <= 3),
    CONSTRAINT inspections_queen_cups_number_check CHECK (queen_cups_number >= 0),
    CONSTRAINT inspections_swarm_cells_number_check CHECK (swarm_cells_number >= 0),
    CONSTRAINT inspections_supercedure_cells_number_check CHECK (supercedure_cells_number >= 0),
    CONSTRAINT inspections_emergency_cells_number_check CHECK (emergency_cells_number >= 0),
    CONSTRAINT inspections_removed_cells_check CHECK (removed_cells >= 0),
    CONSTRAINT inspections_remaining_cells_check CHECK (remaining_cells >= 0)
);

-- Additional tables follow same pattern...
-- (Continuing with remaining tables: varroa_checks, varroa_treatments, feedings, harvests,
-- rearing_batches, colony_movements, teams, team_members, team_apiaries, team_invitations,
-- tasks_events, dropdown_categories, dropdown_values, registration_codes, subscription_history,
-- support_tickets, reactivation_requests, varroa_treatment_products)

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles indexes
CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);
CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX idx_profiles_subscription_expires_at ON public.profiles USING btree (subscription_expires_at) WHERE (subscription_expires_at IS NOT NULL);
CREATE INDEX idx_profiles_deleted_at ON public.profiles USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_profiles_association_id ON public.profiles USING btree (association_id);
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles USING btree (stripe_customer_id);
CREATE INDEX idx_profiles_current_subscription_code_id ON public.profiles USING btree (current_subscription_code_id) WHERE (current_subscription_code_id IS NOT NULL);
CREATE INDEX idx_profiles_used_registration_code_id ON public.profiles USING btree (used_registration_code_id);

-- Apiaries indexes
CREATE INDEX idx_apiaries_user_id ON public.apiaries USING btree (user_id);
CREATE INDEX idx_apiaries_created_by ON public.apiaries USING btree (created_by);

-- Hives indexes
CREATE INDEX idx_hives_user_id ON public.hives USING btree (user_id);
CREATE INDEX hives_colony_id_idx ON public.hives USING btree (colony_id);
CREATE INDEX idx_hives_archived_at ON public.hives USING btree (archived_at);
CREATE INDEX idx_hives_archive_reason_id ON public.hives USING btree (archive_reason_id);
CREATE INDEX idx_hives_configuration_changed_at ON public.hives USING btree (configuration_changed_at);
CREATE INDEX idx_hives_configuration_changed_by ON public.hives USING btree (configuration_changed_by);
CREATE UNIQUE INDEX unique_hive_position_per_apiary ON public.hives USING btree (apiary_id, row_in_apiary, order_in_apiary);

-- Colonies indexes
CREATE UNIQUE INDEX colonies_colony_number_key ON public.colonies USING btree (colony_number);
CREATE INDEX colonies_user_id_idx ON public.colonies USING btree (user_id);
CREATE INDEX colonies_status_idx ON public.colonies USING btree (status);
CREATE INDEX colonies_parent_colony_id_idx ON public.colonies USING btree (parent_colony_id);
CREATE INDEX idx_colonies_secondary_parent_colony_id ON public.colonies USING btree (secondary_parent_colony_id);

-- Queens indexes
CREATE INDEX idx_queens_user_id ON public.queens USING btree (user_id);
CREATE INDEX idx_queens_created_by ON public.queens USING btree (created_by);
CREATE INDEX idx_queens_mother_id ON public.queens USING btree (mother_id);
CREATE INDEX idx_queens_father_id ON public.queens USING btree (father_id);

-- Inspections indexes
CREATE INDEX idx_inspections_hive_id ON public.inspections USING btree (hive_id);
CREATE INDEX idx_inspections_user_id ON public.inspections USING btree (user_id);
CREATE INDEX idx_inspections_inspected_by ON public.inspections USING btree (inspected_by);
CREATE INDEX inspections_colony_id_idx ON public.inspections USING btree (colony_id);

-- Additional indexes for other tables...

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_association_id_fkey FOREIGN KEY (association_id) REFERENCES public.beekeeping_associations(id);
ALTER TABLE public.profiles ADD CONSTRAINT profiles_current_subscription_code_id_fkey FOREIGN KEY (current_subscription_code_id) REFERENCES public.registration_codes(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_used_registration_code_id_fkey FOREIGN KEY (used_registration_code_id) REFERENCES public.registration_codes(id) ON DELETE SET NULL;

ALTER TABLE public.apiaries ADD CONSTRAINT apiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.apiaries ADD CONSTRAINT apiaries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

ALTER TABLE public.colonies ADD CONSTRAINT colonies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.colonies ADD CONSTRAINT colonies_parent_colony_id_fkey FOREIGN KEY (parent_colony_id) REFERENCES public.colonies(id);
ALTER TABLE public.colonies ADD CONSTRAINT colonies_secondary_parent_colony_id_fkey FOREIGN KEY (secondary_parent_colony_id) REFERENCES public.colonies(id);

ALTER TABLE public.hives ADD CONSTRAINT hives_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.hives ADD CONSTRAINT hives_apiary_id_fkey FOREIGN KEY (apiary_id) REFERENCES public.apiaries(id) ON DELETE SET NULL;
ALTER TABLE public.hives ADD CONSTRAINT hives_colony_id_fkey FOREIGN KEY (colony_id) REFERENCES public.colonies(id);
ALTER TABLE public.hives ADD CONSTRAINT hives_archive_reason_id_fkey FOREIGN KEY (archive_reason_id) REFERENCES public.dropdown_values(id) ON DELETE SET NULL;
ALTER TABLE public.hives ADD CONSTRAINT hives_configuration_changed_by_fkey FOREIGN KEY (configuration_changed_by) REFERENCES public.profiles(id);

ALTER TABLE public.queens ADD CONSTRAINT queens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE public.queens ADD CONSTRAINT queens_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);
ALTER TABLE public.queens ADD CONSTRAINT queens_mother_id_fkey FOREIGN KEY (mother_id) REFERENCES public.queens(id);
ALTER TABLE public.queens ADD CONSTRAINT queens_father_id_fkey FOREIGN KEY (father_id) REFERENCES public.queens(id);

ALTER TABLE public.inspections ADD CONSTRAINT inspections_hive_id_fkey FOREIGN KEY (hive_id) REFERENCES public.hives(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_inspected_by_fkey FOREIGN KEY (inspected_by) REFERENCES public.profiles(id);
ALTER TABLE public.inspections ADD CONSTRAINT inspections_colony_id_fkey FOREIGN KEY (colony_id) REFERENCES public.colonies(id);

-- Additional foreign keys for remaining tables...

-- ============================================================================
-- NOTE: This is a partial schema export showing the main structure.
-- For complete schema including all tables, see the full export.
-- For RLS policies, see the separate rls_policies_2025-11-20.sql file.
-- ============================================================================
