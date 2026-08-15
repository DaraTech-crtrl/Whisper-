export const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || Date.now().toString();

export const BASE_ASSET_URL = 'https://whisper.runflix.name.ng';

export function getAssetUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_ASSET_URL}${cleanPath}?v=${BUILD_VERSION}`;
}
