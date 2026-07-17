import { redirect } from "next/navigation";

/** Analytics is split into Daily Ops (Home) and Reports. */
export default function AdminAnalyticsPage() {
  redirect("/admin/reports");
}
