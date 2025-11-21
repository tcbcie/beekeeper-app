-- =====================================================
-- HiveCraic Database Backup
-- Generated: 2025-11-21
-- Description: Complete schema backup including tables, constraints, indexes, and policies
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Apiaries Table
CREATE TABLE IF NOT EXISTS public.apiaries (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    location text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    city text,
    eircode varchar(8),
    user_id uuid,
    CONSTRAINT apiaries_pkey PRIMARY KEY (id)
);

-- Beekeeping Associations Table
CREATE TABLE IF NOT EXISTS public.beekeeping_associations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    CONSTRAINT beekeeping_associations_pkey PRIMARY KEY (id)
);

-- Colonies Table
CREATE TABLE IF NOT EXISTS public.colonies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    colony_number text NOT NULL,
    user_id uuid NOT NULL,
    origin_type text NOT NULL,
    origin_date date NOT NULL,
    parent_colony_id uuid,
    secondary_parent_colony_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    status_date date,
    status_reason text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT colonies_pkey PRIMARY KEY (id),
    CONSTRAINT colonies_parent_colony_id_fkey FOREIGN KEY (parent_colony_id) REFERENCES colonies(id),
    CONSTRAINT colonies_secondary_parent_colony_id_fkey FOREIGN KEY (secondary_parent_colony_id) REFERENCES colonies(id)
);

-- Colony Movements Table
CREATE TABLE IF NOT EXISTS public.colony_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    colony_id uuid NOT NULL,
    user_id uuid NOT NULL,
    from_hive_id uuid,
    to_hive_id uuid,
    movement_date date NOT NULL,
    movement_type text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT colony_movements_pkey PRIMARY KEY (id),
    CONSTRAINT colony_movements_colony_id_fkey FOREIGN KEY (colony_id) REFERENCES colonies(id) ON DELETE CASCADE
);

-- Dropdown Categories Table
CREATE TABLE IF NOT EXISTS public.dropdown_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_key varchar(100) NOT NULL,
    category_name varchar(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dropdown_categories_pkey PRIMARY KEY (id),
    CONSTRAINT dropdown_categories_category_key_key UNIQUE (category_key)
);

-- Dropdown Values Table
CREATE TABLE IF NOT EXISTS public.dropdown_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    value varchar(100) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dropdown_values_pkey PRIMARY KEY (id),
    CONSTRAINT dropdown_values_category_id_fkey FOREIGN KEY (category_id) REFERENCES dropdown_categories(id) ON DELETE CASCADE
);

-- Feedings Table
CREATE TABLE IF NOT EXISTS public.feedings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hive_id uuid NOT NULL,
    colony_id uuid,
    user_id uuid,
    feed_date date NOT NULL,
    feed_type text NOT NULL,
    quantity numeric,
    unit text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feedings_pkey PRIMARY KEY (id)
);

-- Harvests Table
CREATE TABLE IF NOT EXISTS public.harvests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hive_id uuid NOT NULL,
    colony_id uuid,
    user_id uuid,
    harvest_date date NOT NULL,
    honey_weight numeric,
    wax_weight numeric,
    unit text NOT NULL,
    frames_harvested integer,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT harvests_pkey PRIMARY KEY (id)
);

-- Hives Table
CREATE TABLE IF NOT EXISTS public.hives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hive_number text NOT NULL,
    apiary_id uuid,
    colony_id uuid,
    queen_id uuid,
    user_id uuid,
    hive_type varchar(50),
    status text DEFAULT 'active'::text,
    configuration jsonb,
    row_in_apiary integer,
    order_in_apiary integer,
    order_direction text,
    queen_installed_date date,
    colony_established_date date,
    queen_marked boolean DEFAULT false,
    queen_clipped boolean DEFAULT false,
    queen_mated boolean DEFAULT false,
    queen_marking_color text,
    notes text,
    archived_at timestamp with time zone,
    archive_reason_id uuid,
    archive_notes text,
    configuration_changed_at timestamp with time zone,
    configuration_changed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT hives_pkey PRIMARY KEY (id)
);

