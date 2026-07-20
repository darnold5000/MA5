import { siteConfig } from "@/content/site-config";

type NotifyStaffEmailArgs = {
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

function contactFromAddress(): string | null {
  const from =
    process.env.CONTACT_EMAIL_FROM?.trim() ||
    process.env.AUTH_EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

function contactToAddress(): string {
  return (
    process.env.CONTACT_TO_EMAIL?.trim() || siteConfig.contact.email
  );
}

/**
 * Notify MA5 staff via Resend. Fails soft — callers should not block on this.
 */
export async function notifyStaffEmail(
  args: NotifyStaffEmailArgs,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = contactFromAddress();
  const to = contactToAddress();

  if (!apiKey || !from) {
    console.warn(
      "[email] Staff notify skipped — set RESEND_API_KEY and CONTACT_EMAIL_FROM or AUTH_EMAIL_FROM",
    );
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
        subject: args.subject,
        text: args.text,
        ...(args.html ? { html: args.html } : {}),
      }),
    });

    if (!res.ok) {
      console.error("[email] Staff notify failed", await res.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("[email] Staff notify error", err);
    return false;
  }
}

export function formatStaffBookingRequestEmail(args: {
  name: string;
  email: string;
  phone?: string | null;
  serviceLabel: string;
  message?: string | null;
  sourcePath?: string | null;
  utmCampaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): { subject: string; text: string } {
  const lines = [
    `Service requested: ${args.serviceLabel}`,
    `Name: ${args.name}`,
    `Email: ${args.email}`,
    `Phone: ${args.phone?.trim() || "—"}`,
    `Submitted from: ${args.sourcePath ?? "/book"}`,
    `Campaign: ${args.utmCampaign ?? "—"}`,
    `Source: ${args.utmSource ?? "—"} / ${args.utmMedium ?? "—"}`,
    "",
    args.message?.trim() || "(No additional message)",
  ];

  return {
    subject: `Booking request: ${args.serviceLabel} — ${args.name}`,
    text: lines.join("\n"),
  };
}

export function formatStaffLeadEmail(args: {
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  utmCampaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
}): { subject: string; text: string } {
  return {
    subject: `New contact: ${args.name}`,
    text: [
      `Name: ${args.name}`,
      `Email: ${args.email}`,
      `Phone: ${args.phone ?? "—"}`,
      `Campaign: ${args.utmCampaign ?? "—"}`,
      `Source: ${args.utmSource ?? "—"} / ${args.utmMedium ?? "—"}`,
      "",
      args.message ?? "",
    ].join("\n"),
  };
}
