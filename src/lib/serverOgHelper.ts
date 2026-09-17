import sharp from "sharp";

interface CachedUser {
  data: any;
  timestamp: number;
}

interface CachedImage {
  buffer: Buffer;
  timestamp: number;
}

const userCache = new Map<string, CachedUser>();
const imageCache = new Map<string, CachedImage>();
const USER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const IMAGE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyB-cR-cie_PPzsD3YE3qQRRGJuOwUXhPmw";
const FIREBASE_PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "whisperanonnymous";

function escapeXml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Fetch public user profile from Firestore via high-speed REST API with in-memory caching
 */
export async function getPublicUserProfile(username: string): Promise<any> {
  const cleanUsername = (username || "").trim();
  if (!cleanUsername) return null;

  const cacheKey = cleanUsername.toLowerCase();
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_API_KEY}`;
    
    // First query exact username
    const bodyExact = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "username" },
            op: "EQUAL",
            value: { stringValue: cleanUsername }
          }
        },
        limit: 1
      }
    };

    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyExact)
    });

    let results = await response.json();
    let doc = Array.isArray(results) && results[0] && results[0].document ? results[0].document : null;

    // If not found, fallback to lowercase query
    if (!doc && cleanUsername !== cleanUsername.toLowerCase()) {
      const bodyLower = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "username" },
              op: "EQUAL",
              value: { stringValue: cleanUsername.toLowerCase() }
            }
          },
          limit: 1
        }
      };

      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyLower)
      });
      results = await response.json();
      doc = Array.isArray(results) && results[0] && results[0].document ? results[0].document : null;
    }

    if (!doc || !doc.fields) {
      userCache.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }

    const fields = doc.fields;
    const profile = {
      uid: fields.uid?.stringValue || "",
      username: fields.username?.stringValue || cleanUsername,
      displayName: fields.displayName?.stringValue || fields.username?.stringValue || cleanUsername,
      bio: fields.bio?.stringValue || "",
      photoURL: fields.photoURL?.stringValue || fields.avatarUrl?.stringValue || "",
      avatarUrl: fields.avatarUrl?.stringValue || fields.photoURL?.stringValue || "",
      theme: fields.theme?.stringValue || "default",
      allowTimeCapsule: fields.allowTimeCapsule?.booleanValue || false
    };

    userCache.set(cacheKey, { data: profile, timestamp: Date.now() });
    return profile;
  } catch (err: any) {
    console.error("[getPublicUserProfile Error]:", err.message || err);
    return null;
  }
}

/**
 * Generate a high-resolution 1200x630 OpenGraph social preview card image (PNG)
 */
export async function generateOgImageBuffer(username: string, profile: any, modeName: string = "Whisper"): Promise<Buffer> {
  const cacheKey = (username || "user").toLowerCase();
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < IMAGE_CACHE_TTL) {
    return cached.buffer;
  }

  const displayName = profile?.displayName || username || "User";
  const handle = profile?.username || username || "user";
  const bio = profile?.bio ? profile.bio.trim() : "";
  const photoUrl = profile?.photoURL || profile?.avatarUrl || "";

  // Attempt to fetch & process avatar image
  let avatarBase64 = "";
  if (photoUrl && (photoUrl.startsWith("http://") || photoUrl.startsWith("https://"))) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const imgRes = await fetch(photoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (imgRes.ok) {
        const rawBuf = Buffer.from(await imgRes.arrayBuffer());
        const resized = await sharp(rawBuf)
          .resize(220, 220, { fit: "cover" })
          .png()
          .toBuffer();
        avatarBase64 = `data:image/png;base64,${resized.toString("base64")}`;
      }
    } catch (e: any) {
      console.warn(`[OG Image] Could not load avatar for ${username}:`, e.message);
    }
  }

  const initialChar = escapeXml((displayName || handle || "W").charAt(0).toUpperCase());
  const safeDisplayName = escapeXml(displayName.length > 30 ? displayName.slice(0, 30) + "…" : displayName);
  const safeHandle = escapeXml(`@${handle}`);
  const safeMode = escapeXml(modeName || "Whisper");
  const promptText = escapeXml(bio ? (bio.length > 70 ? bio.slice(0, 70) + "…" : bio) : "Send me an anonymous whisper or secret message...");

  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradient -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#070b14" />
        <stop offset="45%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>

      <!-- Button Gradient -->
      <linearGradient id="btnGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#6366f1" />
        <stop offset="50%" stop-color="#7c3aed" />
        <stop offset="100%" stop-color="#4f46e5" />
      </linearGradient>

      <!-- Glow radial -->
      <radialGradient id="glowAura" cx="50%" cy="35%" r="45%">
        <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
        <stop offset="100%" stop-color="#6366f1" stop-opacity="0" />
      </radialGradient>

      <!-- Avatar Clip Path -->
      <clipPath id="avatarClip">
        <circle cx="600" cy="180" r="82" />
      </clipPath>

      <!-- Avatar Gradient Fallback -->
      <linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f46e5" />
        <stop offset="100%" stop-color="#7c3aed" />
      </linearGradient>

      <!-- Subtle Card Shadow / Border -->
      <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#818cf8" stop-opacity="0.6" />
        <stop offset="100%" stop-color="#a855f7" stop-opacity="0.2" />
      </linearGradient>
    </defs>

    <!-- Canvas Background -->
    <rect width="1200" height="630" fill="url(#bgGrad)" />
    <circle cx="600" cy="220" r="320" fill="url(#glowAura)" />

    <!-- Top Left Branding -->
    <g transform="translate(60, 50)">
      <rect x="0" y="0" width="48" height="48" rx="14" fill="#4f46e5" />
      <text x="24" y="32" text-anchor="middle" font-size="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">🤫</text>
      <text x="62" y="33" fill="#ffffff" font-size="26" font-weight="800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="-0.5px">Whisper</text>
    </g>

    <!-- Top Right Mode Pill -->
    <g transform="translate(940, 50)">
      <rect x="0" y="0" width="200" height="44" rx="22" fill="#1e1b4b" stroke="#6366f1" stroke-width="1.5" stroke-opacity="0.6" />
      <text x="100" y="27" text-anchor="middle" fill="#c7d2fe" font-size="16" font-weight="700" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">100% ANONYMOUS</text>
    </g>

    <!-- Center Card Outline -->
    <rect x="250" y="80" width="700" height="470" rx="36" fill="#0f172a" fill-opacity="0.75" stroke="url(#borderGrad)" stroke-width="2" />

    <!-- Avatar Outer Glowing Ring -->
    <circle cx="600" cy="195" r="88" fill="none" stroke="#6366f1" stroke-width="4" stroke-opacity="0.9" />
    <circle cx="600" cy="195" r="94" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-opacity="0.4" />

    <!-- Avatar Image or Initials -->
    ${
      avatarBase64
        ? `<image href="${avatarBase64}" x="518" y="113" width="164" height="164" clip-path="url(#avatarClip)" />`
        : `
          <circle cx="600" cy="195" r="82" fill="url(#avatarGrad)" />
          <text x="600" y="222" text-anchor="middle" fill="#ffffff" font-size="70" font-weight="bold" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">${initialChar}</text>
        `
    }

    <!-- Display Name -->
    <text x="600" y="325" text-anchor="middle" fill="#ffffff" font-size="38" font-weight="800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="-0.5px">
      ${safeDisplayName}
    </text>

    <!-- Handle Badge -->
    <g transform="translate(600, 350)">
      <text x="0" y="14" text-anchor="middle" fill="#a5b4fc" font-size="20" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
        ${safeHandle}
      </text>
    </g>

    <!-- Prompt Box / Mock Input -->
    <rect x="320" y="380" width="560" height="52" rx="16" fill="#1e293b" fill-opacity="0.9" stroke="#334155" stroke-width="1.5" />
    <text x="345" y="412" fill="#94a3b8" font-size="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
      🤫 ${promptText}
    </text>

    <!-- Send Anonymous CTA Button -->
    <rect x="420" y="450" width="360" height="60" rx="30" fill="url(#btnGrad)" />
    <text x="600" y="488" text-anchor="middle" fill="#ffffff" font-size="21" font-weight="800" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" letter-spacing="0.3px">
      Send Anonymous Whisper 🤫
    </text>

    <!-- Bottom Footer Trust Badge -->
    <text x="600" y="590" text-anchor="middle" fill="#64748b" font-size="16" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
      🔒 End-to-End Encrypted • 100% Anonymous • No Account Required
    </text>
  </svg>
  `;

  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 92, compressionLevel: 8 })
    .toBuffer();

  imageCache.set(cacheKey, { buffer: pngBuffer, timestamp: Date.now() });
  return pngBuffer;
}

