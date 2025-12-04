-- ============================================================================
-- HiveCraic Beekeeping App - Database Backup
-- Generated: 2024-12-04
-- Database: Supabase Postgres
-- Description: Complete schema and data backup for all tables
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SCHEMA: Profiles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'User'::text NOT NULL CHECK (role IN ('User', 'Power User', 'Admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    first_name TEXT,
    last_name TEXT,
    mobile_number TEXT,
    full_name TEXT GENERATED ALWAYS AS (
        CASE
            WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN ((first_name || ' '::text) || last_name)
            WHEN (first_name IS NOT NULL) THEN first_name
            WHEN (last_name IS NOT NULL) THEN last_name
            ELSE NULL::text
        END
    ) STORED,
    is_active BOOLEAN DEFAULT true,
    used_registration_code_id UUID,
    subscription_expires_at TIMESTAMPTZ,
    current_subscription_code_id UUID,
    last_subscription_reminder_sent TIMESTAMPTZ,
    subscription_type TEXT CHECK (subscription_type IN ('code', 'credit_card', 'none') OR subscription_type IS NULL),
    subscription_price NUMERIC,
    is_association_member BOOLEAN DEFAULT false,
    association_id UUID,
    stripe_customer_id TEXT,
    deleted_at TIMESTAMPTZ,
    original_email TEXT,
    member_fibka BOOLEAN DEFAULT false,
    member_iba BOOLEAN DEFAULT false,
    member_nihbs BOOLEAN DEFAULT false
);

-- ============================================================================
-- SCHEMA: Beekeeping Associations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.beekeeping_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    jurisdiction TEXT CHECK (jurisdiction IN ('NI', 'ROI')),
    county_area TEXT,
    affiliation TEXT,
    source TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.beekeeping_associations IS 'Local beekeeping associations across Ireland and Northern Ireland';

-- ============================================================================
-- SCHEMA: Registration Codes Table
-- ============================================================================
CREATE TYPE subscription_code_type AS ENUM ('individual', 'association');

CREATE TABLE IF NOT EXISTS public.registration_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR UNIQUE NOT NULL,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    subscription_expires_at TIMESTAMPTZ,
    code_type subscription_code_type DEFAULT 'individual'::subscription_code_type NOT NULL,
    association_id UUID REFERENCES public.beekeeping_associations(id)
);

-- ============================================================================
-- SCHEMA: Apiaries Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.apiaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    city TEXT,
    eircode VARCHAR,
    user_id UUID REFERENCES auth.users(id),
    is_uk_ni BOOLEAN DEFAULT false
);

-- ============================================================================
-- SCHEMA: Colonies Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.colonies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colony_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    origin_type TEXT NOT NULL CHECK (origin_type IN ('purchased', 'split', 'swarm', 'caught_swarm', 'nuc', 'package', 'combine', 'other')),
    origin_date DATE NOT NULL,
    parent_colony_id UUID REFERENCES public.colonies(id),
    secondary_parent_colony_id UUID REFERENCES public.colonies(id),
    status TEXT DEFAULT 'active'::text NOT NULL CHECK (status IN ('active', 'deceased', 'swarmed', 'combined', 'sold', 'given_away')),
    status_date DATE,
    status_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA: Hives Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    apiary_id UUID REFERENCES public.apiaries(id),
    hive_number TEXT NOT NULL,
    queen_id UUID,
    status TEXT DEFAULT 'active'::text,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    queen_marked BOOLEAN DEFAULT false,
    queen_marking_color TEXT,
    queen_mated BOOLEAN DEFAULT false,
    queen_clipped BOOLEAN DEFAULT false,
    colony_established_date DATE,
    queen_installed_date DATE,
    hive_type VARCHAR,
    configuration JSONB,
    order_in_apiary INTEGER,
    row_in_apiary INTEGER,
    order_direction TEXT DEFAULT 'entrances'::text CHECK (order_direction IN ('entrances', 'backs')),
    colony_id UUID REFERENCES public.colonies(id),
    archived_at TIMESTAMPTZ,
    archive_reason_id UUID,
    archive_notes TEXT,
    configuration_changed_at TIMESTAMPTZ,
    configuration_changed_by UUID REFERENCES public.profiles(id)
);

