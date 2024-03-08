# expo-adapter-workers

[Expo Router with API Routes](https://docs.expo.dev/router/reference/api-routes/#deployment) is insane! However Cloudflare Workers is not supported by Expo team yet. So this adapter comes!

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