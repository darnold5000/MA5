import { describe, expect, it } from "vitest";

import { isAuthUserAlreadyRegisteredError } from "@/lib/auth/auth-users";

describe("isAuthUserAlreadyRegisteredError", () => {
  it("detects Supabase duplicate user message", () => {
    expect(
      isAuthUserAlreadyRegisteredError(
        "A user with this email address has already been registered",
      ),
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isAuthUserAlreadyRegisteredError("Invalid redirect URL")).toBe(false);
  });
});
