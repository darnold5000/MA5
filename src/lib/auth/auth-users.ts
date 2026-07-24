import type { createServiceClient } from "@/lib/supabase/server";

type ServiceClient = ReturnType<typeof createServiceClient>;

export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAuthUserAlreadyRegisteredError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already been registered") || lower.includes("already exists")
  );
}

/** Paginated lookup — use when generateLink(recovery) does not return user id. */
export async function findAuthUserIdByEmail(
  admin: ServiceClient,
  email: string,
): Promise<string | null> {
  const normalized = normalizeAuthEmail(email);
  let page = 1;

  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error || !data.users.length) {
      return null;
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (match?.id) return match.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}
