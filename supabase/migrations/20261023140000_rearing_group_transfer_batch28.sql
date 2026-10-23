-- Batch 28 (C6-03): rearing group ownership transfer in one transaction.
-- The page made three separate updates (new owner's role, old owner's role, owner_id), so a
-- dropped connection could leave two owners, or swapped roles with the old owner_id.
-- The role updates run while the caller still owns the group, so guard_membership_columns
-- allows them; owner_id changes last.

CREATE OR REPLACE FUNCTION public.transfer_rearing_group_ownership(p_group_id uuid, p_new_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
  END IF;

  -- Only the current owner; the row lock stops two transfers running at once
  PERFORM 1 FROM rearing_groups WHERE id = p_group_id AND owner_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only the group owner can transfer ownership' USING ERRCODE = '42501';
  END IF;

  IF p_new_owner_id IS NULL OR p_new_owner_id = v_uid THEN
    RAISE EXCEPTION 'Choose another member of the group' USING ERRCODE = '22023';
  END IF;

  UPDATE rearing_group_members SET role = 'owner'
  WHERE group_id = p_group_id AND user_id = p_new_owner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The new owner must be a member of the group' USING ERRCODE = '22023';
  END IF;

  UPDATE rearing_group_members SET role = 'member'
  WHERE group_id = p_group_id AND user_id = v_uid;

  UPDATE rearing_groups SET owner_id = p_new_owner_id WHERE id = p_group_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_rearing_group_ownership(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_rearing_group_ownership(uuid, uuid) TO authenticated;
