-- Super Admin Tables
-- BAA Documents and Audit Logs

-- Add super admin fields to tenants table if not exists
alter table public.tenants add column if not exists subdomain text unique;
alter table public.tenants add column if not exists ein text;
alter table public.tenants add column if not exists contact_email text;
alter table public.tenants add column if not exists contact_phone text;
alter table public.tenants add column if not exists status text default 'active';
alter table public.tenants add column if not exists environment text default 'production';
alter table public.tenants add column if not exists billing_plan text default 'starter';
alter table public.tenants add column if not exists seats_total integer default 10;
alter table public.tenants add column if not exists seats_used integer default 0;
alter table public.tenants add column if not exists baa_status text default 'not_signed';
alter table public.tenants add column if not exists baa_signed_date timestamp with time zone;
alter table public.tenants add column if not exists baa_signed_by text;
alter table public.tenants add column if not exists baa_expires_at timestamp with time zone;
alter table public.tenants add column if not exists baa_document_url text;
alter table public.tenants add column if not exists feature_flags text[];
alter table public.tenants add column if not exists region text default 'us-east';
alter table public.tenants add column if not exists logo_url text;
alter table public.tenants add column if not exists last_active_at timestamp with time zone;
alter table public.tenants add column if not exists onboarding_completed boolean default false;
alter table public.tenants add column if not exists onboarding_progress integer default 0;
alter table public.tenants add column if not exists metadata jsonb;

-- Add constraints
alter table public.tenants 
  add constraint tenants_status_check 
  check (status in ('active', 'inactive', 'suspended', 'trial'));

alter table public.tenants 
  add constraint tenants_environment_check 
  check (environment in ('production', 'test', 'trial', 'onboarding'));

alter table public.tenants 
  add constraint tenants_billing_plan_check 
  check (billing_plan in ('enterprise', 'professional', 'starter', 'trial'));

alter table public.tenants 
  add constraint tenants_baa_status_check 
  check (baa_status in ('signed', 'not_signed', 'expiring_soon'));

-- Create BAA documents table
create table if not exists public.baa_documents (
  id text not null default (
    'baa-' || (extract(epoch from now())::bigint)::text || '-' || substr(md5(random()::text), 1, 8)
  ),
  tenant_id text not null,
  document_url text not null,
  signed_by text not null,
  signed_at timestamp with time zone not null,
  expires_at timestamp with time zone not null,
  status text not null default 'active',
  version text not null default '1.0',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint baa_documents_pkey primary key (id),
  constraint baa_documents_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete cascade,
  constraint baa_documents_status_check check (status in ('active', 'expired', 'revoked'))
) tablespace pg_default;

create index if not exists idx_baa_documents_tenant_id on public.baa_documents using btree (tenant_id);
create index if not exists idx_baa_documents_status on public.baa_documents using btree (status);
create index if not exists idx_baa_documents_expires_at on public.baa_documents using btree (expires_at);

-- Create audit logs table
create table if not exists public.audit_logs (
  id text not null default (
    'log-' || (extract(epoch from now())::bigint)::text || '-' || substr(md5(random()::text), 1, 8)
  ),
  actor_id text not null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now(),
  constraint audit_logs_pkey primary key (id),
  constraint audit_logs_actor_id_fkey foreign key (actor_id) references users (id) on delete set null
) tablespace pg_default;

create index if not exists idx_audit_logs_actor_id on public.audit_logs using btree (actor_id);
create index if not exists idx_audit_logs_action on public.audit_logs using btree (action);
create index if not exists idx_audit_logs_entity_type on public.audit_logs using btree (entity_type);
create index if not exists idx_audit_logs_entity_id on public.audit_logs using btree (entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs using btree (created_at desc);

-- Function to check BAA expiration and update status
create or replace function check_baa_expiration()
returns void as $$
begin
  -- Update tenants with expiring BAAs (within 30 days)
  update tenants
  set baa_status = 'expiring_soon'
  where baa_status = 'signed'
    and baa_expires_at is not null
    and baa_expires_at <= (now() + interval '30 days')
    and baa_expires_at > now();
    
  -- Update BAA documents that have expired
  update baa_documents
  set status = 'expired'
  where status = 'active'
    and expires_at < now();
    
  -- Update tenant status for expired BAAs
  update tenants t
  set baa_status = 'not_signed'
  where exists (
    select 1 from baa_documents b
    where b.tenant_id = t.id
      and b.status = 'expired'
      and not exists (
        select 1 from baa_documents b2
        where b2.tenant_id = t.id
          and b2.status = 'active'
      )
  );
end;
$$ language plpgsql;

-- Create storage bucket for BAA documents (run this in Supabase dashboard if needed)
-- insert into storage.buckets (id, name, public) values ('baa-documents', 'baa-documents', false);

-- Add RLS policies for super admins
-- Enable RLS on new tables
alter table public.baa_documents enable row level security;
alter table public.audit_logs enable row level security;

-- Super admins can see everything
create policy "Super admins have full access to BAA documents"
  on public.baa_documents
  for all
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'super_admin'
    )
  );

create policy "Super admins have full access to audit logs"
  on public.audit_logs
  for all
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role = 'super_admin'
    )
  );

-- Agency admins can see their own tenant BAA documents
create policy "Agency admins can view their tenant BAA documents"
  on public.baa_documents
  for select
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.tenant_id = baa_documents.tenant_id
        and users.role = 'agency_admin'
    )
  );

-- Add indexes for tenants table new columns
create index if not exists idx_tenants_subdomain on public.tenants using btree (subdomain);
create index if not exists idx_tenants_status on public.tenants using btree (status);
create index if not exists idx_tenants_baa_status on public.tenants using btree (baa_status);
create index if not exists idx_tenants_baa_expires_at on public.tenants using btree (baa_expires_at);
create index if not exists idx_tenants_environment on public.tenants using btree (environment);
