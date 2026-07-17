import { redirect } from "next/navigation";

export default function AdminExercisesRedirect() {
  redirect("/admin/programs/library?tab=exercises");
}
