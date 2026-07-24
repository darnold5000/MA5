import { inviteRedirectUrl, memberReenrollRedirectUrl } from "@/features/auth/members";
import {
  profileNeedsInviteActivationLink,
  type ProfileLifecycleRow,
} from "@/lib/auth/client-lifecycle";
import { env } from "@/lib/env";
import type { createServiceClient } from "@/lib/supabase/server";

import { createAuthLinkService, type AuthLinkService } from "./auth-link-service";
import { createEmailService, type EmailService } from "./email-service";
import { createDefaultEmailProvider } from "./providers";
import {
  isTenantEmailDeliveryConfigured,
  loadTenantEmailSettings,
} from "./tenant-email-settings";
import type { TenantEmailSettings } from "./types";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type AuthEmailStack = {
  links: AuthLinkService;
  email: EmailService;
  settings: TenantEmailSettings;
};

export function passwordResetRedirectUrl(siteUrl: string): string {
  const next = "/auth/reset-password";
  return `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function isAuthEmailDeliveryConfigured(tenantId: string): boolean {
  const settings = loadTenantEmailSettings(tenantId);
  return isTenantEmailDeliveryConfigured(settings);
}

/** @throws Error when Resend or tenant from-address is not configured */
export function requireAuthEmailStack(
  tenantId: string,
  admin: ServiceClient,
): AuthEmailStack {
  const settings = loadTenantEmailSettings(tenantId);
  if (!isTenantEmailDeliveryConfigured(settings)) {
    throw new Error(
      "Email delivery is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM (verified in Resend).",
    );
  }

  const provider = createDefaultEmailProvider();
  if (!provider) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return {
    links: createAuthLinkService(admin),
    email: createEmailService(provider),
    settings,
  };
}

function emailContext(
  settings: TenantEmailSettings,
  to: string,
  fullName: string,
) {
  return { settings, to: to.trim().toLowerCase(), fullName };
}

export async function deliverMemberInviteEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
  inviteGeneration: number;
  userMetadata: Record<string, unknown>;
}): Promise<{ userId: string }> {
  const redirectTo = inviteRedirectUrl(env.siteUrl, args.inviteGeneration);
  const link = await args.stack.links.createInviteLink({
    email: args.emailNorm,
    redirectTo,
    userMetadata: args.userMetadata,
  });

  if (!link.userId) {
    throw new Error("Invitation link created but no user id was returned");
  }

  await args.stack.email.sendInvite({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });

  return { userId: link.userId };
}

export async function deliverMemberActivationResendEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
  inviteGeneration: number;
  profile?: ProfileLifecycleRow | null;
}): Promise<"invite" | "recovery"> {
  const redirectTo = inviteRedirectUrl(env.siteUrl, args.inviteGeneration);
  const useInvite = profileNeedsInviteActivationLink(args.profile);

  if (useInvite) {
    const link = await args.stack.links.createInviteLink({
      email: args.emailNorm,
      redirectTo,
    });
    await args.stack.email.sendInvite({
      ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
      actionLink: link.actionLink,
    });
    return "invite";
  }

  const link = await args.stack.links.createRecoveryLink({
    email: args.emailNorm,
    redirectTo,
  });
  await args.stack.email.sendPasswordReset({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });
  return "recovery";
}

export async function deliverFormerMemberWelcomeBackEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
}): Promise<void> {
  const redirectTo = memberReenrollRedirectUrl(env.siteUrl);
  const link = await args.stack.links.createRecoveryLink({
    email: args.emailNorm,
    redirectTo,
  });
  await args.stack.email.sendWelcomeBack({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });
}

export async function deliverActiveMemberSignInEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
}): Promise<void> {
  const redirectTo = passwordResetRedirectUrl(env.siteUrl);
  const link = await args.stack.links.createRecoveryLink({
    email: args.emailNorm,
    redirectTo,
  });
  await args.stack.email.sendPasswordReset({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });
}

export async function deliverCoachInviteEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
  inviteGeneration: number;
  userMetadata: Record<string, unknown>;
}): Promise<{ userId: string }> {
  const redirectTo = inviteRedirectUrl(env.siteUrl, args.inviteGeneration);
  const link = await args.stack.links.createInviteLink({
    email: args.emailNorm,
    redirectTo,
    userMetadata: args.userMetadata,
  });

  if (!link.userId) {
    throw new Error("Coach invitation link created but no user id was returned");
  }

  await args.stack.email.sendCoachInvite({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });

  return { userId: link.userId };
}

/**
 * Forgot-password: never reveals whether the email exists.
 * Logs delivery failures; does not throw to the client.
 */
export async function deliverPasswordResetRequestEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName?: string;
}): Promise<void> {
  const redirectTo = passwordResetRedirectUrl(env.siteUrl);
  try {
    const link = await args.stack.links.createRecoveryLink({
      email: args.emailNorm,
      redirectTo,
    });
    await args.stack.email.sendPasswordReset({
      ...emailContext(
        args.stack.settings,
        args.emailNorm,
        args.fullName?.trim() || "there",
      ),
      actionLink: link.actionLink,
    });
  } catch (err) {
    console.error("[auth-email] password reset request not delivered", err);
  }
}

export async function deliverMagicLinkEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
  redirectTo: string;
}): Promise<void> {
  const link = await args.stack.links.createMagicLink({
    email: args.emailNorm,
    redirectTo: args.redirectTo,
  });
  await args.stack.email.sendMagicLink({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });
}
