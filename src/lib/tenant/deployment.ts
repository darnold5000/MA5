/**
 * Server-only MA5 deployment context for Signal Works shared Supabase.
 *
 * Do not import this module from Client Components or shared client bundles.
 * All service-role database access must obtain tenant scope through this module —
 * never read process.env.MA5_TENANT_ID (or related vars) elsewhere in the app.
 *
 * Transitional: tenant/location come from deployment env (D-17).
 * Future: hostname → tenant_domains resolver will call the same APIs.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STRIPE_ACCOUNT_RE = /^acct_/;

export type Ma5DeploymentContext = {
  /** Signal Works tenants.id for this MA5 deployment */
  tenantId: string;
  /** Default ma5_locations.id (slug main) for session scheduling */
  locationId: string;
  /** Stripe Connect/account id for webhook dedup (acct_…) — required before webhooks ship */
  stripeAccountId: string | null;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireUuidEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `${name} is not configured. Required for Signal Works destination cutover.`,
    );
  }
  if (!UUID_RE.test(value)) {
    throw new Error(`${name} must be a valid UUID (got ${value})`);
  }
  return value;
}

function readUuidEnv(name: string): string | null {
  const value = readEnv(name);
  if (!value) return null;
  if (!UUID_RE.test(value)) {
    throw new Error(`${name} must be a valid UUID (got ${value})`);
  }
  return value;
}

/** Whether deployment tenant + location env vars are present (hobby DB needs none). */
export function isMa5DeploymentConfigured(): boolean {
  return Boolean(readUuidEnv("MA5_TENANT_ID") && readUuidEnv("MA5_LOCATION_ID"));
}

/**
 * Canonical tenant id for this MA5 deployment.
 * Throws when unset — use on service-role writes and tenant-scoped admin paths.
 */
export function requireMa5TenantId(): string {
  return requireUuidEnv("MA5_TENANT_ID");
}

/** Default location id for scheduling (ma5_locations.slug = main). */
export function requireMa5LocationId(): string {
  return requireUuidEnv("MA5_LOCATION_ID");
}

/** Stripe account id for webhook dedup; null until Phase 3 commerce hardening. */
export function getStripeAccountId(): string | null {
  const value = readEnv("STRIPE_ACCOUNT_ID");
  if (!value) return null;
  if (!STRIPE_ACCOUNT_RE.test(value)) {
    throw new Error(
      `STRIPE_ACCOUNT_ID must start with acct_ (got ${value})`,
    );
  }
  return value;
}

export function requireStripeAccountId(): string {
  const value = getStripeAccountId();
  if (!value) {
    throw new Error(
      "STRIPE_ACCOUNT_ID is not configured. Required for webhook dedup on Signal Works.",
    );
  }
  return value;
}

/**
 * Full deployment context for service-role operations.
 * Call once per request/handler; pass `ctx` into data helpers.
 */
export function requireMa5DeploymentContext(): Ma5DeploymentContext {
  return {
    tenantId: requireMa5TenantId(),
    locationId: requireMa5LocationId(),
    stripeAccountId: getStripeAccountId(),
  };
}

/** Attach tenant_id to a row payload for insert/upsert. */
export function withTenantId<T extends Record<string, unknown>>(
  ctx: Ma5DeploymentContext,
  row: T,
): T & { tenant_id: string } {
  return { ...row, tenant_id: ctx.tenantId };
}

/**
 * Tenant-scoped upsert conflict target for composite uniques on destination.
 * Example: onConflict: tenantOnConflict(ctx, "stripe_checkout_session_id")
 */
export function tenantOnConflict(
  ctx: Ma5DeploymentContext,
  column: string,
): string {
  return `tenant_id,${column}`;
}
