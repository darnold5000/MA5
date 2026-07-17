import webpush from "web-push";

import type {
  DeliveryPayload,
  DeliveryResult,
  NotificationDeliveryAdapter,
} from "@/features/messaging/delivery";
import { createServiceClient } from "@/lib/supabase/server";
import { MA5_TABLES } from "@/lib/supabase/tables";

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim() &&
      process.env.VAPID_SUBJECT?.trim(),
  );
}

function configureWebPush() {
  if (!isWebPushConfigured()) {
    throw new Error("Web Push VAPID keys are not configured");
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!.trim(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
}

export type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

/** Send a Web Push to one stored subscription. Removes gone subscriptions. */
export async function sendWebPushToSubscription(
  row: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string | null },
): Promise<"sent" | "gone" | "failed"> {
  configureWebPush();
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/app/messages",
      }),
      { TTL: 60 * 60 * 12 },
    );
    return "sent";
  } catch (err: unknown) {
    const status =
      err && typeof err === "object" && "statusCode" in err
        ? Number((err as { statusCode: number }).statusCode)
        : 0;
    if (status === 404 || status === 410) {
      try {
        const supabase = createServiceClient();
        await supabase
          .from(MA5_TABLES.pushSubscriptions)
          .delete()
          .eq("id", row.id);
      } catch (cleanupErr) {
        console.error("[web-push] failed to remove expired subscription", cleanupErr);
      }
      return "gone";
    }
    console.error("[web-push] send failed", err);
    return "failed";
  }
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string | null },
): Promise<{ sent: number; failed: number }> {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0 };
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    console.error("[web-push] service client unavailable", err);
    return { sent: 0, failed: 0 };
  }

  const { data: rows, error } = await supabase
    .from(MA5_TABLES.pushSubscriptions)
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    console.error("[web-push] load subscriptions", error);
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const result = await sendWebPushToSubscription(
      row as PushSubscriptionRow,
      payload,
    );
    if (result === "sent") sent += 1;
    else if (result === "failed") failed += 1;
  }
  return { sent, failed };
}

/** Delivery adapter: Web Push when VAPID configured; email still deferred. */
export class WebPushDeliveryAdapter implements NotificationDeliveryAdapter {
  async sendEmail(payload: DeliveryPayload): Promise<DeliveryResult> {
    if (!payload.allowExternal) {
      return {
        emailSent: false,
        pushSent: false,
        skippedReason: "user_preference_off",
      };
    }
    console.info(
      "[delivery] email skipped — deferred to Phase 2",
      payload.userId,
    );
    return {
      emailSent: false,
      pushSent: false,
      skippedReason: "no_provider",
    };
  }

  async sendPush(payload: DeliveryPayload): Promise<DeliveryResult> {
    if (!payload.allowExternal) {
      return {
        emailSent: false,
        pushSent: false,
        skippedReason: "user_preference_off",
      };
    }
    if (!isWebPushConfigured()) {
      console.info(
        "[delivery] push skipped — VAPID not configured",
        payload.userId,
      );
      return {
        emailSent: false,
        pushSent: false,
        skippedReason: "no_provider",
      };
    }

    try {
      const { sent, failed } = await sendWebPushToUser(payload.userId, {
        title: payload.title,
        body: payload.body,
        url: payload.actionUrl,
      });
      if (sent === 0 && failed === 0) {
        return {
          emailSent: false,
          pushSent: false,
          skippedReason: "no_subscriptions",
        };
      }
      return {
        emailSent: false,
        pushSent: sent > 0,
        skippedReason: sent === 0 ? "all_failed" : undefined,
      };
    } catch (err) {
      console.error("[delivery] push error (non-blocking)", err);
      return {
        emailSent: false,
        pushSent: false,
        skippedReason: "send_error",
      };
    }
  }
}