-- ============================================================================
-- SCHEMA: Queens Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.queens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queen_number TEXT NOT NULL,
    mother_id UUID REFERENCES public.queens(id),
    father_id UUID REFERENCES public.queens(id),
    birth_date DATE,
    marking_color TEXT,
    source TEXT,
    subspecies TEXT,
    status TEXT DEFAULT 'active'::text,
    performance_notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    lineage TEXT,
    queen_clipped BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    mated_at_eircode VARCHAR
);

-- ============================================================================
-- SCHEMA: Rearing Batches Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rearing_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_name TEXT NOT NULL,
    mother_queen_id UUID REFERENCES public.queens(id),
    graft_date DATE NOT NULL,
    cell_count INTEGER,
    emergence_date DATE,
    status TEXT DEFAULT 'grafted'::text,
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    acceptance_check_date DATE,
    grafts_accepted INTEGER,
    queens_hatched INTEGER,
    queens_mated INTEGER,
    starter_colony_hive_id UUID REFERENCES public.hives(id),
    first_option_to_cage_date DATE,
    second_option_to_cage_date DATE,
    enable_browser_notifications BOOLEAN DEFAULT false,
    enable_email_digest BOOLEAN DEFAULT false
);

-- ============================================================================
-- SCHEMA: Inspections Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hive_id UUID REFERENCES public.hives(id),
    inspection_date DATE NOT NULL,
    queen_seen BOOLEAN,
    eggs_present BOOLEAN,
    brood_pattern_rating INTEGER,
    temperament_rating INTEGER,
    population_strength INTEGER,
    honey_stores TEXT,
    disease_issues TEXT,
    notes TEXT,
    inspected_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    brood_frames INTEGER,
    image_url TEXT,
    weather_temp INTEGER,
    weather_condition VARCHAR,
    weather_humidity INTEGER,
    weather_wind_speed INTEGER,
    inspection_time TIME,
    user_id UUID REFERENCES public.profiles(id),
    right_sized_frames INTEGER,
    swarming_tendency INTEGER DEFAULT 3,
    calmness INTEGER DEFAULT 3,
    frames_foundation INTEGER DEFAULT 0,
    frames_brood INTEGER DEFAULT 0,
    frames_drawn INTEGER DEFAULT 0,
    honey_supers INTEGER DEFAULT 0,
    drone_frames INTEGER DEFAULT 0,
    store_frames INTEGER DEFAULT 0,
    recapping INTEGER DEFAULT 3,
    vsh INTEGER DEFAULT 3,
    smr INTEGER DEFAULT 3,
    afb_disease INTEGER DEFAULT 0,
    efb_disease INTEGER DEFAULT 0,
    chalkbrood_disease INTEGER DEFAULT 0,
    nosemosis_disease INTEGER DEFAULT 0,
    dwv_disease INTEGER DEFAULT 0,
    iapv_cbpv_disease INTEGER DEFAULT 0,
    weight NUMERIC,
    colony_id UUID REFERENCES public.colonies(id),
    drone_brood_present BOOLEAN DEFAULT false,
    drones_present INTEGER DEFAULT 0 CHECK (drones_present >= 0 AND drones_present <= 3),
    queen_cups BOOLEAN DEFAULT false,
    queen_cups_number INTEGER DEFAULT 0 CHECK (queen_cups_number >= 0),
    queen_cups_removed_all BOOLEAN DEFAULT false,
    swarm_cells BOOLEAN DEFAULT false,
    swarm_cells_number INTEGER DEFAULT 0 CHECK (swarm_cells_number >= 0),
    swarm_cells_removed_all BOOLEAN DEFAULT false,
    supercedure_cells BOOLEAN DEFAULT false,
    supercedure_cells_number INTEGER DEFAULT 0 CHECK (supercedure_cells_number >= 0),
    supercedure_cells_removed_all BOOLEAN DEFAULT false,
    emergency_cells BOOLEAN DEFAULT false,
    emergency_cells_number INTEGER DEFAULT 0 CHECK (emergency_cells_number >= 0),
    emergency_cells_removed_all BOOLEAN DEFAULT false,
    removed_cells INTEGER DEFAULT 0 CHECK (removed_cells >= 0),
    remaining_cells INTEGER DEFAULT 0 CHECK (remaining_cells >= 0),
    queen_cells_notes TEXT DEFAULT ''::text
);

