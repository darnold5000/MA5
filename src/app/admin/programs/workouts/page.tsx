import { redirect } from "next/navigation";

export default function AdminWorkoutsRedirect() {
  redirect("/admin/programs/library?tab=sessions");
}
