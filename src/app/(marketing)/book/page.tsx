import { redirect } from "next/navigation";

import { getBookingHref } from "@/content/booking";

type BookPageProps = {
  searchParams: Promise<{
    type?: string;
  }>;
};

/** Legacy /book URLs redirect into Fitness Hub Reserve (or open gym). */
export default async function BookPage({ searchParams }: BookPageProps) {
  const params = await searchParams;
  redirect(getBookingHref(params.type));
}
