"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  label?: string;
};

export function SignOutButton({
  className,
  label = "Sign out",
}: SignOutButtonProps) {
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={signOut}
      className={cn(
        "text-left transition disabled:opacity-50",
        className,
      )}
    >
      {pending ? "Signing out…" : label}
    </button>
  );
}
