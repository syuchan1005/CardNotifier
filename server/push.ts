import {
    NotificationObject,
    VapidDetails,
    PushSubscription,
} from '@remix-pwa/push';
import {
  buildPushPayload,
  type PushSubscription as _PushSubscription,
  type PushMessage,
  type VapidKeys,
} from '@block65/webcrypto-web-push';

export const sendNotification = async (env: Env, data: { subscriptions: PushSubscription[], notification: NotificationObject }): Promise<void> => {
    const { subscriptions, notification } = data;
    const vapidDetails: VapidDetails = {
        publicKey: env.WEB_PUSH_PUBLIC_KEY,
        privateKey: env.WEB_PUSH_PRIVATE_KEY,
    };
    await sendNotifications({ subscriptions, vapidDetails, notification });
};

const sendNotifications = ({
    notification,
    subscriptions,
    vapidDetails
}: {
    notification: NotificationObject;
    subscriptions: PushSubscription[];
    vapidDetails: VapidDetails;
}) => {
    const vapid: VapidKeys = {
        publicKey: vapidDetails.publicKey,
        privateKey: vapidDetails.privateKey,
        subject: vapidDetails.subject || 'mailto:user@example.org',
    };
    const message: PushMessage = { data: JSON.stringify(notification) };
    return Promise.allSettled(
        subscriptions.map(async (subscription) => {
            const s: _PushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
                expirationTime: null,
            };
            const payload = await buildPushPayload(message, s, vapid);
            const res = await fetch(subscription.endpoint, payload);
            if (!res.ok) {
                throw new Error(`Failed to send notification: ${res.status} ${await res.text()}`);
            }
            return {
                statusCode: res.status,
                body: await res.text(),
                headers: Object.fromEntries(res.headers.entries()),
            };
        })
    );
};
