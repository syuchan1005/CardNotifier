import { usePush } from '@remix-pwa/push/client';
import { useHono, useHonoMutation } from './fetcher';

export function NotificationButton() {
    const { data, error, isLoading } = useHono(
        '/notification',
        (c) => c.notification.$get(),
    );
    const { trigger, isMutating } = useHonoMutation(
        '/notification$post',
        async (c, { arg }: { arg: PushSubscription }) => {
            const json = arg.toJSON();
            if (!json.endpoint || !json.keys || !json.keys.p256dh || !json.keys.auth) {
                throw new Error('PushSubscription is invalid');
            }
            return c.notification.$post({
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

    const { subscribeToPush, unsubscribeFromPush, isSubscribed } = usePush();

    return (
        <button
            disabled={isLoading || error || isMutating}
            onClick={() => {
                if (isSubscribed) {
                    unsubscribeFromPush();
                } else if (data) {
                    subscribeToPush(data.publicKey, trigger);
                }
            }}
        >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            {error}
        </button>
    );
}
