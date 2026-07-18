import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/platform/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <ResetPasswordForm />
    </div>
  );
}
