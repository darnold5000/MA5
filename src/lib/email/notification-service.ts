/**
 * Future: unified outbound notifications (email, SMS, push, in-app).
 *
 * Example (not implemented):
 *   await notificationService.send({
 *     type: "booking-confirmed",
 *     tenantId,
 *     userId,
 *     channels: ["email", "push"],
 *   });
 *
 * Phase 1: use {@link EmailService} for auth and transactional email.
 * Phase 2+: register handlers per `type` that may call EmailService, web push, etc.
 */
export type NotificationService = {
  send(request: {
    type: string;
    tenantId: string;
    userId?: string;
    channels?: ("email" | "sms" | "push" | "in_app")[];
    payload?: Record<string, unknown>;
  }): Promise<void>;
};
