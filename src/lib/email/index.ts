/**
 * Signal Works email platform (MA5 reference implementation).
 *
 * - {@link AuthLinkService} — Supabase `generateLink` only
 * - {@link EmailService} — templates + provider send (no Supabase)
 * - {@link auth-email-flows} — orchestration for API routes (Phase 2+)
 */
export {
  deliverActiveMemberSignInEmail,
  deliverCoachInviteEmail,
  deliverFormerMemberWelcomeBackEmail,
  deliverMagicLinkEmail,
  deliverMemberActivationResendEmail,
  deliverMemberInviteEmail,
  deliverPasswordResetRequestEmail,
  isAuthEmailDeliveryConfigured,
  passwordResetRedirectUrl,
  requireAuthEmailStack,
  type AuthEmailStack,
} from "./auth-email-flows";
export { createEmailServiceForTenant } from "./create-email-service";
export { AuthLinkService, createAuthLinkService } from "./auth-link-service";
export { EmailService, createEmailService, EmailDeliveryError } from "./email-service";
export type { NotificationService } from "./notification-service";
export { createDefaultEmailProvider, createResendProvider, ResendProvider } from "./providers";
export type { EmailProvider, EmailProviderId } from "./providers";
export {
  formatFromAddress,
  isTenantEmailDeliveryConfigured,
  loadTenantEmailSettings,
} from "./tenant-email-settings";
export type {
  AuthLinkResult,
  AuthLinkType,
  EmailDeliveryResult,
  NotificationChannel,
  NotificationRequest,
  SendCoachInviteEmailInput,
  SendInviteEmailInput,
  SendMagicLinkEmailInput,
  SendPasswordResetEmailInput,
  SendWelcomeBackEmailInput,
  SendWelcomeEmailInput,
  TenantEmailSettings,
} from "./types";
