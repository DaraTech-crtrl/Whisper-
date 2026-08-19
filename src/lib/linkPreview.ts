/**
 * Link Preview utilities and client-side metadata caching
 */

export interface LinkPreviewData {
  url: string;
  title: string;
  favicon: string;
  description?: string;
  image?: string;
  domain: string;
  siteName?: string;
}

// In-memory client cache
const clientCache = new Map<string, LinkPreviewData>();

/**
 * Extracts all valid HTTP/HTTPS URLs from raw text
 */
export function extractUrls(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  
  // Robust URL regex matching http:// and https:// URLs
  const urlRegex = /(https?:\/\/[^\s<>"'{}|\\^`]+)/gi;
  const matches = text.match(urlRegex) || [];
  
  // Clean up trailing punctuation often attached when users type URLs
  const cleanedUrls: string[] = [];
  
  for (const rawUrl of matches) {
    let clean = rawUrl;
    // Strip trailing periods, commas, colons, semicolons, brackets, quotes
    clean = clean.replace(/[.,;:!?)>"'\]]+$/, "");
    
    try {
      const parsed = new URL(clean);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        if (!cleanedUrls.includes(clean)) {
          cleanedUrls.push(clean);
        }
      }
    } catch {
      // Invalid URL format, ignore
    }
  }
  
  return cleanedUrls;
}

/**
 * Clean domain helper
 */
export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Fallback favicon URL generator using Google Favicon API
 */
export function getGoogleFaviconUrl(domainOrUrl: string, size = 128): string {
  const domain = domainOrUrl.startsWith("http") ? getDomainFromUrl(domainOrUrl) : domainOrUrl;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
}

/**
 * Fetches page title and favicon metadata from our backend scraper endpoint
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  const normalizedUrl = url.trim();
  
  // 1. Check in-memory cache
  if (clientCache.has(normalizedUrl)) {
    return clientCache.get(normalizedUrl)!;
  }

  // 2. Check sessionStorage
  const sessionKey = `link_preview_${normalizedUrl}`;
  try {
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) {
      const parsed = JSON.parse(cached) as LinkPreviewData;
      clientCache.set(normalizedUrl, parsed);
      return parsed;
    }
  } catch {
    // sessionStorage error or full, ignore
  }

  const domain = getDomainFromUrl(normalizedUrl);
  const fallbackData: LinkPreviewData = {
    url: normalizedUrl,
    title: domain,
    domain: domain,
    favicon: getGoogleFaviconUrl(domain),
  };

  try {
    const response = await fetch(`/api/link-preview?url=${encodeURIComponent(normalizedUrl)}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Scraper returned ${response.status}`);
    }

    const data = await response.json();
    const result: LinkPreviewData = {
      url: data.url || normalizedUrl,
      title: data.title || domain,
      favicon: data.favicon || getGoogleFaviconUrl(domain),
      description: data.description || "",
      image: data.image || "",
      domain: data.domain || domain,
      siteName: data.siteName || domain,
    };

    // Store in cache
    clientCache.set(normalizedUrl, result);
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(result));
    } catch {
      // ignore
    }

    return result;
  } catch (err) {
    console.warn(`[LinkPreview] Failed to fetch metadata for ${normalizedUrl}, using fallback:`, err);
    clientCache.set(normalizedUrl, fallbackData);
    return fallbackData;
  }
}
