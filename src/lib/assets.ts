/// <reference types="vite/client" />

export const BUILD_VERSION = (import.meta as any).env?.VITE_BUILD_VERSION || '1.0.0';

export const BASE_ASSET_URL = 'https://whisper.runflix.name.ng';

export function getAssetUrl(path: string): string {
  if (!path) return `/android-chrome-192x192.png?v=${BUILD_VERSION}`;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `/${cleanPath}?v=${BUILD_VERSION}`;
}


