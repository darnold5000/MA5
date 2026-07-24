import { describe, expect, it, vi } from "vitest";

import { EmailService } from "@/lib/email/email-service";
import type { EmailProvider } from "@/lib/email/providers/types";
import type { TenantEmailSettings } from "@/lib/email/types";

const settings: TenantEmailSettings = {
  tenantId: "tenant-1",
  brandName: "Test Gym",
  fromName: "Test Gym",
  fromEmail: "support@testgym.com",
  replyTo: "help@testgym.com",
  supportEmail: "help@testgym.com",
  supportPhone: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  buttonColor: null,
  footerText: null,
  privacyUrl: null,
  termsUrl: null,
};

function mockProvider(
  impl: EmailProvider["send"] = async () => ({
    ok: true,
    provider: "resend",
    messageId: "msg_123",
  }),
): EmailProvider {
  return { id: "resend", send: vi.fn(impl) };
}

describe("EmailService", () => {
  it("sendInvite renders and delivers via provider", async () => {
    const provider = mockProvider();
    const service = new EmailService(provider);

    const result = await service.sendInvite({
      settings,
      to: "member@example.com",
      fullName: "Jamie Lee",
      actionLink: "https://app.example/auth/callback?code=abc",
    });

    expect(result.ok).toBe(true);
    expect(provider.send).toHaveBeenCalledOnce();
    const payload = vi.mocked(provider.send).mock.calls[0][0];
    expect(payload.to).toBe("member@example.com");
    expect(payload.from).toBe("Test Gym <support@testgym.com>");
    expect(payload.subject).toContain("Test Gym");
    expect(payload.html).toContain("Jamie");
    expect(payload.text).toContain("https://app.example/auth/callback?code=abc");
  });

  it("throws EmailDeliveryError when provider fails", async () => {
    const provider = mockProvider(async () => ({
      ok: false,
      provider: "resend",
      message: "domain not verified",
      statusCode: 403,
    }));
    const service = new EmailService(provider);

    await expect(
      service.sendPasswordReset({
        settings,
        to: "member@example.com",
        fullName: "Jamie",
        actionLink: "https://app.example/reset",
      }),
    ).rejects.toThrow("domain not verified");
  });
});
