-- Create Teams Feature Tables
-- This migration adds support for team collaboration on apiaries and hives

-- 1. Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT teams_name_owner_unique UNIQUE (name, owner_id)
);

COMMENT ON TABLE public.teams IS 'Teams for collaborative beekeeping management';
COMMENT ON COLUMN public.teams.owner_id IS 'User who created and owns the team';

-- 2. Team members junction table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT team_members_unique UNIQUE (team_id, user_id)
);

COMMENT ON TABLE public.team_members IS 'Junction table for team membership';
COMMENT ON COLUMN public.team_members.role IS 'Member role: owner, admin, or member';

-- 3. Team apiaries - link apiaries to teams
CREATE TABLE IF NOT EXISTS public.team_apiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  apiary_id UUID NOT NULL REFERENCES public.apiaries(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT team_apiaries_unique UNIQUE (team_id, apiary_id)
);

COMMENT ON TABLE public.team_apiaries IS 'Links apiaries to teams for shared management';

-- 4. Team invitations
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT team_invitations_unique UNIQUE (team_id, email, status)
);

COMMENT ON TABLE public.team_invitations IS 'Track team invitations sent to users';
COMMENT ON COLUMN public.team_invitations.expires_at IS 'Invitation expires after 7 days';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_teams_owner ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_apiaries_team ON public.team_apiaries(team_id);
CREATE INDEX IF NOT EXISTS idx_team_apiaries_apiary ON public.team_apiaries(apiary_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

-- Enable Row Level Security
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams table
-- Users can view teams they own or are members of
CREATE POLICY "Users can view their teams"
  ON public.teams FOR SELECT
  USING (
    owner_id = auth.uid() OR
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
  );

-- Only team owners can create teams
CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- Only team owners can update their teams
CREATE POLICY "Team owners can update teams"
  ON public.teams FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Only team owners can delete their teams
CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE
  USING (owner_id = auth.uid());

-- RLS Policies for team_members table
-- Users can view members of teams they belong to
CREATE POLICY "Users can view team members"
  ON public.team_members FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Team owners and admins can add members
CREATE POLICY "Team owners and admins can add members"
  ON public.team_members FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owners and admins can update member roles
CREATE POLICY "Team owners and admins can update members"
  ON public.team_members FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owners, admins, and members themselves can remove members
CREATE POLICY "Team owners, admins, and self can remove members"
  ON public.team_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for team_apiaries table
-- Users can view apiaries linked to their teams
CREATE POLICY "Users can view team apiaries"
  ON public.team_apiaries FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Team owners and admins can add apiaries to teams
CREATE POLICY "Team owners and admins can add apiaries"
  ON public.team_apiaries FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owners and admins can remove apiaries from teams
CREATE POLICY "Team owners and admins can remove apiaries"
  ON public.team_apiaries FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for team_invitations table
-- Users can view invitations for their teams
CREATE POLICY "Users can view team invitations"
  ON public.team_invitations FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owners and admins can create invitations
CREATE POLICY "Team owners and admins can create invitations"
  ON public.team_invitations FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owners and admins can update invitations
CREATE POLICY "Team owners and admins can update invitations"
  ON public.team_invitations FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Team owners and admins can delete invitations
CREATE POLICY "Team owners and admins can delete invitations"
  ON public.team_invitations FOR DELETE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE owner_id = auth.uid()
      UNION
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Function to automatically add team owner as a member with 'owner' role
CREATE OR REPLACE FUNCTION public.add_team_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to add owner as member when team is created
DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.add_team_owner_as_member();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_teams_updated_at();
