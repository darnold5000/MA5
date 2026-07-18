/**
 * Create demo coach Mike in Supabase Auth + promote to coach role.
 *
 * Requires in env (or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node --env-file=.env.local scripts/create-demo-coach.mjs
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = "mike@ma5.com";
const PASSWORD = "1Password";
const FULL_NAME = "Mike";

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Put them in .env.local and run:\n" +
      "  node --env-file=.env.local scripts/create-demo-coach.mjs",
  );
  process.exit(1);
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: FULL_NAME,
        role: "coach",
        invitation_status: "accepted",
        active: true,
      },
    });

  let userId = created?.user?.id ?? null;

  if (createError) {
    if (!/already|registered|exists/i.test(createError.message)) {
      throw createError;
    }
    console.log("User already exists — looking up id…");
    const { data: list, error: listError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listError) throw listError;
    const existing = list.users.find(
      (u) => u.email?.toLowerCase() === EMAIL.toLowerCase(),
    );
    if (!existing) {
      throw new Error(
        `User exists but could not find ${EMAIL} in first 200 users.`,
      );
    }
    userId = existing.id;
  } else {
    console.log(`Created auth user ${EMAIL} (${userId})`);
  }

  // Ensure profile is active; staff accounts should not keep a leftover client role.
  const { error: profileError } = await admin.from("ma5_profiles").upsert(
    {
      id: userId,
      email: EMAIL,
      full_name: FULL_NAME,
      active: true,
      invitation_status: "accepted",
      invitation_accepted_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  const { error: roleError } = await admin.from("ma5_user_roles").upsert(
    { user_id: userId, role: "coach" },
    { onConflict: "user_id,role" },
  );
  if (roleError) throw roleError;

  // Older auth triggers defaulted every user to client. Remove it so Mike is
  // staff-only — admin access comes from coach, not from being a member.
  const { error: removeClientError } = await admin
    .from("ma5_user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", "client");
  if (removeClientError) throw removeClientError;

  const { data: roles } = await admin
    .from("ma5_user_roles")
    .select("role")
    .eq("user_id", userId);
  console.log("Done.");
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Roles:    ${(roles ?? []).map((r) => r.role).join(", ") || "(none)"}`);
  console.log(`  Login:    /login → then /admin`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
