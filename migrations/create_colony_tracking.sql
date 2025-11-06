-- =====================================================
-- Colony Tracking System
-- Created: November 6, 2025
-- =====================================================
-- This migration adds colony tracking to separate biological
-- colonies from physical hive equipment, enabling proper
-- tracking of colony history across hive moves.

-- =====================================================
-- PART 1: Create colonies table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.colonies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,

  -- Origin information
  origin_type TEXT NOT NULL CHECK (origin_type IN ('purchased', 'split', 'swarm', 'caught_swarm', 'nuc', 'package', 'combine', 'other')),
  origin_date DATE NOT NULL,
  parent_colony_id UUID REFERENCES public.colonies(id),
  secondary_parent_colony_id UUID REFERENCES public.colonies(id), -- For combines (two parents)

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deceased', 'swarmed', 'combined', 'sold', 'given_away')),
  status_date DATE, -- Date when status changed
  status_reason TEXT, -- Reason for status change

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT colonies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS colonies_user_id_idx ON public.colonies(user_id);
CREATE INDEX IF NOT EXISTS colonies_status_idx ON public.colonies(status);
CREATE INDEX IF NOT EXISTS colonies_parent_colony_id_idx ON public.colonies(parent_colony_id);

-- Enable RLS
ALTER TABLE public.colonies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own colonies"
  ON public.colonies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own colonies"
  ON public.colonies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own colonies"
  ON public.colonies FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own colonies"
  ON public.colonies FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PART 2: Add colony_id to hives table
-- =====================================================

-- Add column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hives' AND column_name = 'colony_id'
  ) THEN
    ALTER TABLE public.hives ADD COLUMN colony_id UUID REFERENCES public.colonies(id);
    CREATE INDEX IF NOT EXISTS hives_colony_id_idx ON public.hives(colony_id);
  END IF;
END $$;

-- =====================================================
-- PART 3: Add colony_id to record tables
-- =====================================================

-- Inspections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspections' AND column_name = 'colony_id'
  ) THEN
    ALTER TABLE public.inspections ADD COLUMN colony_id UUID REFERENCES public.colonies(id);
    CREATE INDEX IF NOT EXISTS inspections_colony_id_idx ON public.inspections(colony_id);
  END IF;
END $$;

-- Varroa Checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'varroa_checks' AND column_name = 'colony_id'
  ) THEN
    ALTER TABLE public.varroa_checks ADD COLUMN colony_id UUID REFERENCES public.colonies(id);
    CREATE INDEX IF NOT EXISTS varroa_checks_colony_id_idx ON public.varroa_checks(colony_id);
  END IF;
END $$;

-- Varroa Treatments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'varroa_treatments' AND column_name = 'colony_id'
  ) THEN
    ALTER TABLE public.varroa_treatments ADD COLUMN colony_id UUID REFERENCES public.colonies(id);
    CREATE INDEX IF NOT EXISTS varroa_treatments_colony_id_idx ON public.varroa_treatments(colony_id);
  END IF;
END $$;

-- Feedings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feedings' AND column_name = 'colony_id'
  ) THEN
    ALTER TABLE public.feedings ADD COLUMN colony_id UUID REFERENCES public.colonies(id);
    CREATE INDEX IF NOT EXISTS feedings_colony_id_idx ON public.feedings(colony_id);
  END IF;
END $$;

-- Harvests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'harvests' AND column_name = 'colony_id'
  ) THEN
    ALTER TABLE public.harvests ADD COLUMN colony_id UUID REFERENCES public.colonies(id);
    CREATE INDEX IF NOT EXISTS harvests_colony_id_idx ON public.harvests(colony_id);
  END IF;
END $$;

-- =====================================================
-- PART 4: Create colony movements tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.colony_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colony_id UUID NOT NULL REFERENCES public.colonies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,

  -- Movement details
  from_hive_id UUID REFERENCES public.hives(id),
  to_hive_id UUID REFERENCES public.hives(id),
  movement_date DATE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('full_move', 'split_from', 'split_to', 'combine', 'new_colony', 'removed')),

  -- Context
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT colony_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS colony_movements_colony_id_idx ON public.colony_movements(colony_id);
CREATE INDEX IF NOT EXISTS colony_movements_user_id_idx ON public.colony_movements(user_id);
CREATE INDEX IF NOT EXISTS colony_movements_from_hive_id_idx ON public.colony_movements(from_hive_id);
CREATE INDEX IF NOT EXISTS colony_movements_to_hive_id_idx ON public.colony_movements(to_hive_id);

