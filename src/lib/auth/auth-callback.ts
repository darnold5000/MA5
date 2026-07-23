export type AuthHashError = {
  error: string;
  errorCode: string | null;
  errorDescription: string | null;
};

export function parseHashAuthError(hash: string): AuthHashError | null {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!trimmed) return null;

  const params = new URLSearchParams(trimmed);
  const error = params.get("error");
  if (!error) return null;

  return {
    error,
    errorCode: params.get("error_code"),
    errorDescription: params.get("error_description"),
  };
}

export function messageForAuthHashError(hashError: AuthHashError): string {
  if (hashError.errorCode === "otp_expired") {
    return "This invitation link has expired or was already used. Ask MA5 staff to resend your invitation, then open only the newest email.";
  }

  if (hashError.error === "access_denied") {
    const description = hashError.errorDescription?.replaceAll("+", " ").trim();
    if (description) return description;
    return "This sign-in link is no longer valid. Request a new invitation or password reset email.";
  }

  const description = hashError.errorDescription?.replaceAll("+", " ").trim();
  return description ?? "This sign-in link is no longer valid.";
}

export type OtpVerifyType =
  | "invite"
  | "recovery"
  | "email"
  | "signup"
  | "magiclink";

export function safeAuthNextPath(nextRaw: string | null | undefined): string {
  if (nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    return nextRaw;
  }
  return "/login";
}

export function parseHashSessionTokens(hash: string): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!trimmed) {
    return { accessToken: null, refreshToken: null };
  }

  const params = new URLSearchParams(trimmed);
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
  };
}

export function isOtpVerifyType(value: string | null): value is OtpVerifyType {
  return (
    value === "invite" ||
    value === "recovery" ||
    value === "email" ||
    value === "signup" ||
    value === "magiclink"
  );
}
