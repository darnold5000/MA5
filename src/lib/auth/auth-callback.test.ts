import { describe, expect, it } from "vitest";

import {
  isOtpVerifyType,
  messageForAuthHashError,
  parseHashAuthError,
  parseHashSessionTokens,
  safeAuthNextPath,
} from "@/lib/auth/auth-callback";

describe("auth callback helpers", () => {
  it("allows same-origin relative next paths", () => {
    expect(safeAuthNextPath("/auth/reset-password")).toBe("/auth/reset-password");
    expect(safeAuthNextPath("/auth/accept-invite?igen=2")).toBe(
      "/auth/accept-invite?igen=2",
    );
  });

  it("rejects open redirects", () => {
    expect(safeAuthNextPath("//evil.example")).toBe("/login");
    expect(safeAuthNextPath("https://evil.example")).toBe("/login");
    expect(safeAuthNextPath(null)).toBe("/login");
  });

  it("parses hash session tokens", () => {
    expect(
      parseHashSessionTokens(
        "#access_token=abc&refresh_token=def&type=recovery",
      ),
    ).toEqual({
      accessToken: "abc",
      refreshToken: "def",
    });
  });

  it("parses supabase hash auth errors", () => {
    expect(
      parseHashAuthError(
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toEqual({
      error: "access_denied",
      errorCode: "otp_expired",
      errorDescription: "Email link is invalid or has expired",
    });
  });

  it("formats otp_expired invite errors", () => {
    expect(
      messageForAuthHashError({
        error: "access_denied",
        errorCode: "otp_expired",
        errorDescription: "Email link is invalid or has expired",
      }),
    ).toContain("expired or was already used");
  });

  it("validates otp verify types", () => {
    expect(isOtpVerifyType("invite")).toBe(true);
    expect(isOtpVerifyType("recovery")).toBe(true);
    expect(isOtpVerifyType("oauth")).toBe(false);
  });
});
