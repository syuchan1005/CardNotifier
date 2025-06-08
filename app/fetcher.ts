import { hc, ClientResponse } from 'hono/client';
import useSWR from 'swr';
import type { AppType } from '../server/index'
import useSWRMutation from 'swr/mutation';

export const client = hc<AppType>('/');

export const useHono = <T>(
    key: string,
    fetcher: (c: typeof client) => Promise<ClientResponse<T>>,
) => useSWR(
    key,
    () => fetcher(client).then(r => r.json() as Promise<T>),
);

export const useHonoMutation = <T, A>(
    key: string,
    fetcher: (c: typeof client, options: { arg: A }) => Promise<ClientResponse<T>>,
) => useSWRMutation(
    key,
    async (_, options: { arg: A }) => {
        const response = await fetcher(client, options);
        return response.json() as Promise<T>;
    },
);
