import { inviteRedirectUrl } from "@/features/auth/members";
import { env } from "@/lib/env";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

function authFromAddress(): string | null {
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

/**
 * Send a branded "activate your MA5 access" email for existing Auth users.
 * Falls back to Supabase recovery email when Resend is not configured.
 *
 * The Supabase recovery template should still use activation-aware copy
 * (see docs/AUTH_EMAIL_TEMPLATES.md) for the fallback / forgot-password path.
 */
export async function sendExistingUserActivationEmail(args: {
  admin: ServiceClient;
  email: string;
  fullName: string;
}): Promise<{ channel: "resend" | "supabase_recovery" }> {
  const emailNorm = args.email.trim().toLowerCase();
  const redirectTo = inviteRedirectUrl(env.siteUrl);
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
          subject: "Activate your MA5 member access",
          html: [
            `<p>Hi ${escapeHtml(firstName)},</p>`,
            `<p>MA5 staff has set up (or restored) your access to the MA5 Member Platform.</p>`,
            `<p>This is an <strong>activation</strong> email — not a notice that you forgot your password. Use the secure link below to set your password and finish activating your account.</p>`,
            `<p><a href="${actionLink}">Activate your MA5 account</a></p>`,
            `<p>If you were not expecting this, you can ignore this email or contact MA5 staff.</p>`,
          ].join(""),
          text: [
            `Hi ${firstName},`,
            "",
            "MA5 staff has set up (or restored) your access to the MA5 Member Platform.",
            "",
            "This is an activation email — not a notice that you forgot your password.",
            "Use the secure link below to set your password and finish activating your account:",
            "",
            actionLink,
            "",
            "If you were not expecting this, you can ignore this email or contact MA5 staff.",
          ].join("\n"),
        }),
      });

      if (res.ok) {
        return { channel: "resend" };
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

  // Fallback: Supabase recovery email (configure template per AUTH_EMAIL_TEMPLATES.md)
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
