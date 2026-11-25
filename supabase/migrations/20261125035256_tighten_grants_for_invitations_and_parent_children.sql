-- Supabase default privileges grant ALL on new public tables to authenticated.
-- Revoke everything and re-grant only the minimum per the data model.

revoke all privileges on public.invitations from authenticated;
revoke all privileges on public.parent_children from authenticated;

grant select on public.invitations to authenticated;
grant insert (child_id, invited_by, full_name, email, relationship, code, expires_at)
  on public.invitations to authenticated;
grant update (status, accepted_at) on public.invitations to authenticated;

grant select on public.parent_children to authenticated;
grant insert (parent_id, child_id, relationship) on public.parent_children to authenticated;
