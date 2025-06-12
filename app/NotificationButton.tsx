import { usePush } from '@remix-pwa/push/client';
import { useHono, useHonoMutation } from './fetcher';
import { Button } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { useCallback, useState } from 'react';

export function NotificationButton() {
    const { data, isLoading } = useHono(
        '/notification',
        (c) => c.api.notification.$get(),
    );
    const { trigger: postPushSubscription } = useHonoMutation(
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

    const { trigger: deletePushSubscription } = useHonoMutation(
        '/notification$delete',
        async (c, { arg: endpoint }: { arg: string }) => {
            if (!endpoint) {
                throw new Error('PushSubscription is invalid');
            }
            return c.api.notification.$delete({ json: { endpoint } });
        },
    );

    const [isMutating, setIsMutating] = useState(false);
    const { subscribeToPush, unsubscribeFromPush, isSubscribed, pushSubscription } = usePush();
    const handleOnClick = useCallback(() => {
        if (isSubscribed) {
            if (pushSubscription) {
                setIsMutating(true);
                deletePushSubscription(pushSubscription.endpoint)
                    .then(() => new Promise((resolve, reject) => unsubscribeFromPush(() => { resolve(undefined) }, reject)))
                    .finally(() => setIsMutating(false));
            }
        } else if (data) {
            setIsMutating(true);
            new Promise<PushSubscription>((resolve, reject) => subscribeToPush(data.publicKey, resolve, reject))
                .then((subscription) => {
                    if (subscription) {
                        return postPushSubscription(subscription);
                    } 
                })
                .finally(() => setIsMutating(false));
        }
    }, [isSubscribed, pushSubscription, data, postPushSubscription, deletePushSubscription, subscribeToPush, unsubscribeFromPush, setIsMutating]);

    return (
        <Button
            loading={isLoading || isMutating}
            onClick={handleOnClick}
            variant="contained"
            startIcon={isSubscribed ? <NotificationsOffIcon /> : <NotificationsIcon />}
        >
            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
        </Button>
    );
}
