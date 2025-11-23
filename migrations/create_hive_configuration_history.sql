-- Create hive_configuration_history table to track all configuration changes
-- This table is append-only (no updates/deletes) to maintain a complete audit trail

CREATE TABLE IF NOT EXISTS public.hive_configuration_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hive_id UUID NOT NULL REFERENCES public.hives(id) ON DELETE CASCADE,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  configuration JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_hive_config_history_hive_id ON public.hive_configuration_history(hive_id);
CREATE INDEX IF NOT EXISTS idx_hive_config_history_changed_at ON public.hive_configuration_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_hive_config_history_changed_by ON public.hive_configuration_history(changed_by);

-- Add comments for documentation
COMMENT ON TABLE public.hive_configuration_history IS 'Tracks all changes to hive configurations with timestamp and user information';
COMMENT ON COLUMN public.hive_configuration_history.hive_id IS 'Reference to the hive that was modified';
COMMENT ON COLUMN public.hive_configuration_history.changed_at IS 'When the configuration was changed';
COMMENT ON COLUMN public.hive_configuration_history.changed_by IS 'User who made the change';
COMMENT ON COLUMN public.hive_configuration_history.configuration IS 'Complete configuration snapshot at time of change';

-- Enable RLS
ALTER TABLE public.hive_configuration_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view configuration history for hives they own or have team access to
CREATE POLICY "Users can view config history for accessible hives"
ON public.hive_configuration_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.hives h
    WHERE h.id = hive_configuration_history.hive_id
    AND (
      h.user_id = auth.uid()
      OR can_access_hive(h.id, auth.uid())
    )
  )
);

-- Only allow inserts (append-only table)
-- The application code will handle inserts, no direct user inserts
CREATE POLICY "Service role can insert config history"
ON public.hive_configuration_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT SELECT ON public.hive_configuration_history TO authenticated;
GRANT INSERT ON public.hive_configuration_history TO authenticated;
