import { siteConfig } from "@/content/site-config";

import type { TenantEmailSettings } from "./types";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

function parseFromAddress(raw: string): { fromName: string; fromEmail: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { fromName: match[1].trim(), fromEmail: match[2].trim() };
  }
  return { fromName: siteConfig.name, fromEmail: raw };
}

/**
 * Phase 1–2: resolve tenant email settings from deployment env.
 * Phase 3: replace body with `tenant_email_settings` row (keep this signature).
 */
export function loadTenantEmailSettings(tenantId: string): TenantEmailSettings {
  const fromRaw =
    readEnv("AUTH_EMAIL_FROM") ??
    readEnv("TENANT_EMAIL_FROM") ??
    readEnv("RESEND_FROM_EMAIL");

  const { fromName, fromEmail } = fromRaw
    ? parseFromAddress(fromRaw)
    : { fromName: siteConfig.name, fromEmail: "" };

  const explicitFromName = readEnv("TENANT_EMAIL_FROM_NAME");
  const brandName = readEnv("TENANT_BRAND_NAME") ?? siteConfig.name;

  return {
    tenantId,
    brandName,
    fromName: explicitFromName ?? fromName,
    fromEmail,
    replyTo:
      readEnv("TENANT_EMAIL_REPLY_TO") ??
      readEnv("AUTH_EMAIL_REPLY_TO") ??
      siteConfig.contact.email ??
      null,
    supportEmail: readEnv("TENANT_SUPPORT_EMAIL") ?? siteConfig.contact.email,
    supportPhone:
      readEnv("TENANT_SUPPORT_PHONE") || siteConfig.contact.phone || null,
    logoUrl: readEnv("TENANT_EMAIL_LOGO_URL") ?? null,
    primaryColor: readEnv("TENANT_EMAIL_PRIMARY_COLOR") ?? null,
    secondaryColor: readEnv("TENANT_EMAIL_SECONDARY_COLOR") ?? null,
    buttonColor: readEnv("TENANT_EMAIL_BUTTON_COLOR") ?? null,
    footerText: readEnv("TENANT_EMAIL_FOOTER_TEXT") ?? null,
    privacyUrl: readEnv("TENANT_PRIVACY_URL") ?? null,
    termsUrl: readEnv("TENANT_TERMS_URL") ?? null,
  };
}

export function formatFromAddress(settings: TenantEmailSettings): string {
  if (!settings.fromEmail) {
    throw new Error(
      "Tenant email is not configured (from_email). Set AUTH_EMAIL_FROM or TENANT_EMAIL_FROM.",
    );
  }
  return `${settings.fromName} <${settings.fromEmail}>`;
}

export function isTenantEmailDeliveryConfigured(
  settings: TenantEmailSettings,
): boolean {
  return Boolean(settings.fromEmail && process.env.RESEND_API_KEY?.trim());
}
