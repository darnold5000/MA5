/**
 * @deprecated Import from `@/lib/email/auth-email-flows` instead.
 * Kept for backwards compatibility during Phase 2; will be removed.
 */
export {
  deliverActiveMemberSignInEmail,
  deliverCoachInviteEmail,
  deliverFormerMemberWelcomeBackEmail,
  deliverMemberActivationResendEmail,
  deliverMemberInviteEmail,
  deliverPasswordResetRequestEmail,
  isAuthEmailDeliveryConfigured as isBrandedAuthEmailConfigured,
} from "@/lib/email/auth-email-flows";

export type ActivationEmailChannel =
  | "resend_invite"
  | "resend_recovery"
  | "resend_reenroll";

/** @deprecated Use deliverMemberInviteEmail */
export async function sendNewMemberInviteEmail(): Promise<never> {
  throw new Error(
    "sendNewMemberInviteEmail was removed — use deliverMemberInviteEmail from @/lib/email/auth-email-flows",
  );
}

/** @deprecated Use deliverMemberActivationResendEmail */
export async function sendExistingUserActivationEmail(): Promise<never> {
  throw new Error(
    "sendExistingUserActivationEmail was removed — use deliverMemberActivationResendEmail",
  );
}

/** @deprecated Use deliverFormerMemberWelcomeBackEmail */
export async function sendFormerMemberReenrollEmail(): Promise<never> {
  throw new Error(
    "sendFormerMemberReenrollEmail was removed — use deliverFormerMemberWelcomeBackEmail",
  );
}
