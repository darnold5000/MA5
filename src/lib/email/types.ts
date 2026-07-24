/**
 * Tenant email branding and delivery identity.
 * Phase 3: loaded from `tenant_email_settings` table.
 * Phase 1–2: env + site config adapter in `tenant-email-settings.ts`.
 */
export type TenantEmailSettings = {
  tenantId: string;
  brandName: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  buttonColor: string | null;
  footerText: string | null;
  privacyUrl: string | null;
  termsUrl: string | null;
};

export type AuthLinkType =
  | "invite"
  | "recovery"
  | "magiclink"
  | "signup"
  | "email_change_current"
  | "email_change_new";

export type AuthLinkResult = {
  type: AuthLinkType;
  email: string;
  actionLink: string;
  userId: string | null;
  redirectTo: string;
};

export type SendEmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  tags?: { name: string; value: string }[];
};

export type SendEmailResult = {
  ok: true;
  provider: string;
  messageId: string | null;
};

export type SendEmailError = {
  ok: false;
  provider: string;
  message: string;
  statusCode?: number;
};

export type EmailDeliveryResult = SendEmailResult | SendEmailError;

export type TenantEmailContext = {
  settings: TenantEmailSettings;
};

export type SendInviteEmailInput = TenantEmailContext & {
  to: string;
  fullName: string;
  actionLink: string;
};

export type SendPasswordResetEmailInput = TenantEmailContext & {
  to: string;
  fullName: string;
  actionLink: string;
};

export type SendMagicLinkEmailInput = TenantEmailContext & {
  to: string;
  fullName: string;
  actionLink: string;
};

export type SendCoachInviteEmailInput = TenantEmailContext & {
  to: string;
  fullName: string;
  actionLink: string;
};

export type SendWelcomeEmailInput = TenantEmailContext & {
  to: string;
  fullName: string;
  actionLink?: string | null;
};

export type SendWelcomeBackEmailInput = TenantEmailContext & {
  to: string;
  fullName: string;
  actionLink: string;
};

/** Future: NotificationService channel payloads (email slice only for now). */
export type NotificationChannel = "email" | "sms" | "push" | "in_app";

export type NotificationRequest = {
  type: string;
  tenantId: string;
  userId?: string;
  channels?: NotificationChannel[];
};
