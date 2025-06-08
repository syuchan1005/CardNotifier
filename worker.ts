import * as build from './build/server'
import server from './server/index'

/// Copied from `import handle from 'hono-remix-adapter/cloudflare-workers'`
// src/handlers/cloudflare-workers.ts
import { Hono } from "hono";

// src/middleware.ts
import { createRequestHandler } from "@remix-run/cloudflare";
import { createMiddleware } from "hono/factory";

// src/remix.ts
const defaultGetLoadContext = ({ context }) => {
    return {
        ...context
    };
};
const createGetLoadContextArgs = (c) => {
    return {
        context: {
            cloudflare: {
                env: c.env,
                cf: c.req.raw.cf,
                ctx: c.executionCtx,
                // @ts-expect-error globalThis.caches is not typed
                caches: globalThis.caches ? caches : void 0
            },
            hono: {
                context: c
            }
        },
        request: c.req.raw
    };
};

// src/middleware.ts
const remix = ({ mode, build, getLoadContext }) => {
    return createMiddleware(async (c) => {
        const requestHandler = createRequestHandler(build, mode);
        const args = createGetLoadContextArgs(c);
        const loadContext = getLoadContext(args);
        return await requestHandler(
            c.req.raw,
            loadContext instanceof Promise ? await loadContext : loadContext
        );
    });
};

/// Modified. To support other cloudflare functions.
// src/handlers/cloudflare-workers.ts
const handler = (serverBuild, userApp, options) => {
    const app = new Hono();
    if (userApp) {
        app.route("/", userApp);
    }
    app.use(async (c, next) => {
        return remix({
            build: serverBuild,
            mode: "production",
            getLoadContext: options?.getLoadContext ?? defaultGetLoadContext
        })(c, next);
    });
    return {
        ...userApp,
        fetch: app.fetch,
    };
};
/// end of copied code


export default handler(build, server, undefined);
