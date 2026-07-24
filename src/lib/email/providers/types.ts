import type { EmailDeliveryResult, SendEmailPayload } from "../types";

export type EmailProviderId = "resend" | "ses" | "postmark" | "sendgrid";

export interface EmailProvider {
  readonly id: EmailProviderId;
  send(payload: SendEmailPayload & { from: string }): Promise<EmailDeliveryResult>;
}
