import { createResendProvider } from "./resend-provider";
import type { EmailProvider } from "./types";

export type { EmailProvider, EmailProviderId } from "./types";
export { ResendProvider, createResendProvider } from "./resend-provider";

/**
 * Default outbound provider for Signal Works apps (Phase 1: Resend only).
 */
export function createDefaultEmailProvider(): EmailProvider | null {
  return createResendProvider();
}
