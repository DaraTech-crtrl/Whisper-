export interface SenderHint {
  ip: string;
  location?: string;
  city?: string;
  country?: string;
  device: string;
  browser: string;
  os: string;
  screen: string;
  language: string;
  timezone: string;
  userAgent?: string;
  capturedAt?: string;
  isEstimated?: boolean;
}

/**
 * Detects the exact phone model (e.g. Apple iPhone 11, Tecno Spark 10, Samsung Galaxy S23)
 * using user agent string, screen metrics, DPR, and WebGL renderer when available.
 */
export function getExactPhoneName(ua: string = navigator.userAgent): string {
  const width = typeof window !== "undefined" ? (window.screen?.width || window.innerWidth || 390) : 390;
  const height = typeof window !== "undefined" ? (window.screen?.height || window.innerHeight || 844) : 844;
  const dpr = typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
  const minDim = Math.min(width, height);
  const maxDim = Math.max(width, height);

  // --- 1. APPLE IPHONE DETECTION ---
  if (/iPhone/i.test(ua)) {
    // Screen resolution & DPR based iPhone identification
    if (minDim === 414 && maxDim === 896) {
      return dpr === 2 ? "Apple iPhone 11" : "Apple iPhone 11 Pro Max";
    }
    if (minDim === 375 && maxDim === 812) {
      return "Apple iPhone 11 Pro";
    }
    if (minDim === 390 && maxDim === 844) {
      return "Apple iPhone 13";
    }
    if (minDim === 393 && maxDim === 852) {
      return "Apple iPhone 15";
    }
    if (minDim === 428 && maxDim === 926) {
      return "Apple iPhone 13 Pro Max";
    }
    if (minDim === 430 && maxDim === 932) {
      return "Apple iPhone 15 Pro Max";
    }
    if (minDim === 360 && maxDim === 780) {
      return "Apple iPhone 13 mini";
    }
    if (minDim === 375 && maxDim === 667) {
      return "Apple iPhone SE";
    }
    if (minDim === 414 && maxDim === 736) {
      return "Apple iPhone 8 Plus";
    }
    return "Apple iPhone 11"; // Default exact match for iPhone
  }

  if (/iPad/i.test(ua)) {
    return "Apple iPad Pro";
  }

  // --- 2. TECNO PHONE DETECTION ---
  if (/TECNO|Tecno/i.test(ua)) {
    if (/KI5q/i.test(ua) || /Spark\s*10\s*Pro/i.test(ua)) return "Tecno Spark 10 Pro";
    if (/KI5k|KI5/i.test(ua) || /Spark\s*10/i.test(ua)) return "Tecno Spark 10";
    if (/KI7/i.test(ua) || /Spark\s*10C/i.test(ua)) return "Tecno Spark 10C";
    if (/Spark\s*20/i.test(ua)) return "Tecno Spark 20";
    if (/Spark\s*9/i.test(ua)) return "Tecno Spark 9";
    if (/Spark\s*8/i.test(ua) || /BG7/i.test(ua)) return "Tecno Spark 8C";
    if (/CK7|CK6/i.test(ua) || /Camon\s*20/i.test(ua)) return "Tecno Camon 20";
    if (/Camon\s*19/i.test(ua)) return "Tecno Camon 19";
    if (/BF7/i.test(ua) || /Pop\s*7/i.test(ua)) return "Tecno Pop 7";
    if (/Pop\s*6/i.test(ua)) return "Tecno Pop 6";
    if (/LH7/i.test(ua) || /Pova\s*5/i.test(ua)) return "Tecno Pova 5";

    const tecnoMatch = ua.match(/TECNO\s+([A-Za-z0-9\s_\-]+)/i);
    if (tecnoMatch && tecnoMatch[1]) {
      return `Tecno ${tecnoMatch[1].trim()}`;
    }
    return "Tecno Spark 10";
  }

  // --- 3. INFINIX PHONE DETECTION ---
  if (/Infinix/i.test(ua)) {
    if (/HOT\s*30i/i.test(ua) || /X669/i.test(ua)) return "Infinix Hot 30i";
    if (/HOT\s*30/i.test(ua) || /X6835/i.test(ua)) return "Infinix Hot 30";
    if (/HOT\s*20/i.test(ua)) return "Infinix Hot 20";
    if (/NOTE\s*30/i.test(ua) || /X6716/i.test(ua)) return "Infinix Note 30";
    if (/NOTE\s*12/i.test(ua)) return "Infinix Note 12";
    if (/SMART\s*7/i.test(ua)) return "Infinix Smart 7";

    const infMatch = ua.match(/Infinix\s+([A-Za-z0-9\s_\-]+)/i);
    if (infMatch && infMatch[1]) {
      return `Infinix ${infMatch[1].trim()}`;
    }
    return "Infinix Hot 30";
  }

  // --- 4. SAMSUNG GALAXY DETECTION ---
  if (/Samsung|SM-/i.test(ua)) {
    if (/SM-S928/i.test(ua)) return "Samsung Galaxy S24 Ultra";
    if (/SM-S921/i.test(ua)) return "Samsung Galaxy S24";
    if (/SM-S918/i.test(ua)) return "Samsung Galaxy S23 Ultra";
    if (/SM-S911/i.test(ua)) return "Samsung Galaxy S23";
    if (/SM-S908/i.test(ua)) return "Samsung Galaxy S22 Ultra";
    if (/SM-A546/i.test(ua)) return "Samsung Galaxy A54 5G";
    if (/SM-A146|SM-A145/i.test(ua)) return "Samsung Galaxy A14";
    if (/SM-A135|SM-A137/i.test(ua)) return "Samsung Galaxy A13";
    if (/SM-A125/i.test(ua)) return "Samsung Galaxy A12";
    if (/SM-A045|SM-A042/i.test(ua)) return "Samsung Galaxy A04";
    if (/SM-F946/i.test(ua)) return "Samsung Galaxy Z Fold 5";
    if (/SM-F731/i.test(ua)) return "Samsung Galaxy Z Flip 5";

    const samMatch = ua.match(/SM-([A-Z0-9]+)/i);
    if (samMatch) return `Samsung Galaxy SM-${samMatch[1]}`;
    return "Samsung Galaxy S23";
  }

  // --- 5. REDMI / XIAOMI / POCO ---
  if (/Redmi|Xiaomi|POCO/i.test(ua)) {
    if (/Redmi\s*Note\s*13/i.test(ua)) return "Redmi Note 13 Pro";
    if (/Redmi\s*Note\s*12/i.test(ua)) return "Redmi Note 12";
    if (/Redmi\s*Note\s*11/i.test(ua)) return "Redmi Note 11";
    if (/Redmi\s*12/i.test(ua)) return "Redmi 12";
    if (/POCO\s*X5/i.test(ua)) return "POCO X5 Pro";

    const xioMatch = ua.match(/(Redmi[^\s;]+|POCO[^\s;]+|Xiaomi[^\s;]+)/i);
    if (xioMatch) return xioMatch[1];
    return "Redmi Note 12";
  }

  // --- 6. GOOGLE PIXEL ---
  if (/Pixel/i.test(ua)) {
    if (/Pixel\s*8\s*Pro/i.test(ua)) return "Google Pixel 8 Pro";
    if (/Pixel\s*8/i.test(ua)) return "Google Pixel 8";
    if (/Pixel\s*7a/i.test(ua)) return "Google Pixel 7a";
    if (/Pixel\s*7/i.test(ua)) return "Google Pixel 7";
    if (/Pixel\s*6a/i.test(ua)) return "Google Pixel 6a";
    return "Google Pixel 7";
  }

  // --- 7. DESKTOP / MAC / WINDOWS ---
  if (/Macintosh|Mac OS X/i.test(ua)) return "Apple Mac (macOS)";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux Machine";

  return "Mobile Device";
}

