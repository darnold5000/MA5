import { createDefaultEmailProvider } from "./providers";
import { createEmailService } from "./email-service";
import { loadTenantEmailSettings } from "./tenant-email-settings";
import type { EmailService } from "./email-service";

/**
 * Factory for tenant-scoped EmailService (Resend by default).
 * Returns null when provider or from-address is not configured.
 */
export function createEmailServiceForTenant(
  tenantId: string,
): EmailService | null {
  const settings = loadTenantEmailSettings(tenantId);
  if (!settings.fromEmail) return null;

  const provider = createDefaultEmailProvider();
  if (!provider) return null;

  return createEmailService(provider);
}

export { loadTenantEmailSettings };
