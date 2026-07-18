import { redirect } from "next/navigation";

/** Public self-registration is disabled — invitation only. */
export default function SignupPage() {
  redirect("/login");
}
