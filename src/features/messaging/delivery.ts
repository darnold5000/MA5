/**
 * External notification delivery adapter.
 * Phase 1: in-app only. Email/SMS/advanced push — see docs/COMMUNICATION_PHASE2_DEFERRED.md
 */

export type DeliveryPayload = {
  userId: string;
  email?: string | null;
  title: string;
  body: string;
  actionUrl?: string | null;
  /** Profile toggle: notify_coach_messages */
  allowExternal: boolean;
};

export type DeliveryResult = {
  emailSent: boolean;
  pushSent: boolean;
  skippedReason?: string;
};

export interface NotificationDeliveryAdapter {
  sendEmail(payload: DeliveryPayload): Promise<DeliveryResult>;
  sendPush(payload: DeliveryPayload): Promise<DeliveryResult>;
}

/** No-provider fallback — never throws; logs and returns skipped. */
export class NoopDeliveryAdapter implements NotificationDeliveryAdapter {
  async sendEmail(payload: DeliveryPayload): Promise<DeliveryResult> {
    if (!payload.allowExternal) {
      return {
        emailSent: false,
        pushSent: false,
        skippedReason: "user_preference_off",
      };
    }
    console.info(
      "[delivery] email skipped — no provider configured",
      payload.userId,
      payload.title,
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
    console.info(
      "[delivery] push skipped — no provider configured",
      payload.userId,
      payload.title,
    );
    return {
      emailSent: false,
      pushSent: false,
      skippedReason: "no_provider",
    };
  }
}

let adapter: NotificationDeliveryAdapter = new NoopDeliveryAdapter();

export function getDeliveryAdapter(): NotificationDeliveryAdapter {
  return adapter;
}

/** Tests / future provider wiring only — never call from client components. */
export function setDeliveryAdapter(next: NotificationDeliveryAdapter) {
  adapter = next;
}

/**
 * Fire-and-forget external delivery. Failures must never block message creation.
 */
export async function deliverExternalSafely(
  payload: DeliveryPayload,
): Promise<void> {
  try {
    const d = getDeliveryAdapter();
    await Promise.all([d.sendEmail(payload), d.sendPush(payload)]);
  } catch (err) {
    console.error("[delivery] external delivery failed (non-blocking)", err);
  }
}
