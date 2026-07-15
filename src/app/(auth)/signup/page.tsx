import type { Metadata } from "next";

import { SignupForm } from "@/components/platform/signup-form";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupForm />;
}
