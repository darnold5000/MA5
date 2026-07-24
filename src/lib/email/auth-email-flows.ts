import { inviteRedirectUrl, memberReenrollRedirectUrl } from "@/features/auth/members";
import {
  findAuthUserIdByEmail,
  isAuthUserAlreadyRegisteredError,
} from "@/lib/auth/auth-users";
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
import type { AuthLinkResult, TenantEmailSettings } from "./types";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type AuthEmailStack = {
  links: AuthLinkService;
  email: EmailService;
  settings: TenantEmailSettings;
  admin: ServiceClient;
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
    admin,
  };
}

function emailContext(
  settings: TenantEmailSettings,
  to: string,
  fullName: string,
) {
  return { settings, to: to.trim().toLowerCase(), fullName };
}

/**
 * Supabase `invite` links only work for brand-new auth users. For resends and
 * orphan auth rows, fall back to `recovery` with the same accept-invite redirect.
 */
async function createInviteOrRecoveryLink(
  stack: AuthEmailStack,
  args: {
    emailNorm: string;
    redirectTo: string;
    userMetadata?: Record<string, unknown>;
    preferRecovery?: boolean;
  },
): Promise<AuthLinkResult> {
  if (!args.preferRecovery) {
    try {
      return await stack.links.createInviteLink({
        email: args.emailNorm,
        redirectTo: args.redirectTo,
        userMetadata: args.userMetadata,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!isAuthUserAlreadyRegisteredError(message)) {
        throw err;
      }
    }
  }

  const recovery = await stack.links.createRecoveryLink({
    email: args.emailNorm,
    redirectTo: args.redirectTo,
  });

  if (!recovery.userId) {
    const existingId = await findAuthUserIdByEmail(stack.admin, args.emailNorm);
    if (existingId) {
      return { ...recovery, userId: existingId };
    }
  }

  return recovery;
}

async function resolveUserIdFromLink(
  stack: AuthEmailStack,
  emailNorm: string,
  link: AuthLinkResult,
): Promise<string> {
  if (link.userId) return link.userId;
  const existingId = await findAuthUserIdByEmail(stack.admin, emailNorm);
  if (!existingId) {
    throw new Error("Invitation link created but no user id was returned");
  }
  return existingId;
}

export async function deliverMemberInviteEmail(args: {
  stack: AuthEmailStack;
  emailNorm: string;
  fullName: string;
  inviteGeneration: number;
  userMetadata: Record<string, unknown>;
}): Promise<{ userId: string }> {
  const redirectTo = inviteRedirectUrl(env.siteUrl, args.inviteGeneration);
  const link = await createInviteOrRecoveryLink(args.stack, {
    emailNorm: args.emailNorm,
    redirectTo,
    userMetadata: args.userMetadata,
  });

  const userId = await resolveUserIdFromLink(
    args.stack,
    args.emailNorm,
    link,
  );

  await args.stack.email.sendInvite({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });

  return { userId };
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
    const link = await createInviteOrRecoveryLink(args.stack, {
      emailNorm: args.emailNorm,
      redirectTo,
      preferRecovery: true,
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
  const link = await createInviteOrRecoveryLink(args.stack, {
    emailNorm: args.emailNorm,
    redirectTo,
    userMetadata: args.userMetadata,
  });

  const userId = await resolveUserIdFromLink(
    args.stack,
    args.emailNorm,
    link,
  );

  await args.stack.email.sendCoachInvite({
    ...emailContext(args.stack.settings, args.emailNorm, args.fullName),
    actionLink: link.actionLink,
  });

  return { userId };
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
