-- Enums for relationship invitations
create type public.relationship_type as enum ('father', 'mother', 'guardian');
create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'cancelled');

-- Invitations: staff invites a parent/tutor to link with a child
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id),
  invited_by uuid not null references public.users (id),
  full_name text not null,
  email text not null,
  relationship public.relationship_type not null,
  code text not null unique,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.invitations is
  'Invitaciones de vinculacion padre/nino creadas por staff; codigo de 5 chars sin ambiguos, vence en 7 dias.';

create index invitations_code_unique on public.invitations (upper(code));
create index invitations_child_id_idx on public.invitations (child_id);
create unique index invitations_child_email_active_unique
  on public.invitations (child_id, lower(email))
  where status in ('pending', 'accepted');

alter table public.invitations enable row level security;

-- parent_children: accepted parent <-> child links
create table public.parent_children (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.users (id),
  child_id uuid not null references public.children (id),
  relationship public.relationship_type not null,
  created_at timestamptz not null default now(),
  unique (parent_id, child_id)
);

comment on table public.parent_children is
  'Vinculos aceptados padre/nino; relationship se copia desde la invitacion al aceptar.';

create index parent_children_parent_id_idx on public.parent_children (parent_id);
create index parent_children_child_id_idx on public.parent_children (child_id);

alter table public.parent_children enable row level security;
