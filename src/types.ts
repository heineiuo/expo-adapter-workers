export type RouteInfo<TRegex = string> = {
  file: string;
  module: Promise<any>;
  page: string;
  namedRegex: TRegex;
  routeKeys: {
    [named: string]: string;
  };
};
export type ExpoRoutesManifestV1<TRegex = string> = {
  apiRoutes: RouteInfo<TRegex>[];
  htmlRoutes: RouteInfo<TRegex>[];
  notFoundRoutes: RouteInfo<TRegex>[];
};

export type ExpoRouterServerManifestV1Route<TRegex = string> = {
  page: string;
  routeKeys: Record<string, string>;
  namedRegex: TRegex;
  generated?: boolean;
};

export type ExpoRouterServerManifestV1FunctionRoute =
  ExpoRouterServerManifestV1Route<RegExp>;

export declare function createRoutesManifest(
  paths: string[]
): ExpoRoutesManifestV1 | null;
