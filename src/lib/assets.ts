/// <reference types="vite/client" />
import versionData from "../version.json";

export const BUILD_VERSION = (import.meta as any).env?.VITE_BUILD_VERSION || versionData.rawVersion || "1.0.33";

export const BASE_ASSET_URL = "https://whisper.runflix.name.ng";

export function getAssetUrl(path: string): string {
  if (!path) {
    return `${BASE_ASSET_URL}/android-chrome-192x192.png?v=${BUILD_VERSION}`;
  }
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    if (path.includes("?v=")) return path;
    return `${path}${path.includes("?") ? "&" : "?"}v=${BUILD_VERSION}`;
  }
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${BASE_ASSET_URL}/${cleanPath}?v=${BUILD_VERSION}`;
}
