/**
 * Production-ready server-side metadata scraper for Link Previews
 * Fetches page title, favicon, description, domain, and OG metadata safely.
 */

export interface ScrapedLinkMetadata {
  url: string;
  title: string;
  favicon: string;
  description?: string;
  image?: string;
  domain: string;
  siteName?: string;
}

// In-memory cache with 2-hour TTL
interface CacheEntry {
  data: ScrapedLinkMetadata;
  expiresAt: number;
}

const scraperCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CACHE_ENTRIES = 1000;

/**
 * Checks if a hostname resolves to a private or internal IP range to prevent SSRF
 */
export function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().trim();

  if (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "0.0.0.0" ||
    lower === "::1" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost")
  ) {
    return true;
  }

  // Check IPv4 private ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lower.match(ipv4Regex);
  if (match) {
    const [, o1, o2] = match.map(Number);
    // 10.0.0.0/8
    if (o1 === 10) return true;
    // 172.16.0.0/12
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
    // 192.168.0.0/16
    if (o1 === 192 && o2 === 168) return true;
    // 169.254.0.0/16 (link-local, cloud metadata)
    if (o1 === 169 && o2 === 254) return true;
    // 127.0.0.0/8
    if (o1 === 127) return true;
    // 0.0.0.0/8
    if (o1 === 0) return true;
  }

  return false;
}

/**
 * Unescapes HTML entities in title/description
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves relative URLs to absolute
 */
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Scrapes metadata from target URL
 */
export async function scrapeLinkMetadata(rawUrl: string): Promise<ScrapedLinkMetadata> {
  const normalized = rawUrl.trim();
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(normalized);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Only http and https protocols are allowed");
  }

  const hostname = parsedUrl.hostname;
  const domain = hostname.replace(/^www\./i, "");

  if (isPrivateOrLocalHost(hostname)) {
    throw new Error("Access to local or private network addresses is forbidden");
  }

  // 1. Check cache
  const cached = scraperCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
  const defaultResult: ScrapedLinkMetadata = {
    url: normalized,
    title: domain,
    domain: domain,
    favicon: fallbackFavicon,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    const response = await fetch(normalized, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; WhisperBot/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Return clean fallback on non-200 responses
      return defaultResult;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      return defaultResult;
    }

    // Read only up to 150KB of HTML to keep scraping fast and memory light
    const htmlText = await response.text();
    const headSlice = htmlText.slice(0, 150000);

    // Extract Title: OG -> Twitter -> <title>
    let title = "";
    const ogTitleMatch = headSlice.match(/<meta\s+[^>]*property=["']og:title["']\s+[^>]*content=["']([^"']+)["']/i) ||
                        headSlice.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:title["']/i);
    const twitterTitleMatch = headSlice.match(/<meta\s+[^>]*name=["']twitter:title["']\s+[^>]*content=["']([^"']+)["']/i) ||
                             headSlice.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*name=["']twitter:title["']/i);
    const htmlTitleMatch = headSlice.match(/<title[^>]*>([^<]+)<\/title>/i);

    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1];
    } else if (twitterTitleMatch && twitterTitleMatch[1]) {
      title = twitterTitleMatch[1];
    } else if (htmlTitleMatch && htmlTitleMatch[1]) {
      title = htmlTitleMatch[1];
    }

    title = decodeHtmlEntities(title) || domain;

    // Extract Description: OG -> Meta description -> Twitter
    let description = "";
    const ogDescMatch = headSlice.match(/<meta\s+[^>]*property=["']og:description["']\s+[^>]*content=["']([^"']+)["']/i) ||
                        headSlice.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:description["']/i);
    const metaDescMatch = headSlice.match(/<meta\s+[^>]*name=["']description["']\s+[^>]*content=["']([^"']+)["']/i) ||
                         headSlice.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*name=["']description["']/i);
    const twitterDescMatch = headSlice.match(/<meta\s+[^>]*name=["']twitter:description["']\s+[^>]*content=["']([^"']+)["']/i);

    if (ogDescMatch && ogDescMatch[1]) {
      description = ogDescMatch[1];
    } else if (metaDescMatch && metaDescMatch[1]) {
      description = metaDescMatch[1];
    } else if (twitterDescMatch && twitterDescMatch[1]) {
      description = twitterDescMatch[1];
    }

    description = decodeHtmlEntities(description);

    // Extract Favicon
    let favicon = "";
    const appleTouchIconMatch = headSlice.match(/<link\s+[^>]*rel=["']apple-touch-icon(?:-precomposed)?["']\s+[^>]*href=["']([^"']+)["']/i) ||
                                headSlice.match(/<link\s+[^>]*href=["']([^"']+)["']\s+[^>]*rel=["']apple-touch-icon(?:-precomposed)?["']/i);
    const iconMatch = headSlice.match(/<link\s+[^>]*rel=["'](?:shortcut\s+)?icon["']\s+[^>]*href=["']([^"']+)["']/i) ||
                      headSlice.match(/<link\s+[^>]*href=["']([^"']+)["']\s+[^>]*rel=["'](?:shortcut\s+)?icon["']/i);

    if (appleTouchIconMatch && appleTouchIconMatch[1]) {
      favicon = resolveUrl(appleTouchIconMatch[1], response.url || normalized);
    } else if (iconMatch && iconMatch[1]) {
      favicon = resolveUrl(iconMatch[1], response.url || normalized);
    } else {
      favicon = fallbackFavicon;
    }

    // Extract OG Image
    let image = "";
    const ogImageMatch = headSlice.match(/<meta\s+[^>]*property=["']og:image(?::secure_url)?["']\s+[^>]*content=["']([^"']+)["']/i) ||
                         headSlice.match(/<meta\s+[^>]*content=["']([^"']+)["']\s+[^>]*property=["']og:image(?::secure_url)?["']/i);
    const twitterImageMatch = headSlice.match(/<meta\s+[^>]*name=["']twitter:image["']\s+[^>]*content=["']([^"']+)["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      image = resolveUrl(ogImageMatch[1], response.url || normalized);
    } else if (twitterImageMatch && twitterImageMatch[1]) {
      image = resolveUrl(twitterImageMatch[1], response.url || normalized);
    }

    // Extract Site Name
    let siteName = domain;
    const ogSiteNameMatch = headSlice.match(/<meta\s+[^>]*property=["']og:site_name["']\s+[^>]*content=["']([^"']+)["']/i);
    if (ogSiteNameMatch && ogSiteNameMatch[1]) {
      siteName = decodeHtmlEntities(ogSiteNameMatch[1]);
    }

    const finalData: ScrapedLinkMetadata = {
      url: response.url || normalized,
      title: title || domain,
      favicon: favicon || fallbackFavicon,
      description: description || undefined,
      image: image || undefined,
      domain: domain,
      siteName: siteName,
    };

    // Save in cache
    if (scraperCache.size > MAX_CACHE_ENTRIES) {
      scraperCache.clear();
    }
    scraperCache.set(normalized, {
      data: finalData,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return finalData;
  } catch (err: any) {
    console.warn(`[Scraper Warning] Failed to scrape ${normalized}:`, err.message || err);
    return defaultResult;
  }
}
