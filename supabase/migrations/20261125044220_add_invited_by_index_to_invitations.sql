-- Covering index for invitations.invited_by (advisor: unindexed_foreign_keys).
create index invitations_invited_by_idx on public.invitations (invited_by);
