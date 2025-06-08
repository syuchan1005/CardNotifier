import { usePush } from '@remix-pwa/push/client';
import { useHono, useHonoMutation } from './fetcher';

export function NotificationButton() {
    const { data, error, isLoading } = useHono(
        '/notification',
        (c) => c.api.notification.$get(),
    );
    const { trigger: postPushSubscription, isMutating: isPosting } = useHonoMutation(
        '/notification$post',
        async (c, { arg }: { arg: PushSubscription }) => {
            const json = arg.toJSON();
            if (!json.endpoint || !json.keys || !json.keys.p256dh || !json.keys.auth) {
                throw new Error('PushSubscription is invalid');
            }
            return c.api.notification.$post({
                json: {
                    endpoint: json.endpoint,
                    expirationTime: json.expirationTime,
                    keys: {
                        p256dh: json.keys.p256dh,
                        auth: json.keys.auth,
                    },
                },
            });
        },
    );

    const { trigger: deletePushSubscription, isMutating: isDeleting } = useHonoMutation(
        '/notification$delete',
        async (c, { arg: endpoint }: { arg: string }) => {
            if (!endpoint) {
                throw new Error('PushSubscription is invalid');
            }
            return c.api.notification.$delete({ json: { endpoint } });
        },
    );

    const { subscribeToPush, unsubscribeFromPush, isSubscribed, pushSubscription } = usePush();

    return (
        <button
            disabled={isLoading || error || isPosting || isDeleting}
            onClick={() => {
                if (isSubscribed) {
                    if (pushSubscription) {
                        deletePushSubscription(pushSubscription.endpoint)
                            .then(() => {
                                unsubscribeFromPush();
                            });
                    }
                } else if (data) {
                    subscribeToPush(data.publicKey, postPushSubscription);
                }
            }}
        >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            {error}
        </button>
    );
}