-- Inspections Table
CREATE TABLE IF NOT EXISTS public.inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hive_id uuid,
    colony_id uuid,
    user_id uuid,
    inspection_date date NOT NULL,
    inspection_time time without time zone,
    inspected_by uuid,
    weather_condition varchar(50),
    weather_temp integer,
    weather_humidity integer,
    weather_wind_speed integer,
    weight numeric,
    queen_seen boolean DEFAULT false,
    eggs_present boolean DEFAULT false,
    brood_pattern_rating integer,
    temperament_rating integer,
    population_strength integer,
    swarming_tendency integer,
    calmness integer,
    recapping integer,
    vsh integer,
    smr integer,
    brood_frames integer,
    frames_brood integer,
    frames_drawn integer,
    frames_foundation integer,
    drone_frames integer,
    store_frames integer,
    honey_supers integer,
    right_sized_frames integer,
    remaining_cells integer,
    drone_brood_present boolean DEFAULT false,
    drones_present integer,
    queen_cups boolean DEFAULT false,
    queen_cups_number integer,
    queen_cups_removed_all boolean,
    swarm_cells boolean DEFAULT false,
    swarm_cells_number integer,
    swarm_cells_removed_all boolean,
    supercedure_cells boolean DEFAULT false,
    supercedure_cells_number integer,
    supercedure_cells_removed_all boolean,
    emergency_cells boolean DEFAULT false,
    emergency_cells_number integer,
    emergency_cells_removed_all boolean,
    removed_cells integer,
    queen_cells_notes text,
    honey_stores text,
    disease_issues text,
    afb_disease integer,
    efb_disease integer,
    chalkbrood_disease integer,
    nosemosis_disease integer,
    dwv_disease integer,
    iapv_cbpv_disease integer,
    notes text,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT inspections_pkey PRIMARY KEY (id)
);

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    original_email text,
    role text DEFAULT 'User'::text NOT NULL,
    first_name text,
    last_name text,
    full_name text,
    mobile_number text,
    association_id uuid,
    is_association_member boolean DEFAULT false,
    member_fibka boolean DEFAULT false,
    member_iba boolean DEFAULT false,
    member_nihbs boolean DEFAULT false,
    used_registration_code_id uuid,
    current_subscription_code_id uuid,
    subscription_type text,
    subscription_price numeric,
    subscription_expires_at timestamp with time zone,
    last_subscription_reminder_sent timestamp with time zone,
    stripe_customer_id text,
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Queens Table
CREATE TABLE IF NOT EXISTS public.queens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queen_number text NOT NULL,
    user_id uuid,
    birth_date date,
    subspecies text,
    source text,
    lineage text,
    marking_color text,
    queen_clipped boolean DEFAULT false,
    mother_id uuid,
    father_id uuid,
    mated_at_eircode varchar(10),
    status text DEFAULT 'active'::text,
    performance_notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT queens_pkey PRIMARY KEY (id),
    CONSTRAINT queens_father_id_fkey FOREIGN KEY (father_id) REFERENCES queens(id),
    CONSTRAINT queens_mother_id_fkey FOREIGN KEY (mother_id) REFERENCES queens(id)
);

-- Reactivation Requests Table
CREATE TABLE IF NOT EXISTS public.reactivation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_email text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    processed_at timestamp with time zone,
    processed_by uuid,
    admin_notes text,
    CONSTRAINT reactivation_requests_pkey PRIMARY KEY (id),
    CONSTRAINT reactivation_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Rearing Batches Table
CREATE TABLE IF NOT EXISTS public.rearing_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_name text NOT NULL,
    user_id uuid,
    mother_queen_id uuid,
    graft_date date NOT NULL,
    acceptance_check_date date,
    first_option_to_cage_date date,
    second_option_to_cage_date date,
    emergence_date date,
    cell_count integer,
    grafts_accepted integer,
    queens_hatched integer,
    queens_mated integer,
    starter_colony_hive_id uuid,
    status text DEFAULT 'active'::text,
    enable_browser_notifications boolean DEFAULT false,
    enable_email_digest boolean DEFAULT false,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT rearing_batches_pkey PRIMARY KEY (id),
    CONSTRAINT rearing_batches_mother_queen_id_fkey FOREIGN KEY (mother_queen_id) REFERENCES queens(id),
    CONSTRAINT rearing_batches_starter_colony_hive_id_fkey FOREIGN KEY (starter_colony_hive_id) REFERENCES hives(id)
);

-- Registration Codes Table
CREATE TABLE IF NOT EXISTS public.registration_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code varchar(50) NOT NULL,
    code_type text NOT NULL,
    description text,
    association_id uuid,
    subscription_expires_at timestamp with time zone,
    max_uses integer,
    current_uses integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT registration_codes_pkey PRIMARY KEY (id),
    CONSTRAINT registration_codes_code_key UNIQUE (code),
    CONSTRAINT registration_codes_association_id_fkey FOREIGN KEY (association_id) REFERENCES beekeeping_associations(id)
);

-- Subscription History Table
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code varchar(50),
    code_id uuid,
    subscription_type text,
    payment_method text,
    price_paid numeric,
    activated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    code_expires_at timestamp with time zone,
    stripe_payment_intent_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT subscription_history_pkey PRIMARY KEY (id),
    CONSTRAINT subscription_history_code_id_fkey FOREIGN KEY (code_id) REFERENCES registration_codes(id)
);

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    subject varchar(255) NOT NULL,
    description text NOT NULL,
    ticket_type varchar(20) NOT NULL,
    status varchar(20) DEFAULT 'open'::character varying NOT NULL,
    priority varchar(20) DEFAULT 'medium'::character varying,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    admin_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT support_tickets_pkey PRIMARY KEY (id)
);

