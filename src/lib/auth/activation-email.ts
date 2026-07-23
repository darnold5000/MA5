import { inviteRedirectUrl, memberReenrollRedirectUrl } from "@/features/auth/members";
import {
  profileNeedsInviteActivationLink,
  type ProfileLifecycleRow,
} from "@/lib/auth/client-lifecycle";
import { env } from "@/lib/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [emailNorm],
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
        }),
      });

      if (res.ok) {
        return { channel: "resend_reenroll" };
      }
      console.error(
        "[activation-email] reenroll Resend failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } else if (error) {
      console.error("[activation-email] reenroll generateLink", error.message);
    }
  }

  const userClient = await createClient();
  const { error: resetError } = await userClient.auth.resetPasswordForEmail(
    emailNorm,
    { redirectTo },
  );
  if (resetError) {
    console.error("[activation-email] reenroll recovery", resetError.message);
    throw new Error("Could not send welcome-back email");
  }
  return { channel: "supabase_recovery" };
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
  const linkType = useInviteLink ? "invite" : "recovery";
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = authFromAddress();

  if (resendKey && from) {
    const { data, error } = await args.admin.auth.admin.generateLink({
      type: linkType,
      email: emailNorm,
      options: { redirectTo },
    });

    const actionLink = data?.properties?.action_link;
    if (!error && actionLink) {
      const firstName = args.fullName.trim().split(/\s+/)[0] || "there";
      const subject = useInviteLink
        ? "You've been invited to the MA5 Member Platform"
        : "Set your MA5 password and activate access";
      const intro = useInviteLink
        ? "MA5 has invited you to the member platform."
        : "MA5 staff has restored your access to the member platform.";
      const instruction = useInviteLink
        ? "Use the secure link below to set your password and activate your account."
        : "Use the secure link below to set or update your password.";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [emailNorm],
          subject,
          html: [
            `<p>Hi ${escapeHtml(firstName)},</p>`,
            `<p>${escapeHtml(intro)}</p>`,
            `<p>${escapeHtml(instruction)}</p>`,
            `<p><a href="${actionLink}">Activate your MA5 account</a></p>`,
            `<p>If you were not expecting this, you can ignore this email or contact MA5 staff.</p>`,
          ].join(""),
          text: [
            `Hi ${firstName},`,
            "",
            intro,
            "",
            instruction,
            "",
            actionLink,
            "",
            "If you were not expecting this, you can ignore this email or contact MA5 staff.",
          ].join("\n"),
        }),
      });

      if (res.ok) {
        return { channel: useInviteLink ? "resend_invite" : "resend_recovery" };
      }
      console.error(
        "[activation-email] Resend failed",
        res.status,
        await res.text().catch(() => ""),
      );
    } else if (error) {
      console.error("[activation-email] generateLink", error.message);
    }
  }

  if (useInviteLink) {
    const { data, error } = await args.admin.auth.admin.generateLink({
      type: "invite",
      email: emailNorm,
      options: { redirectTo },
    });
    if (!error && data?.properties?.action_link) {
      const { error: resendError } = await args.admin.auth.resend({
        type: "signup",
        email: emailNorm,
        options: { emailRedirectTo: redirectTo },
      });
      if (!resendError) {
        return { channel: "supabase_invite" };
      }
      console.error("[activation-email] supabase invite resend", resendError.message);
    } else if (error) {
      console.error("[activation-email] invite generateLink", error.message);
    }
    throw new Error(
      "Could not send invitation email. Configure RESEND_API_KEY and AUTH_EMAIL_FROM, or update the Supabase Invite email template.",
    );
  }

  const userClient = await createClient();
  const { error: resetError } = await userClient.auth.resetPasswordForEmail(
    emailNorm,
    { redirectTo },
  );
  if (resetError) {
    console.error(
      "[activation-email] supabase recovery",
      resetError.message,
    );
    throw new Error("Could not send password email");
  }
  return { channel: "supabase_recovery" };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
