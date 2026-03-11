# expo-adapter-workers

> **Note:** As of Expo SDK 54, the Expo team officially supports deploying Expo Router apps to Cloudflare Workers via [EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/) and the [`expo-server`](https://docs.expo.dev/versions/latest/sdk/server/) package. See the [comparison below](#expo-adapter-workers-vs-eas-hosting) to decide which approach fits your needs.

[Expo Router with API Routes](https://docs.expo.dev/router/reference/api-routes/#deployment) is insane! However Cloudflare Workers is not supported by the Expo team in older SDK versions. So this adapter comes!

## Precondition

Your project is using `expo-router` with **API Routes**.

In `app.json`, you should have configuration like this:

```json
{
  "expo": {
    "web": {
      "bundler": "metro",
      "output": "server"
    }
  }
}
```

## Usage

#### Step 1: Install

```
npm install expo-adapter-workers wrangler
```

#### Step 2: Run expo export

```
npx expo export -p web
```

#### Step 3: Create entry file for cloudflare workers

`worker.ts`

```ts
import { createRequestHandler } from "expo-adapter-workers";

const requestHandler = createRequestHandler();

export default {
  async fetch(request: Request, env: any, ctx: { waitUntil: any }) {
    try {
      return await requestHandler(request, env, ctx);
    } catch (e) {
      let pathname = new URL(request.url).pathname;
      return new Response(`"${pathname}" not found`, {
        status: 404,
        statusText: "not found",
      });
    }
  },
};
```

#### Step 4: Create wrangler.toml

`wrangler.toml`

```
name = "example"
main = "worker.ts"

compatibility_date = "2024-03-08"

[site]
bucket = "./dist/client"
```

#### Step 5: Deploy to cloudflare workers

```
npx expo-adapter-workers // This is required!!!
npx wrangler deploy
```


## License

MIT

---

## expo-adapter-workers vs EAS Hosting

Both approaches run your Expo Router app on Cloudflare Workers, but they differ in who manages the infrastructure.

### EAS Hosting (Official, Expo-managed)

[EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/) is Expo's managed hosting service, introduced alongside [`expo-server`](https://docs.expo.dev/versions/latest/sdk/server/) in SDK 54. It is built on Cloudflare Workers under the hood.

**Benefits:**
- One-command deployment with `eas deploy` — no Wrangler configuration needed.
- Integrated with the Expo CLI, dashboard, and CI/CD workflows.
- Built-in observability: logs, crash reports, and metrics in the Expo dashboard.
- Managed SSL, global CDN, and automatic routing.
- Full support for `expo-server` APIs (task scheduling, `StatusError`, environment helpers, etc.).

**Limitations:**
- You deploy to Expo's infrastructure (not your own Cloudflare account).
- Less control over Workers configuration, bindings, or custom Cloudflare features.
- Subject to EAS Hosting plan limits and pricing.

**Best for:** Projects that want a simple, fully-managed deployment and are comfortable in the Expo ecosystem.

---

### expo-adapter-workers (This package, self-hosted)

This package lets you deploy the same Expo Router export to **your own Cloudflare Workers account** using Wrangler.

**Benefits:**
- Full control over your Cloudflare account, Workers settings, KV namespaces, D1 databases, R2 buckets, and other Cloudflare bindings.
- No dependency on Expo's infrastructure or pricing.
- Works with any Cloudflare plan, including the generous free tier.
- Integrates with your existing Cloudflare deployment pipeline.

**Limitations:**
- Requires manual Wrangler configuration (`wrangler.toml`).
- Does not include the managed observability features of EAS Hosting.
- Must run `npx expo-adapter-workers` before each deploy to patch the build output.

**Best for:** Projects that need custom Cloudflare bindings, want to avoid vendor lock-in to Expo's infrastructure, or already manage other services on Cloudflare.

---

### Quick comparison

| Feature | EAS Hosting | expo-adapter-workers |
|---|---|---|
| Deployment command | `eas deploy` | `npx wrangler deploy` |
| Infrastructure owner | Expo (on Cloudflare) | Your Cloudflare account |
| Wrangler config needed | No | Yes |
| Built-in logs & metrics | Yes (Expo dashboard) | No (use Cloudflare dashboard) |
| Custom Cloudflare bindings | No | Yes |
| `expo-server` API support | Full | Partial (basic fetch/response) |
| Free tier | EAS Hosting free tier | Cloudflare Workers free tier |
| Vendor lock-in | Expo | Cloudflare |