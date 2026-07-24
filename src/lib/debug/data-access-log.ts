/**
 * Opt-in dev logging for request/prefetch audits.
 * Set MA5_DEBUG_DATA=1 in .env.local — never log secrets or PII.
 */
export function logDataAccess(
  functionName: string,
  meta?: Record<string, string | number | boolean | null | undefined>,
) {
  if (process.env.NODE_ENV !== "development") return;
  if (process.env.MA5_DEBUG_DATA !== "1") return;
  console.debug("[DATA]", {
    function: functionName,
    timestamp: new Date().toISOString(),
    ...meta,
  });
}
