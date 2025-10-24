-- Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_type VARCHAR(20) NOT NULL CHECK (ticket_type IN ('problem', 'suggestion')),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tickets
CREATE POLICY "Users can insert their own tickets"
  ON support_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets (but not status or admin fields)
CREATE POLICY "Users can update their own tickets"
  ON support_tickets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    -- Prevent users from modifying admin fields
    status = (SELECT status FROM support_tickets WHERE id = support_tickets.id) AND
    priority = (SELECT priority FROM support_tickets WHERE id = support_tickets.id) AND
    admin_notes IS NOT DISTINCT FROM (SELECT admin_notes FROM support_tickets WHERE id = support_tickets.id) AND
    resolved_by IS NOT DISTINCT FROM (SELECT resolved_by FROM support_tickets WHERE id = support_tickets.id) AND
    resolved_at IS NOT DISTINCT FROM (SELECT resolved_at FROM support_tickets WHERE id = support_tickets.id)
  );

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'Admin'
    )
  );

-- Admins can update all tickets
CREATE POLICY "Admins can update all tickets"
  ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'Admin'
    )
  );

-- Admins can delete tickets
CREATE POLICY "Admins can delete tickets"
  ON support_tickets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'Admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_updated_at();

-- Add comments
COMMENT ON TABLE support_tickets IS 'User support tickets for problems and suggestions';
COMMENT ON COLUMN support_tickets.ticket_type IS 'Type of ticket: problem or suggestion';
COMMENT ON COLUMN support_tickets.status IS 'Current status: open, in_progress, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Priority level set by admin: low, normal, high, urgent';
COMMENT ON COLUMN support_tickets.admin_notes IS 'Internal notes from admin (not visible to user)';
COMMENT ON COLUMN support_tickets.resolved_by IS 'Admin user who resolved the ticket';
