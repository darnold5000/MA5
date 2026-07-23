import { inviteRedirectUrl, memberReenrollRedirectUrl } from "@/features/auth/members";
import {
  profileNeedsInviteActivationLink,
  type ProfileLifecycleRow,
} from "@/lib/auth/client-lifecycle";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type ActivationEmailChannel =
  | "resend_invite"
  | "resend_recovery"
  | "resend_reenroll"
  | "supabase_invite"
  | "supabase_recovery";

function authFromAddress(): string | null {
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

async function sendBrandedEmail(args: {
  resendKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.from,
      to: [args.to],
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!res.ok) {
    console.error(
      "[activation-email] Resend failed",
      res.status,
      await res.text().catch(() => ""),
    );
  }

  return res.ok;
}

async function trySupabaseSignupResend(
  admin: ServiceClient,
  emailNorm: string,
  redirectTo: string,
): Promise<boolean> {
  const { error } = await admin.auth.resend({
    type: "signup",
    email: emailNorm,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) {
    console.error("[activation-email] supabase signup resend", error.message);
    return false;
  }
  return true;
}

async function trySupabaseRecoveryEmail(
  admin: ServiceClient,
  emailNorm: string,
  redirectTo: string,
): Promise<boolean> {
  const { error } = await admin.auth.resetPasswordForEmail(emailNorm, {
    redirectTo,
  });
  if (error) {
    console.error("[activation-email] supabase recovery", error.message);
    return false;
  }
  return true;
}

async function sendViaResendOrSupabase(args: {
  admin: ServiceClient;
  emailNorm: string;
  redirectTo: string;
  linkType: "invite" | "recovery";
  subject: string;
  intro: string;
  instruction: string;
  cta: string;
  fullName: string;
  resendChannel: ActivationEmailChannel;
  supabaseInvite: boolean;
}): Promise<{ channel: ActivationEmailChannel }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = authFromAddress();

  if (resendKey && from) {
    const { data, error } = await args.admin.auth.admin.generateLink({
      type: args.linkType,
      email: args.emailNorm,
      options: { redirectTo: args.redirectTo },
    });

    const actionLink = data?.properties?.action_link;
    if (!error && actionLink) {
      const firstName = args.fullName.trim().split(/\s+/)[0] || "there";
      const sent = await sendBrandedEmail({
        resendKey,
        from,
        to: args.emailNorm,
        subject: args.subject,
        html: [
          `<p>Hi ${escapeHtml(firstName)},</p>`,
          `<p>${escapeHtml(args.intro)}</p>`,
          `<p>${escapeHtml(args.instruction)}</p>`,
          `<p><a href="${actionLink}">${escapeHtml(args.cta)}</a></p>`,
          `<p>If you were not expecting this, you can ignore this email or contact MA5 staff.</p>`,
        ].join(""),
        text: [
          `Hi ${firstName},`,
          "",
          args.intro,
          "",
          args.instruction,
          "",
          actionLink,
          "",
          "If you were not expecting this, you can ignore this email or contact MA5 staff.",
        ].join("\n"),
      });
      if (sent) {
        return { channel: args.resendChannel };
      }
    } else if (error) {
      console.error("[activation-email] generateLink", error.message);
    }
  }

  if (args.supabaseInvite) {
    if (
      await trySupabaseSignupResend(
        args.admin,
        args.emailNorm,
        args.redirectTo,
      )
    ) {
      return { channel: "supabase_invite" };
    }
    throw new Error(
      "Could not send invitation email. Confirm Supabase Auth email is enabled, add https://ma5.hiresignalworks.com/auth/callback to redirect URLs, and check Vercel logs.",
    );
  }

  if (
    await trySupabaseRecoveryEmail(args.admin, args.emailNorm, args.redirectTo)
  ) {
    return { channel: "supabase_recovery" };
  }

  throw new Error(
    "Could not send password email. Check Supabase SMTP settings and add this site to Auth redirect URLs.",
  );
}

/**
 * Welcome-back email for a re-enrolled former member (recovery link → reset password / sign in).
 */
export async function sendFormerMemberReenrollEmail(args: {
  admin: ServiceClient;
  email: string;
  fullName: string;
}): Promise<{ channel: ActivationEmailChannel }> {
  const emailNorm = args.email.trim().toLowerCase();
  const redirectTo = memberReenrollRedirectUrl(env.siteUrl);
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = authFromAddress();

  if (resendKey && from) {
    const { data, error } = await args.admin.auth.admin.generateLink({
      type: "recovery",
      email: emailNorm,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link;
    if (!error && actionLink) {
      const firstName = args.fullName.trim().split(/\s+/)[0] || "there";
      const sent = await sendBrandedEmail({
        resendKey,
        from,
        to: emailNorm,
        subject: "Welcome back to MA5 Performance",
        html: [
          `<p>Hi ${escapeHtml(firstName)},</p>`,
          `<p>Your MA5 member portal access has been restored.</p>`,
          `<p>You can sign in with your existing password, or use the secure link below to set a new one.</p>`,
          `<p><a href="${actionLink}">Continue to MA5</a></p>`,
          `<p>If you were not expecting this, contact MA5 staff.</p>`,
        ].join(""),
        text: [
          `Hi ${firstName},`,
          "",
          "Your MA5 member portal access has been restored.",
          "",
          "You can sign in with your existing password, or use the secure link below to set a new one:",
          "",
          actionLink,
          "",
          "If you were not expecting this, contact MA5 staff.",
        ].join("\n"),
      });
      if (sent) {
        return { channel: "resend_reenroll" };
      }
    } else if (error) {
      console.error("[activation-email] reenroll generateLink", error.message);
    }
  }

  if (await trySupabaseRecoveryEmail(args.admin, emailNorm, redirectTo)) {
    return { channel: "supabase_recovery" };
  }

  throw new Error("Could not send welcome-back email");
}

/**
 * Send activation email for an Auth user that already exists.
 * Never-activated members get an invite link (set password). Former members get recovery.
 */
export async function sendExistingUserActivationEmail(args: {
  admin: ServiceClient;
  email: string;
  fullName: string;
  inviteGeneration: number;
  profile?: ProfileLifecycleRow | null;
}): Promise<{ channel: ActivationEmailChannel }> {
  const emailNorm = args.email.trim().toLowerCase();
  const redirectTo = inviteRedirectUrl(env.siteUrl, args.inviteGeneration);
  const useInviteLink = profileNeedsInviteActivationLink(args.profile);

  if (useInviteLink) {
    return sendViaResendOrSupabase({
      admin: args.admin,
      emailNorm,
      redirectTo,
      linkType: "invite",
      subject: "You've been invited to the MA5 Member Platform",
      intro: "MA5 has invited you to the member platform.",
      instruction:
        "Use the secure link below to set your password and activate your account.",
      cta: "Activate your MA5 account",
      fullName: args.fullName,
      resendChannel: "resend_invite",
      supabaseInvite: true,
    });
  }

  return sendViaResendOrSupabase({
    admin: args.admin,
    emailNorm,
    redirectTo,
    linkType: "recovery",
    subject: "Set your MA5 password and activate access",
    intro: "MA5 staff has restored your access to the member platform.",
    instruction: "Use the secure link below to set or update your password.",
    cta: "Continue to MA5",
    fullName: args.fullName,
    resendChannel: "resend_recovery",
    supabaseInvite: false,
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
