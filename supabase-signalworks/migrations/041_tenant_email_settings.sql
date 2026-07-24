-- MA5 → Signal Works migration 041 (Phase 3 — platform email branding)
-- Per-tenant outbound email identity for application-owned Resend delivery.
--
-- Prerequisite: platform `tenants` row exists for each tenant_id.
-- Apply when enabling admin Email Settings UI (ADR 0007 Phase 3).
--
-- Verify:
--   select tenant_id, brand_name, from_email from public.tenant_email_settings;

begin;

create table if not exists public.tenant_email_settings (
  tenant_id uuid primary key,
  brand_name text not null,
  from_name text not null,
  from_email text not null,
  reply_to text,
  support_email text,
  support_phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  button_color text,
  footer_text text,
  privacy_url text,
  terms_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tenant_email_settings is
  'Tenant-branded email identity for AuthLinkService + EmailService (Resend).';

alter table public.tenant_email_settings enable row level security;

drop policy if exists tenant_email_settings_select on public.tenant_email_settings;
create policy tenant_email_settings_select
on public.tenant_email_settings
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or tenant_id = (auth.jwt() -> 'app_metadata' ->> 'ma5_tenant_id')::uuid
);

drop policy if exists tenant_email_settings_update on public.tenant_email_settings;
create policy tenant_email_settings_update
on public.tenant_email_settings
for update
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

revoke all on public.tenant_email_settings from public;
grant select, update on public.tenant_email_settings to authenticated;
grant all on public.tenant_email_settings to service_role;

commit;
