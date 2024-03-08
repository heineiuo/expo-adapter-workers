import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
import { routesManifest } from "./generated.js";
import { ExpoRouterServerManifestV1FunctionRoute, RouteInfo } from "./types.js";
// @ts-ignore
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);

function createAssetHandler() {
  return async (request: Request, env: any, ctx: { waitUntil: any }) => {
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx),
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
        }
      );
    } catch (e) {
      return null;
    }
  };
}

export function createRequestHandler({
  logApiRouteExecutionError = (error: Error) => {
    console.error("logApiRouteExecutionError", error);
  },
}: {
  logApiRouteExecutionError?: (error: Error) => void;
} = {}) {
  const assetsHandler = createAssetHandler();
  const getHtml = async (request: Request, route: RouteInfo<RegExp>) => {
    return (await route.module).default;
  };
  const getApiRoute = async (route: RouteInfo<RegExp>) => {
    return (await route.module).default;
  };

  function updateRequestWithConfig(
    request: Request,
    config: ExpoRouterServerManifestV1FunctionRoute
  ) {
    const params: Record<string, string> = {};
    const url = new URL(request.url);
    const match = config.namedRegex.exec(url.pathname);
    if (match?.groups) {
      for (const [key, value] of Object.entries(match.groups)) {
        const namedKey = config.routeKeys[key];
        params[namedKey] = value;
      }
    }

    return params;
  }

  return async function handler(
    request: Request,
    env: any,
    ctx: any
  ): Promise<Response> {
    const asset = await assetsHandler(request, env, ctx);
    if (asset) {
      return asset;
    }

    const url = new URL(request.url, "http://expo.dev");

    const sanitizedPathname = url.pathname;

    if (request.method === "GET" || request.method === "HEAD") {
      // First test static routes
      for (const route of routesManifest.htmlRoutes) {
        if (!route.namedRegex.test(sanitizedPathname)) {
          continue;
        }

        // // Mutate to add the expoUrl object.
        updateRequestWithConfig(request, route);

        // serve a static file
        const contents = await getHtml(request, route);

        // TODO: What's the standard behavior for malformed projects?
        if (!contents) {
          return new Response("Not found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
            },
          });
        } else if (contents instanceof Response) {
          return contents;
        }

        return new Response(contents, {
          status: 200,
          headers: {
            "Content-Type": "text/html",
          },
        });
      }
    }

    // Next, test API routes
    for (const route of routesManifest.apiRoutes) {
      if (!route.namedRegex.test(sanitizedPathname)) {
        continue;
      }

      const func = await getApiRoute(route);

      if (func instanceof Response) {
        return func;
      }

      const routeHandler = func?.[request.method];
      if (!routeHandler) {
        return new Response("Method not allowed", {
          status: 405,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }

      // Mutate to add the expoUrl object.
      const params = updateRequestWithConfig(request, route);

      try {
        // TODO: Handle undefined
        return (await routeHandler(request, params)) as Response;
      } catch (error) {
        if (error instanceof Error) {
          logApiRouteExecutionError(error);
        }

        return new Response("Internal server error", {
          status: 500,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }
    }

    // Finally, test 404 routes
    for (const route of routesManifest.notFoundRoutes) {
      if (!route.namedRegex.test(sanitizedPathname)) {
        continue;
      }

      // // Mutate to add the expoUrl object.
      updateRequestWithConfig(request, route);

      // serve a static file
      const contents = await getHtml(request, route);

      // TODO: What's the standard behavior for malformed projects?
      if (!contents) {
        return new Response("Not found", {
          status: 404,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      } else if (contents instanceof Response) {
        return contents;
      }

      return new Response(contents, {
        status: 404,
        headers: {
          "Content-Type": "text/html",
        },
      });
    }

    // 404
    const response = new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
      },
    });
    return response;
  };
}
