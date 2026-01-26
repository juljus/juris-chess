import webpush from "web-push";
import { prisma } from "./db";

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:juris.putrins@gmail.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface NotificationPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

export async function sendPushNotification(
  email: string,
  payload: NotificationPayload
): Promise<{ success: number; failed: number }> {
  // Find all subscriptions for this email
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { email: email.toLowerCase() },
  });

  if (subscriptions.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        JSON.stringify(payload)
      );
      success++;
    } catch (error: unknown) {
      failed++;
      // If subscription is expired or invalid, remove it
      const webPushError = error as { statusCode?: number };
      if (webPushError.statusCode === 404 || webPushError.statusCode === 410) {
        await prisma.pushSubscription.delete({
          where: { id: sub.id },
        });
      }
    }
  }

  return { success, failed };
}

export async function sendPushToEmails(
  emails: string[],
  payload: NotificationPayload
): Promise<{ success: number; failed: number }> {
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const email of emails) {
    const result = await sendPushNotification(email, payload);
    totalSuccess += result.success;
    totalFailed += result.failed;
  }

  return { success: totalSuccess, failed: totalFailed };
}
