# MA5 email inventory (auth & transactional)

Companion to [ADR 0007: Tenant-branded auth email via Resend](../../../docs/adr/0007-tenant-auth-email-via-resend.md).

## Current env (Vercel / local)

| Variable | Used for |
|----------|----------|
| `RESEND_API_KEY` | Resend API (platform) |
| `AUTH_EMAIL_FROM` | Member auth emails (`lib/email/`, `auth-email-flows`) |
| `CONTACT_EMAIL_FROM` | Staff lead notify; falls back to `AUTH_EMAIL_FROM` |

`isAuthEmailDeliveryConfigured()` = both `RESEND_API_KEY` and `AUTH_EMAIL_FROM` set (required for invite / forgot-password / coach invite).

## Auth email call sites (Phase 2)

| Flow | File | Sends via |
|------|------|-----------|
| New / resend client invite | `api/admin/members/invite/route.ts` | `auth-email-flows` → AuthLink + EmailService → Resend |
| Re-enroll deleted member | same | `deliverFormerMemberWelcomeBackEmail` |
| Active member resend | same | `deliverActiveMemberSignInEmail` |
| Coach invite | `api/admin/coaches/invite/route.ts` | `deliverCoachInviteEmail` |
| Forgot password | `api/auth/forgot-password/route.ts` | `deliverPasswordResetRequestEmail` (generic `{ ok: true }` to client) |

No Supabase SMTP / `inviteUserByEmail` / `resetPasswordForEmail` on these paths.

## Not auth (same transport)

| Flow | File |
|------|------|
| Lead / staff notify | `lib/email/notify-staff.ts` |

## Already aligned with target architecture

- `generateLink()` for invite/recovery when Resend configured
- No Supabase template dependency for those paths
- Client `/auth/callback` for session exchange
- Invite lifecycle + `invite_generation` unchanged by email ADR

## Gaps vs target (ADR 0007)

1. **No `email_settings` table**—branding from env until Phase 3 (`041`).
2. **No React Email**—inline HTML in `lib/email/templates/` / `notify-staff.ts`.
3. **No shared EmailService** with signalworks-clients (duplicate patterns).

## Implementation status

**Phase 2 (done):** Routes use `auth-email-flows.ts` only. `activation-email.ts` is deprecated.

**Phase 3:** Apply `041_tenant_email_settings.sql`; load settings from DB in `loadTenantEmailSettings`.