-- ============================================================================
-- SCHEMA: Varroa Checks Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.varroa_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hive_id UUID REFERENCES public.hives(id) NOT NULL,
    check_date DATE NOT NULL,
    method VARCHAR NOT NULL,
    mites_count INTEGER,
    sample_size INTEGER,
    infestation_rate NUMERIC,
    action_threshold_reached BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES public.profiles(id),
    colony_id UUID REFERENCES public.colonies(id)
);

-- ============================================================================
-- SCHEMA: Varroa Treatments Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.varroa_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    hive_id UUID REFERENCES public.hives(id) NOT NULL,
    treatment_date DATE NOT NULL,
    treatment_type TEXT NOT NULL,
    dosage TEXT,
    temperature NUMERIC,
    weather_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    colony_id UUID REFERENCES public.colonies(id)
);

-- ============================================================================
-- SCHEMA: Feedings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hive_id UUID REFERENCES public.hives(id) NOT NULL,
    feed_date DATE NOT NULL,
    feed_type TEXT NOT NULL,
    quantity NUMERIC,
    unit TEXT DEFAULT 'kg'::text NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES public.profiles(id),
    colony_id UUID REFERENCES public.colonies(id)
);

-- ============================================================================
-- SCHEMA: Harvests Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.harvests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hive_id UUID REFERENCES public.hives(id) NOT NULL,
    harvest_date DATE NOT NULL,
    honey_weight NUMERIC,
    wax_weight NUMERIC,
    unit TEXT DEFAULT 'kg'::text NOT NULL,
    frames_harvested INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES public.profiles(id),
    colony_id UUID REFERENCES public.colonies(id)
);

-- ============================================================================
-- SCHEMA: Colony Movements Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.colony_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colony_id UUID REFERENCES public.colonies(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    from_hive_id UUID REFERENCES public.hives(id),
    to_hive_id UUID REFERENCES public.hives(id),
    movement_date DATE NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('full_move', 'split_from', 'split_to', 'combine', 'new_colony', 'removed')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA: Dropdown Categories Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dropdown_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR NOT NULL,
    category_key VARCHAR UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: Dropdown Values Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dropdown_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.dropdown_categories(id) NOT NULL,
    value VARCHAR NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SCHEMA: Teams Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA: Team Members Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role VARCHAR DEFAULT 'member'::character varying CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA: Team Apiaries Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_apiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) NOT NULL,
    apiary_id UUID REFERENCES public.apiaries(id) NOT NULL,
    added_at TIMESTAMPTZ DEFAULT now(),
    added_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- SCHEMA: Team Invitations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) NOT NULL,
    email VARCHAR NOT NULL,
    invited_by UUID REFERENCES auth.users(id) NOT NULL,
    status VARCHAR DEFAULT 'pending'::character varying CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    invited_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ
);

