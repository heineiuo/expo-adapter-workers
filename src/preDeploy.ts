import fs from "fs/promises";
import path from "path";
import replaceInFile from "replace-in-file";
import findNodeModule from "find-node-modules";

const __dirname = path.dirname(new URL(import.meta.url).pathname);

async function regenerate(distDir: string) {
  const routesManifest = await import(`${distDir}/_expo/routes.json`, {
    assert: { type: "json" },
  });

  const relativeDistDir = path.relative(__dirname, distDir)

  const apiRoutes = routesManifest.default.apiRoutes
    .map((route: any) => {
      return `{
      file: "${route.file}",
      page: "${route.page}",
      namedRegex: new RegExp("${route.namedRegex}"),
      routeKeys: ${JSON.stringify(route.routeKeys)},
      module: import("${relativeDistDir}/${route.file}")
    }`;
    })
    .join(",");

  const htmlRoutes = routesManifest.default.htmlRoutes
    .map((route: any) => {
      return `{
      file: "${route.file}",
      page: "${route.page}",
      namedRegex: new RegExp("${route.namedRegex}"),
      routeKeys: ${JSON.stringify(route.routeKeys)},
      generated: ${route.generated ?? false},
      "module": import("${`${relativeDistDir}/${route.page.slice(2)}.html`}")
    }`;
    })
    .join(",");
  const notFoundRoutes = routesManifest.default.notFoundRoutes
    .map((route: any) => {
      return `{
      file: "${route.file}",
      page: "${route.page}",
      namedRegex: new RegExp("${route.namedRegex}"),
      routeKeys: ${JSON.stringify(route.routeKeys)},
      module: import("${`${relativeDistDir}/${route.page.slice(2)}.html`}")
    }`;
    })
    .join(",");

  const regenerated = `export const routesManifest = {
  "apiRoutes": [
    ${apiRoutes}
  ],
  "htmlRoutes": [
    ${htmlRoutes}
  ],
  "notFoundRoutes": [
    ${notFoundRoutes}
  ]
}`;

  await fs.writeFile(path.resolve(__dirname, "./generated.js"), regenerated);
}

async function refactorAssetsNodeModule(distPath: string): Promise<void> {
  await replaceInFile({
    files: [`${distPath}/**/*`],
    from: /\/assets\/node_modules\//g,
    to: "/assets/node-modules/",
  });

  try {
    await fs.rename(
      path.resolve(distPath, "./client/assets/node_modules"),
      path.resolve(distPath, "./client/assets/node-modules")
    );
  } catch (e) {}
}

const nodeModulesPath = findNodeModule({ relative: false })[0];

const projectPath = nodeModulesPath.slice(0, -"node_modules".length);

const distPath = path.resolve(projectPath, "./dist");
const distServerPath = path.resolve(distPath, "./server");

/**
 * to fix node_modules is restricted to upload to cloudflare 
 * https://github.com/cloudflare/workers-sdk/pull/4710#issuecomment-1885243307
 */
await refactorAssetsNodeModule(distPath);

await regenerate(distServerPath);
