import webpush from "web-push";
import { storage } from "./storage";
import { log } from "./index";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:aura@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string }) {
  const subscriptions = await storage.getPushSubscriptions(userId);
  if (subscriptions.length === 0) return;

  const data = JSON.stringify(payload);

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        data
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await storage.removePushSubscription(sub.endpoint);
        log(`Removed expired push subscription for user ${userId}`, "push");
      } else {
        log(`Push notification error for user ${userId}: ${err.message}`, "push");
      }
    }
  }
}
