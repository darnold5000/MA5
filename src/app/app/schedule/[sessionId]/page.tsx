import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

/** Old detail URLs collapse back to the schedule with expand handled on-page. */
export default async function SessionDetailRedirect({ params }: PageProps) {
  await params;
  redirect("/app/schedule");
}
