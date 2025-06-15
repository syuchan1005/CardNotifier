import { hc, ClientResponse } from 'hono/client';
import useSWR from 'swr';
import type { AppType } from '../server/index'
import useSWRMutation from 'swr/mutation';

export const client = hc<AppType>('/');

export const useHono = <T>(
    key: string | null,
    fetcher: (c: typeof client) => Promise<ClientResponse<T>>,
) => useSWR(
    key,
    () => fetcher(client).then(r => r.json() as Promise<T>),
);

export const useHonoMutation = <T, A>(
    key: string | null,
    fetcher: (c: typeof client, options: { arg: A }) => Promise<ClientResponse<T>>,
    options?: { onSuccess?: () => void },
) => useSWRMutation(
    key,
    (_, options: { arg: A }) => fetcher(client, options).then(r => r.json() as Promise<T>),
    options
);