const MODE_MAP: Record<string, { name: string; icon: string; prompt: string }> = {
  u: { name: "Anonymous Whisper", icon: "🤫", prompt: "Send me an anonymous whisper..." },
  confess: { name: "Secret Confession", icon: "🙏", prompt: "Confess something to me secretly..." },
  about: { name: "About Me", icon: "💬", prompt: "What do you really think about me?..." },
  ask: { name: "Ask Me Anything", icon: "❓", prompt: "Ask me any secret question..." },
  opinion: { name: "Secret Opinion", icon: "💭", prompt: "Give your honest opinion about me..." },
  crush: { name: "Secret Crush", icon: "💌", prompt: "Do you secretly have a crush on me?..." },
  compliment: { name: "Compliment", icon: "✨", prompt: "Send me a kind anonymous compliment..." },
  roast: { name: "Roast Me", icon: "🔥", prompt: "Roast me anonymously!..." }
};

export function getModeInfo(prefix: string) {
  const p = (prefix || "u").toLowerCase();
  return MODE_MAP[p] || MODE_MAP.u;
}

/**
 * Injects dynamic user title, meta tags, and open-graph cards into index.html
 */
export function injectProfileMetadata(
  html: string,
  options: {
    username: string;
    profile: any;
    modePrefix?: string;
    baseUrl: string;
    path: string;
  }
): string {
  const { username, profile, modePrefix = "u", baseUrl, path } = options;
  const modeInfo = getModeInfo(modePrefix);

  const displayName = profile?.displayName || username || "User";
  const handle = profile?.username || username || "user";
  const bio = profile?.bio ? profile.bio.trim() : "";

  const pageTitle = `Send an anonymous whisper to ${displayName} (@${handle}) — Whisper`;
  const metaTitle = `Send an anonymous whisper to ${displayName} (@${handle})`;
  const description = bio
    ? bio
    : `Send an end-to-end encrypted anonymous whisper or message to ${displayName} (@${handle}). 100% private, anonymous & secure.`;

  const canonicalUrl = `${baseUrl}${path}`;
  const ogImageUrl = `${baseUrl}/api/og-image/${encodeURIComponent(handle)}.png`;

  let modifiedHtml = html;

  // Title tag
  modifiedHtml = modifiedHtml.replace(
    /<title>.*?<\/title>/i,
    `<title>${escapeHtml(pageTitle)}</title>`
  );

  // Meta title
  if (modifiedHtml.includes('<meta name="title"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta\s+name="title"\s+content=".*?"\s*\/?>/i,
      `<meta name="title" content="${escapeHtml(metaTitle)}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${escapeHtml(pageTitle)}</title>\n    <meta name="title" content="${escapeHtml(metaTitle)}" />`
    );
  }

  // Meta description
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name="description"\s+content=".*?"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );

  // OpenGraph tags
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(metaTitle)}" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property="og:image"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image" content="${ogImageUrl}" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property="og:image:secure_url"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image:secure_url" content="${ogImageUrl}" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property="og:image:width"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image:width" content="1200" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+property="og:image:height"\s+content=".*?"\s*\/?>/i,
    `<meta property="og:image:height" content="630" />`
  );

  // Ensure og:url is present
  if (modifiedHtml.includes('<meta property="og:url"')) {
    modifiedHtml = modifiedHtml.replace(
      /<meta\s+property="og:url"\s+content=".*?"\s*\/?>/i,
      `<meta property="og:url" content="${canonicalUrl}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      /<meta\s+property="og:site_name"/i,
      `<meta property="og:url" content="${canonicalUrl}" />\n    <meta property="og:site_name"`
    );
  }

  // Twitter tags
  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(metaTitle)}" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );

  modifiedHtml = modifiedHtml.replace(
    /<meta\s+name="twitter:image"\s+content=".*?"\s*\/?>/i,
    `<meta name="twitter:image" content="${ogImageUrl}" />`
  );

  // Canonical tag
  if (modifiedHtml.includes('<link rel="canonical"')) {
    modifiedHtml = modifiedHtml.replace(
      /<link\s+rel="canonical"\s+href=".*?"\s*\/?>/i,
      `<link rel="canonical" href="${canonicalUrl}" />`
    );
  } else {
    modifiedHtml = modifiedHtml.replace(
      /<\/head>/i,
      `  <link rel="canonical" href="${canonicalUrl}" />\n  </head>`
    );
  }

  // Also update splash screen text so browser renders user info during startup
  modifiedHtml = modifiedHtml.replace(
    /<h1 class="splash-brand-title"[^>]*>Whisper<\/h1>/i,
    `<h1 class="splash-brand-title" id="splash-title-text">${escapeHtml(displayName)}</h1>`
  );
  modifiedHtml = modifiedHtml.replace(
    /<p class="splash-brand-subtitle"[^>]*>Encrypted Anonymous Messaging<\/p>/i,
    `<p class="splash-brand-subtitle" id="splash-subtitle-text">@${escapeHtml(handle)} — Send Whisper</p>`
  );

  return modifiedHtml;
}