-- Tasks/Events Table
CREATE TABLE IF NOT EXISTS public.tasks_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title varchar(255) NOT NULL,
    description text,
    event_type varchar(50) NOT NULL,
    category varchar(50),
    start_date date NOT NULL,
    start_time time without time zone,
    end_date date,
    end_time time without time zone,
    all_day boolean DEFAULT false,
    completed boolean DEFAULT false,
    completed_at timestamp with time zone,
    priority varchar(20) DEFAULT 'medium'::character varying,
    hive_id uuid,
    apiary_id uuid,
    batch_id uuid,
    is_team_task boolean DEFAULT false,
    is_recurring boolean DEFAULT false,
    recurrence_pattern varchar(50),
    recurrence_end_date date,
    reminder_enabled boolean DEFAULT false,
    reminder_minutes_before integer DEFAULT 60,
    reminder_sent boolean DEFAULT false,
    google_calendar_event_id varchar(255),
    google_calendar_synced_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT tasks_events_pkey PRIMARY KEY (id)
);

-- Team Apiaries Table
CREATE TABLE IF NOT EXISTS public.team_apiaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    apiary_id uuid NOT NULL,
    added_by uuid,
    added_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_apiaries_pkey PRIMARY KEY (id),
    CONSTRAINT team_apiaries_team_id_apiary_id_key UNIQUE (team_id, apiary_id)
);

-- Team Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    email varchar(255) NOT NULL,
    invited_by uuid NOT NULL,
    status varchar(50) DEFAULT 'pending'::character varying,
    invited_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '14 days'::interval),
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    CONSTRAINT team_invitations_pkey PRIMARY KEY (id)
);

-- Team Members Table
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role varchar(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now(),
    CONSTRAINT team_members_pkey PRIMARY KEY (id),
    CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id)
);

-- Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar(255) NOT NULL,
    owner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT teams_pkey PRIMARY KEY (id)
);

-- Varroa Checks Table
CREATE TABLE IF NOT EXISTS public.varroa_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hive_id uuid NOT NULL,
    colony_id uuid,
    user_id uuid,
    check_date date NOT NULL,
    method varchar(100) NOT NULL,
    sample_size integer,
    mites_count integer,
    infestation_rate numeric,
    action_threshold_reached boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT varroa_checks_pkey PRIMARY KEY (id)
);

-- Varroa Treatment Products Table
CREATE TABLE IF NOT EXISTS public.varroa_treatment_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_name text NOT NULL,
    active_ingredients text NOT NULL,
    application_method text NOT NULL,
    treatment_duration text NOT NULL,
    temperature_range text NOT NULL,
    withdrawal_period_days integer NOT NULL,
    honey_flow_restrictions text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT varroa_treatment_products_pkey PRIMARY KEY (id)
);

-- Varroa Treatments Table
CREATE TABLE IF NOT EXISTS public.varroa_treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hive_id uuid NOT NULL,
    colony_id uuid,
    user_id uuid NOT NULL,
    treatment_date date NOT NULL,
    treatment_type text NOT NULL,
    dosage text,
    temperature numeric,
    weather_conditions text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT varroa_treatments_pkey PRIMARY KEY (id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apiaries_user_id ON public.apiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_colonies_user_id ON public.colonies(user_id);
CREATE INDEX IF NOT EXISTS idx_hives_user_id ON public.hives(user_id);
CREATE INDEX IF NOT EXISTS idx_hives_apiary_id ON public.hives(apiary_id);
CREATE INDEX IF NOT EXISTS idx_hives_colony_id ON public.hives(colony_id);
CREATE INDEX IF NOT EXISTS idx_inspections_hive_id ON public.inspections(hive_id);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON public.inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON public.inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_queens_user_id ON public.queens(user_id);
CREATE INDEX IF NOT EXISTS idx_varroa_checks_hive_id ON public.varroa_checks(hive_id);
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_hive_id ON public.varroa_treatments(hive_id);
CREATE INDEX IF NOT EXISTS idx_feedings_hive_id ON public.feedings(hive_id);
CREATE INDEX IF NOT EXISTS idx_harvests_hive_id ON public.harvests(hive_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_apiaries_team_id ON public.team_apiaries(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_events_user_id ON public.tasks_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_events_start_date ON public.tasks_events(start_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rearing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Note: Individual RLS policies should be created based on your specific security requirements
-- See rls_policies_2025-11-20.sql for detailed policy definitions

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER update_beekeeping_associations_updated_at
    BEFORE UPDATE ON public.beekeeping_associations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_colonies_updated_at
    BEFORE UPDATE ON public.colonies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dropdown_categories_updated_at
    BEFORE UPDATE ON public.dropdown_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dropdown_values_updated_at
    BEFORE UPDATE ON public.dropdown_values
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedings_updated_at
    BEFORE UPDATE ON public.feedings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_harvests_updated_at
    BEFORE UPDATE ON public.harvests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registration_codes_updated_at
    BEFORE UPDATE ON public.registration_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_events_updated_at
    BEFORE UPDATE ON public.tasks_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_varroa_checks_updated_at
    BEFORE UPDATE ON public.varroa_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_varroa_treatment_products_updated_at
    BEFORE UPDATE ON public.varroa_treatment_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_varroa_treatments_updated_at
    BEFORE UPDATE ON public.varroa_treatments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF BACKUP
-- =====================================================

-- This backup was generated from the HiveCraic production database
-- To restore, execute this file against a clean PostgreSQL database
-- Note: This does not include actual data rows, only schema definitions
-- For data backup, use pg_dump with --data-only flag