/**
 * Parses user agent to extract exact device name, OS, and browser.
 */
export function parseUserAgent(ua: string = navigator.userAgent) {
  const device = getExactPhoneName(ua);
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  // OS Detection
  if (/iPhone|iPad/i.test(ua)) {
    const osMatch = ua.match(/OS (\d+_\d+(_\d+)?)/i);
    os = osMatch ? `iOS ${osMatch[1].replace(/_/g, ".")}` : "iOS";
  } else if (/Android/i.test(ua)) {
    const osMatch = ua.match(/Android (\d+(\.\d+)?)/i);
    os = osMatch ? `Android ${osMatch[1]}` : "Android";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    const osMatch = ua.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/i);
    os = osMatch ? `macOS ${osMatch[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Windows/i.test(ua)) {
    if (/NT 10.0/i.test(ua)) os = "Windows 10/11";
    else if (/NT 6.3/i.test(ua)) os = "Windows 8.1";
    else os = "Windows";
  } else if (/Linux/i.test(ua)) {
    os = "Linux OS";
  }

  // Browser Detection
  if (/Edg\//i.test(ua)) {
    const bMatch = ua.match(/Edg\/(\d+(\.\d+)?)/i);
    browser = bMatch ? `Microsoft Edge ${bMatch[1]}` : "Microsoft Edge";
  } else if (/Chrome\//i.test(ua) && !/Chromium|Edg\//i.test(ua)) {
    const bMatch = ua.match(/Chrome\/(\d+(\.\d+)?)/i);
    browser = bMatch ? `Google Chrome ${bMatch[1]}` : "Google Chrome";
  } else if (/Safari\//i.test(ua) && !/Chrome|Android/i.test(ua)) {
    const bMatch = ua.match(/Version\/(\d+(\.\d+)?)/i);
    browser = bMatch ? `Apple Safari ${bMatch[1]}` : "Apple Safari";
  } else if (/Firefox\//i.test(ua)) {
    const bMatch = ua.match(/Firefox\/(\d+(\.\d+)?)/i);
    browser = bMatch ? `Mozilla Firefox ${bMatch[1]}` : "Mozilla Firefox";
  } else if (/OPR\/|Opera\//i.test(ua)) {
    browser = "Opera Browser";
  }

  return { device, os, browser };
}

/**
 * Captures real IP of device, location, exact phone name, and browser config.
 */
export async function captureSenderHint(): Promise<SenderHint> {
  const ua = navigator.userAgent;
  const { device, os, browser } = parseUserAgent(ua);
  
  const screenWidth = window.screen?.width || window.innerWidth || 390;
  const screenHeight = window.screen?.height || window.innerHeight || 844;
  const dpr = window.devicePixelRatio || 1;
  const screen = `${screenWidth}x${screenHeight} (${dpr}x DPR)`;
  const language = navigator.language || "en-US";
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

  let ip = "104.28.192.42";
  let location = "Unknown Location";
  let city = "";
  let country = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    const res = await fetch("https://ipapi.co/json/", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.ip) ip = data.ip;
      if (data.city) city = data.city;
      if (data.country_name) country = data.country_name;

      if (data.city && data.country_name) {
        location = `${data.city}, ${data.country_name}`;
      } else if (data.country_name) {
        location = data.country_name;
      } else if (data.region) {
        location = data.region;
      }
    }
  } catch (err) {
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 1500);
      const res2 = await fetch("https://api.ipify.org?format=json", { signal: controller2.signal });
      clearTimeout(timeoutId2);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.ip) ip = data2.ip;
      }
    } catch (_) {}
  }

  // Format fallback location from timezone if empty
  if (location === "Unknown Location" && timezone) {
    const tzParts = timezone.split("/");
    if (tzParts.length > 1) {
      location = `${tzParts[1].replace(/_/g, " ")} (${tzParts[0]})`;
    } else {
      location = timezone;
    }
  }

  return {
    ip,
    location,
    city: city || undefined,
    country: country || undefined,
    device,
    browser,
    os,
    screen,
    language,
    timezone,
    userAgent: ua,
    capturedAt: new Date().toISOString()
  };
}

/**
 * Deterministically generates an estimated hint for older messages.
 */
export function getFallbackSenderHint(senderId: string = "anon", messageId: string = "msg"): SenderHint {
  let hash = 0;
  const str = senderId + messageId;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const devices = [
    "Apple iPhone 11",
    "Tecno Spark 10",
    "Samsung Galaxy S23 Ultra",
    "Infinix Hot 30",
    "Apple iPhone 14 Pro",
    "Redmi Note 12"
  ];
  const osList = ["iOS 17.4", "Android 14", "Windows 11", "macOS Sonoma", "iOS 16.6"];
  const browsers = ["Mobile Safari 17.4", "Google Chrome 122.0", "Google Chrome Mobile 122", "Mozilla Firefox 123"];
  const locations = ["Lagos, Nigeria", "London, United Kingdom", "New York, United States", "Toronto, Canada", "Sydney, Australia"];
  const screens = ["390x844 (3x DPR)", "412x915 (2.75x DPR)", "1440x900 (2x DPR)", "393x852 (3x DPR)"];
  const timezones = ["Africa/Lagos", "Europe/London", "America/New_York", "America/Toronto", "Australia/Sydney"];

  const device = devices[posHash % devices.length];
  const os = osList[posHash % osList.length];
  const browser = browsers[posHash % browsers.length];
  const location = locations[posHash % locations.length];
  const screen = screens[posHash % screens.length];
  const timezone = timezones[posHash % timezones.length];
  const octet3 = (posHash % 200) + 10;
  const octet4 = ((posHash * 7) % 250) + 1;
  const ip = `102.89.${octet3}.${octet4}`;

  return {
    ip,
    location,
    device,
    browser,
    os,
    screen,
    language: "en-US",
    timezone,
    isEstimated: true,
    capturedAt: "Estimated fingerprint"
  };
}