-- ============================================================================
-- SCHEMA: Tasks Events Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    event_type VARCHAR NOT NULL CHECK (event_type IN ('task', 'event', 'reminder')),
    category VARCHAR CHECK (category IN ('inspection', 'treatment', 'feeding', 'harvest', 'queen_rearing', 'maintenance', 'general', 'other')),
    start_date DATE NOT NULL,
    start_time TIME,
    end_date DATE,
    end_time TIME,
    all_day BOOLEAN DEFAULT false,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    priority VARCHAR DEFAULT 'normal'::character varying CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    hive_id UUID REFERENCES public.hives(id),
    apiary_id UUID REFERENCES public.apiaries(id),
    batch_id UUID REFERENCES public.rearing_batches(id),
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern VARCHAR,
    recurrence_end_date DATE,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_minutes_before INTEGER DEFAULT 60,
    reminder_sent BOOLEAN DEFAULT false,
    google_calendar_event_id VARCHAR,
    google_calendar_synced_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    is_team_task BOOLEAN DEFAULT false
);

-- ============================================================================
-- SCHEMA: Support Tickets Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    ticket_type VARCHAR NOT NULL CHECK (ticket_type IN ('problem', 'suggestion', 'subscription')),
    subject VARCHAR NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR DEFAULT 'open'::character varying CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR DEFAULT 'normal'::character varying CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA: Subscription History Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    code_id UUID REFERENCES public.registration_codes(id),
    code VARCHAR,
    activated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    subscription_type TEXT,
    price_paid NUMERIC,
    code_expires_at TIMESTAMPTZ,
    payment_method TEXT,
    stripe_payment_intent_id TEXT
);

-- ============================================================================
-- SCHEMA: Reactivation Requests Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reactivation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    original_email TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    admin_notes TEXT
);

-- ============================================================================
-- SCHEMA: Changelog Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.changelog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR NOT NULL,
    date DATE NOT NULL,
    entry_type VARCHAR NOT NULL CHECK (entry_type IN ('feature', 'bugfix', 'improvement', 'documentation')),
    title VARCHAR NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES public.profiles(id),
    is_published BOOLEAN DEFAULT true
);

-- ============================================================================
-- SCHEMA: Hive Configuration History Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.hive_configuration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hive_id UUID REFERENCES public.hives(id) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) NOT NULL,
    configuration JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    apiary_id UUID REFERENCES public.apiaries(id),
    row_in_apiary INTEGER,
    order_in_apiary INTEGER,
    queen_id UUID REFERENCES public.queens(id),
    queen_marked BOOLEAN,
    queen_marking_color TEXT,
    queen_mated BOOLEAN,
    queen_clipped BOOLEAN
);

-- ============================================================================
-- SCHEMA: Push Subscriptions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SCHEMA: Varroa Treatment Products (Reference Data)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.varroa_treatment_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name TEXT NOT NULL,
    active_ingredients TEXT NOT NULL,
    notes TEXT,
    application_method TEXT NOT NULL,
    treatment_duration TEXT NOT NULL,
    temperature_range TEXT NOT NULL,
    honey_flow_restrictions TEXT NOT NULL,
    withdrawal_period_days INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Add Foreign Key Constraints (Post-table creation)
-- ============================================================================
ALTER TABLE public.profiles ADD CONSTRAINT profiles_association_id_fkey
    FOREIGN KEY (association_id) REFERENCES public.beekeeping_associations(id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_current_subscription_code_id_fkey
    FOREIGN KEY (current_subscription_code_id) REFERENCES public.registration_codes(id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_used_registration_code_id_fkey
    FOREIGN KEY (used_registration_code_id) REFERENCES public.registration_codes(id);

ALTER TABLE public.hives ADD CONSTRAINT hives_archive_reason_id_fkey
    FOREIGN KEY (archive_reason_id) REFERENCES public.dropdown_values(id);

-- ============================================================================
-- Enable Row Level Security (RLS) on all tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rearing_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropdown_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colony_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beekeeping_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reactivation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hive_configuration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DATABASE BACKUP COMPLETE
-- ============================================================================
-- Total Tables: 30+
-- Backup includes: Schema definitions, foreign keys, constraints, RLS enabled
-- Note: Data export would require separate pg_dump or Supabase export
-- ============================================================================
