create table public.apiaries (
  id uuid not null default extensions.uuid_generate_v4 (),
  name text not null,
  location text null,
  notes text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  city text null,
  eircode character varying(8) null,
  user_id uuid null,
  constraint apiaries_pkey primary key (id),
  constraint apiaries_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint apiaries_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_apiaries_user_id on public.apiaries using btree (user_id) TABLESPACE pg_default;

create table public.dropdown_categories (
  id uuid not null default gen_random_uuid (),
  category_name character varying(100) not null,
  category_key character varying(100) not null,
  description text null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint dropdown_categories_pkey primary key (id),
  constraint dropdown_categories_category_key_key unique (category_key)
) TABLESPACE pg_default;

create index IF not exists idx_dropdown_categories_category_key on public.dropdown_categories using btree (category_key) TABLESPACE pg_default;

create trigger update_dropdown_categories_updated_at BEFORE
update on dropdown_categories for EACH row
execute FUNCTION update_updated_at_column ();


create table public.dropdown_values (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  value character varying(100) not null,
  display_order integer not null default 0,
  is_active boolean null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint dropdown_values_pkey primary key (id),
  constraint unique_category_value unique (category_id, value),
  constraint dropdown_values_category_id_fkey foreign KEY (category_id) references dropdown_categories (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_dropdown_values_category_id on public.dropdown_values using btree (category_id) TABLESPACE pg_default;

create index IF not exists idx_dropdown_values_display_order on public.dropdown_values using btree (display_order) TABLESPACE pg_default;

create index IF not exists idx_dropdown_values_is_active on public.dropdown_values using btree (is_active) TABLESPACE pg_default;

create trigger update_dropdown_values_updated_at BEFORE
update on dropdown_values for EACH row
execute FUNCTION update_updated_at_column ();

create table public.feedings (
  id uuid not null default extensions.uuid_generate_v4 (),
  hive_id uuid not null,
  feed_date date not null,
  feed_type text not null,
  quantity numeric(10, 2) null,
  unit text not null default 'kg'::text,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null,
  constraint feedings_pkey primary key (id),
  constraint feedings_hive_id_fkey foreign KEY (hive_id) references hives (id) on delete CASCADE,
  constraint feedings_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_feedings_hive_id on public.feedings using btree (hive_id) TABLESPACE pg_default;

create index IF not exists idx_feedings_feed_date on public.feedings using btree (feed_date desc) TABLESPACE pg_default;

create index IF not exists idx_feedings_user_id on public.feedings using btree (user_id) TABLESPACE pg_default;

create trigger feedings_updated_at BEFORE
update on feedings for EACH row
execute FUNCTION update_feedings_updated_at ();

create table public.harvests (
  id uuid not null default extensions.uuid_generate_v4 (),
  hive_id uuid not null,
  harvest_date date not null,
  honey_weight numeric(10, 2) null,
  wax_weight numeric(10, 2) null,
  unit text not null default 'kg'::text,
  frames_harvested integer null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null,
  constraint harvests_pkey primary key (id),
  constraint harvests_hive_id_fkey foreign KEY (hive_id) references hives (id) on delete CASCADE,
  constraint harvests_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_harvests_hive_id on public.harvests using btree (hive_id) TABLESPACE pg_default;

create index IF not exists idx_harvests_harvest_date on public.harvests using btree (harvest_date desc) TABLESPACE pg_default;

create index IF not exists idx_harvests_user_id on public.harvests using btree (user_id) TABLESPACE pg_default;

create trigger harvests_updated_at BEFORE
update on harvests for EACH row
execute FUNCTION update_harvests_updated_at ();

create table public.hives (
  id uuid not null default extensions.uuid_generate_v4 (),
  apiary_id uuid null,
  hive_number text not null,
  queen_id uuid null,
  status text null default 'active'::text,
  notes text null,
  created_at timestamp with time zone null default now(),
  user_id uuid null,
  queen_marked boolean null default false,
  queen_marking_color text null,
  queen_mated boolean null default false,
  queen_clipped boolean null default false,
  colony_established_date date null,
  queen_installed_date date null,
  hive_type character varying(50) null,
  configuration jsonb null,
  constraint hives_pkey primary key (id),
  constraint hives_apiary_id_fkey foreign KEY (apiary_id) references apiaries (id) on delete set null,
  constraint hives_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_hives_user_id on public.hives using btree (user_id) TABLESPACE pg_default;

create table public.inspections (
  id uuid not null default extensions.uuid_generate_v4 (),
  hive_id uuid null,
  inspection_date date not null,
  queen_seen boolean null,
  eggs_present boolean null,
  brood_pattern_rating integer null,
  temperament_rating integer null,
  population_strength integer null,
  honey_stores text null,
  disease_issues text null,
  notes text null,
  inspected_by uuid null,
  created_at timestamp with time zone null default now(),
  brood_frames integer null,
  image_url text null,
  weather_temp integer null,
  weather_condition character varying(50) null,
  weather_humidity integer null,
  weather_wind_speed integer null,
  inspection_time time without time zone null,
  user_id uuid null,
  right_sized_frames integer null,
  constraint inspections_pkey primary key (id),
  constraint inspections_hive_id_fkey foreign KEY (hive_id) references hives (id) on delete CASCADE,
  constraint inspections_inspected_by_fkey foreign KEY (inspected_by) references profiles (id),
  constraint inspections_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_inspections_user_id on public.inspections using btree (user_id) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  email text not null,
  full_name text null,
  role text null default 'member'::text,
  created_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;

create table public.queens (
  id uuid not null default extensions.uuid_generate_v4 (),
  queen_number text not null,
  mother_id uuid null,
  father_id uuid null,
  birth_date date null,
  marking_color text null,
  source text null,
  subspecies text null,
  status text null default 'active'::text,
  performance_notes text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  lineage text null,
  queen_clipped boolean null default false,
  user_id uuid null,
  mated_at_eircode character varying(10) null,
  constraint queens_pkey primary key (id),
  constraint queens_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint queens_father_id_fkey foreign KEY (father_id) references queens (id),
  constraint queens_mother_id_fkey foreign KEY (mother_id) references queens (id),
  constraint queens_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_queens_user_id on public.queens using btree (user_id) TABLESPACE pg_default;

create table public.rearing_batches (
  id uuid not null default extensions.uuid_generate_v4 (),
  batch_name text not null,
  mother_queen_id uuid null,
  graft_date date not null,
  cell_count integer null,
  emergence_date date null,
  status text null default 'grafted'::text,
  notes text null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  user_id uuid null,
  constraint rearing_batches_pkey primary key (id),
  constraint rearing_batches_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint rearing_batches_mother_queen_id_fkey foreign KEY (mother_queen_id) references queens (id),
  constraint rearing_batches_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_rearing_batches_user_id on public.rearing_batches using btree (user_id) TABLESPACE pg_default;

create table public.support_tickets (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  ticket_type character varying(20) not null,
  subject character varying(255) not null,
  description text not null,
  status character varying(20) not null default 'open'::character varying,
  priority character varying(20) null default 'normal'::character varying,
  admin_notes text null,
  resolved_by uuid null,
  resolved_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint support_tickets_pkey primary key (id),
  constraint support_tickets_resolved_by_fkey foreign KEY (resolved_by) references auth.users (id) on delete set null,
  constraint support_tickets_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint support_tickets_priority_check check (
    (
      (priority)::text = any (
        (
          array[
            'low'::character varying,
            'normal'::character varying,
            'high'::character varying,
            'urgent'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint support_tickets_status_check check (
    (
      (status)::text = any (
        (
          array[
            'open'::character varying,
            'in_progress'::character varying,
            'resolved'::character varying,
            'closed'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint support_tickets_ticket_type_check check (
    (
      (ticket_type)::text = any (
        (
          array[
            'problem'::character varying,
            'suggestion'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_support_tickets_user_id on public.support_tickets using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_support_tickets_status on public.support_tickets using btree (status) TABLESPACE pg_default;

create index IF not exists idx_support_tickets_created_at on public.support_tickets using btree (created_at desc) TABLESPACE pg_default;

create trigger update_support_tickets_updated_at BEFORE
update on support_tickets for EACH row
execute FUNCTION update_support_ticket_updated_at ();

create table public.user_profiles (
  id uuid not null,
  role character varying(50) not null default 'User'::character varying,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  first_name character varying(255) null,
  last_name character varying(255) null,
  mobile_number character varying(50) null,
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint valid_role check (
    (
      (role)::text = any (
        (
          array[
            'User'::character varying,
            'Admin'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_role on public.user_profiles using btree (role) TABLESPACE pg_default;

create table public.varroa_checks (
  id uuid not null default gen_random_uuid (),
  hive_id uuid not null,
  check_date date not null,
  method character varying(100) not null,
  mites_count integer null,
  sample_size integer null,
  infestation_rate numeric(5, 2) null,
  action_threshold_reached boolean null default false,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null,
  constraint varroa_checks_pkey primary key (id),
  constraint varroa_checks_hive_id_fkey foreign KEY (hive_id) references hives (id) on delete CASCADE,
  constraint varroa_checks_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_varroa_checks_hive_id on public.varroa_checks using btree (hive_id) TABLESPACE pg_default;

create index IF not exists idx_varroa_checks_date on public.varroa_checks using btree (check_date desc) TABLESPACE pg_default;

create index IF not exists idx_varroa_checks_user_id on public.varroa_checks using btree (user_id) TABLESPACE pg_default;

create trigger update_varroa_checks_updated_at BEFORE
update on varroa_checks for EACH row
execute FUNCTION update_updated_at_column ();

create table public.varroa_treatments (
  id uuid not null default gen_random_uuid (),
  hive_id uuid not null,
  treatment_date date not null,
  treatment_type character varying(100) not null,
  product_name character varying(255) null,
  dosage character varying(100) null,
  temperature numeric(5, 2) null,
  weather_conditions character varying(255) null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  user_id uuid null,
  constraint varroa_treatments_pkey primary key (id),
  constraint varroa_treatments_hive_id_fkey foreign KEY (hive_id) references hives (id) on delete CASCADE,
  constraint varroa_treatments_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_varroa_treatments_hive_id on public.varroa_treatments using btree (hive_id) TABLESPACE pg_default;

create index IF not exists idx_varroa_treatments_date on public.varroa_treatments using btree (treatment_date desc) TABLESPACE pg_default;

create index IF not exists idx_varroa_treatments_user_id on public.varroa_treatments using btree (user_id) TABLESPACE pg_default;

create trigger update_varroa_treatments_updated_at BEFORE
update on varroa_treatments for EACH row
execute FUNCTION update_updated_at_column ();

