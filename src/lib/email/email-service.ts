import type { EmailProvider } from "./providers/types";
import {
  renderCoachInviteEmail,
  renderInviteEmail,
  renderMagicLinkEmail,
  renderPasswordResetEmail,
  renderWelcomeBackEmail,
  renderWelcomeEmail,
} from "./templates/auth-messages";
import { formatFromAddress } from "./tenant-email-settings";
import type {
  EmailDeliveryResult,
  SendCoachInviteEmailInput,
  SendInviteEmailInput,
  SendMagicLinkEmailInput,
  SendPasswordResetEmailInput,
  SendWelcomeBackEmailInput,
  SendWelcomeEmailInput,
} from "./types";

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly result: EmailDeliveryResult,
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

/**
 * Renders templates and sends via an {@link EmailProvider}.
 * Does not call Supabase — use {@link AuthLinkService} for auth links first.
 */
export class EmailService {
  constructor(private readonly provider: EmailProvider) {}

  private async deliver(
    settings: SendInviteEmailInput["settings"],
    to: string,
    rendered: { subject: string; html: string; text: string },
    tag: string,
  ): Promise<EmailDeliveryResult> {
    const from = formatFromAddress(settings);
    const result = await this.provider.send({
      from,
      to: to.trim().toLowerCase(),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: settings.replyTo,
      tags: [{ name: "template", value: tag }],
    });

    if (!result.ok) {
      throw new EmailDeliveryError(result.message, result);
    }

    return result;
  }

  sendInvite(input: SendInviteEmailInput): Promise<EmailDeliveryResult> {
    const rendered = renderInviteEmail({
      settings: input.settings,
      fullName: input.fullName,
      actionLink: input.actionLink,
    });
    return this.deliver(input.settings, input.to, rendered, "invite");
  }

  sendPasswordReset(
    input: SendPasswordResetEmailInput,
  ): Promise<EmailDeliveryResult> {
    const rendered = renderPasswordResetEmail({
      settings: input.settings,
      fullName: input.fullName,
      actionLink: input.actionLink,
    });
    return this.deliver(input.settings, input.to, rendered, "password_reset");
  }

  sendMagicLink(input: SendMagicLinkEmailInput): Promise<EmailDeliveryResult> {
    const rendered = renderMagicLinkEmail({
      settings: input.settings,
      fullName: input.fullName,
      actionLink: input.actionLink,
    });
    return this.deliver(input.settings, input.to, rendered, "magic_link");
  }

  sendCoachInvite(
    input: SendCoachInviteEmailInput,
  ): Promise<EmailDeliveryResult> {
    const rendered = renderCoachInviteEmail({
      settings: input.settings,
      fullName: input.fullName,
      actionLink: input.actionLink,
    });
    return this.deliver(input.settings, input.to, rendered, "coach_invite");
  }

  sendWelcomeEmail(
    input: SendWelcomeEmailInput,
  ): Promise<EmailDeliveryResult> {
    const rendered = renderWelcomeEmail({
      settings: input.settings,
      fullName: input.fullName,
      actionLink: input.actionLink,
    });
    return this.deliver(input.settings, input.to, rendered, "welcome");
  }

  sendWelcomeBack(input: SendWelcomeBackEmailInput): Promise<EmailDeliveryResult> {
    const rendered = renderWelcomeBackEmail({
      settings: input.settings,
      fullName: input.fullName,
      actionLink: input.actionLink,
    });
    return this.deliver(input.settings, input.to, rendered, "welcome_back");
  }
}

export function createEmailService(provider: EmailProvider): EmailService {
  return new EmailService(provider);
}
