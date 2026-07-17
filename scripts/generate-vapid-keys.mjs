#!/usr/bin/env node
/**
 * Generate VAPID keys for MA5 Web Push.
 * Usage: npm run vapid-keys
 * Paste output into .env.local (never commit the private key).
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log(`
# Add to .env.local (and your host's env vars for production)

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
VAPID_SUBJECT=mailto:ma.fitness99@gmail.com
`);