-- Enable RLS
ALTER TABLE public.colony_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own colony movements"
  ON public.colony_movements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own colony movements"
  ON public.colony_movements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own colony movements"
  ON public.colony_movements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own colony movements"
  ON public.colony_movements FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PART 5: Create helper functions
-- =====================================================

-- Function to automatically log colony movements when hive's colony_id changes
CREATE OR REPLACE FUNCTION log_colony_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if colony_id actually changed
  IF (TG_OP = 'UPDATE' AND OLD.colony_id IS DISTINCT FROM NEW.colony_id) THEN
    -- Log movement FROM old hive (if there was a colony)
    IF OLD.colony_id IS NOT NULL THEN
      INSERT INTO colony_movements (
        colony_id,
        user_id,
        from_hive_id,
        to_hive_id,
        movement_date,
        movement_type,
        notes
      ) VALUES (
        OLD.colony_id,
        NEW.user_id,
        OLD.id,
        NULL,
        CURRENT_DATE,
        'removed',
        'Colony removed from hive'
      );
    END IF;

    -- Log movement TO new hive (if there's a new colony)
    IF NEW.colony_id IS NOT NULL THEN
      INSERT INTO colony_movements (
        colony_id,
        user_id,
        from_hive_id,
        to_hive_id,
        movement_date,
        movement_type,
        notes
      ) VALUES (
        NEW.colony_id,
        NEW.user_id,
        NULL,
        NEW.id,
        CURRENT_DATE,
        'full_move',
        'Colony moved to hive'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on hives table
DROP TRIGGER IF EXISTS hive_colony_movement_trigger ON public.hives;
CREATE TRIGGER hive_colony_movement_trigger
  AFTER UPDATE ON public.hives
  FOR EACH ROW
  EXECUTE FUNCTION log_colony_movement();

-- Function to automatically update colony_id on records when hive's colony changes
CREATE OR REPLACE FUNCTION sync_record_colony_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if colony_id changed
  IF (TG_OP = 'UPDATE' AND OLD.colony_id IS DISTINCT FROM NEW.colony_id AND NEW.colony_id IS NOT NULL) THEN
    -- Update inspections
    UPDATE inspections
    SET colony_id = NEW.colony_id
    WHERE hive_id = NEW.id AND colony_id IS NULL;

    -- Update varroa_checks
    UPDATE varroa_checks
    SET colony_id = NEW.colony_id
    WHERE hive_id = NEW.id AND colony_id IS NULL;

    -- Update varroa_treatments
    UPDATE varroa_treatments
    SET colony_id = NEW.colony_id
    WHERE hive_id = NEW.id AND colony_id IS NULL;

    -- Update feedings
    UPDATE feedings
    SET colony_id = NEW.colony_id
    WHERE hive_id = NEW.id AND colony_id IS NULL;

    -- Update harvests
    UPDATE harvests
    SET colony_id = NEW.colony_id
    WHERE hive_id = NEW.id AND colony_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync record colony_id
DROP TRIGGER IF EXISTS sync_hive_record_colony_trigger ON public.hives;
CREATE TRIGGER sync_hive_record_colony_trigger
  AFTER UPDATE ON public.hives
  FOR EACH ROW
  EXECUTE FUNCTION sync_record_colony_id();

-- Add comments
COMMENT ON TABLE public.colonies IS 'Tracks biological colonies separately from physical hive equipment';
COMMENT ON TABLE public.colony_movements IS 'Tracks colony movements between hives over time';
COMMENT ON FUNCTION log_colony_movement IS 'Automatically logs colony movements when a hive''s colony_id changes';
COMMENT ON FUNCTION sync_record_colony_id IS 'Automatically updates colony_id on records when hive''s colony changes';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✓ Colony tracking system created successfully';
  RAISE NOTICE '→ Next step: Run migrate_existing_colonies.sql to backfill data';
END $$;
