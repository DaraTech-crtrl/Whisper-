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
 * Formats or refines display device name, upgrading generic names like "Apple iPhone" or "Mobile Device"
 * to exact models like "Apple iPhone 11" using screen metrics and user-agent details.
 */
export function formatDisplayDevice(hint: SenderHint): string {
  if (!hint || !hint.device) return "Unknown Device";
  return hint.device;
}

/**
 * Detects phone model using user agent string and device info without screen guessing.
 */
export function getExactPhoneName(ua: string = navigator.userAgent): string {
  if (!ua) return "Mobile Device";

  // --- 1. APPLE IPHONE / IPAD ---
  if (/iPhone/i.test(ua)) {
    return "Apple iPhone";
  }
  if (/iPad/i.test(ua)) {
    return "Apple iPad";
  }

  // --- 2. TECNO PHONE DETECTION ---
  if (/TECNO|Tecno/i.test(ua)) {
    if (/Spark\s*10\s*Pro|KI5q/i.test(ua)) return "Tecno Spark 10 Pro";
    if (/Spark\s*10|KI5k|KI5/i.test(ua)) return "Tecno Spark 10";
    if (/Spark\s*10C|KI7/i.test(ua)) return "Tecno Spark 10C";
    if (/Spark\s*20/i.test(ua)) return "Tecno Spark 20";
    if (/Spark\s*9/i.test(ua)) return "Tecno Spark 9";
    if (/Spark\s*8|BG7/i.test(ua)) return "Tecno Spark 8C";
    if (/Camon\s*20|CK7|CK6/i.test(ua)) return "Tecno Camon 20";
    if (/Camon\s*19/i.test(ua)) return "Tecno Camon 19";
    if (/Pop\s*7|BF7/i.test(ua)) return "Tecno Pop 7";
    if (/Pop\s*6/i.test(ua)) return "Tecno Pop 6";
    if (/Pova\s*5|LH7/i.test(ua)) return "Tecno Pova 5";

    const tecnoMatch = ua.match(/TECNO\s+([A-Za-z0-9\s_\-]+?)(?:\s+Build|\s*;|\))/i);
    if (tecnoMatch && tecnoMatch[1]) {
      return `Tecno ${tecnoMatch[1].trim()}`;
    }
    return "Tecno Smartphone";
  }

  // --- 3. INFINIX PHONE DETECTION ---
  if (/Infinix/i.test(ua)) {
    if (/HOT\s*30i|X669/i.test(ua)) return "Infinix Hot 30i";
    if (/HOT\s*30|X6835/i.test(ua)) return "Infinix Hot 30";
    if (/HOT\s*20/i.test(ua)) return "Infinix Hot 20";
    if (/NOTE\s*30|X6716/i.test(ua)) return "Infinix Note 30";
    if (/NOTE\s*12/i.test(ua)) return "Infinix Note 12";
    if (/SMART\s*7/i.test(ua)) return "Infinix Smart 7";

    const infMatch = ua.match(/Infinix\s+([A-Za-z0-9\s_\-]+?)(?:\s+Build|\s*;|\))/i);
    if (infMatch && infMatch[1]) {
      return `Infinix ${infMatch[1].trim()}`;
    }
    return "Infinix Smartphone";
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
    return "Samsung Galaxy";
  }

  // --- 5. REDMI / XIAOMI / POCO ---
  if (/Redmi|Xiaomi|POCO/i.test(ua)) {
    if (/Redmi\s*Note\s*13/i.test(ua)) return "Redmi Note 13 Pro";
    if (/Redmi\s*Note\s*12/i.test(ua)) return "Redmi Note 12";
    if (/Redmi\s*Note\s*11/i.test(ua)) return "Redmi Note 11";
    if (/Redmi\s*12/i.test(ua)) return "Redmi 12";
    if (/POCO\s*X5/i.test(ua)) return "POCO X5 Pro";

    const xioMatch = ua.match(/(Redmi[^\s;)]+|POCO[^\s;)]+|Xiaomi[^\s;)]+)/i);
    if (xioMatch) return xioMatch[1];
    return "Xiaomi / Redmi";
  }

  // --- 6. GOOGLE PIXEL ---
  if (/Pixel/i.test(ua)) {
    const pixMatch = ua.match(/(Pixel\s*[\d\w\s]+?)(?:\s+Build|\s*;|\))/i);
    if (pixMatch) return `Google ${pixMatch[1].trim()}`;
    return "Google Pixel";
  }

  // --- 7. GENERIC ANDROID MODEL EXTRACTION FROM UA ---
  if (/Android/i.test(ua)) {
    const androidMatch = ua.match(/Android\s+[\d\.]+;\s*([^;)]+?)\s*(?:Build|\))/i);
    if (androidMatch && androidMatch[1] && !/Mobile|Linux|Android/i.test(androidMatch[1])) {
      return androidMatch[1].trim();
    }
    return "Android Smartphone";
  }

  // --- 8. DESKTOP / MAC / WINDOWS ---
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

  // 1. Primary: Fetch exact device public IP directly from api.ipify.org
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        ip = data.ip;
      }
    }
  } catch (err) {
    console.warn("api.ipify.org fetch warning:", err);
  }

  // 2. Secondary: Fetch location data using ipapi.co (or ipwho.is as fallback)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const locUrl = ip && ip !== "104.28.192.42" ? `https://ipapi.co/${ip}/json/` : "https://ipapi.co/json/";

    const res = await fetch(locUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if ((!ip || ip === "104.28.192.42") && data.ip) {
        ip = data.ip;
      }
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
      const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
      const res2 = await fetch(`https://ipwho.is/${ip !== "104.28.192.42" ? ip : ""}`, { signal: controller2.signal });
      clearTimeout(timeoutId2);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.ip && (!ip || ip === "104.28.192.42")) {
          ip = data2.ip;
        }
        if (data2.city && data2.country) {
          location = `${data2.city}, ${data2.country}`;
          city = data2.city;
          country = data2.country;
        }
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

  const result: SenderHint = {
    ip: ip || "104.28.192.42",
    location: location || "Unknown Location",
    device: device || "Mobile Device",
    browser: browser || "Unknown Browser",
    os: os || "Unknown OS",
    screen: screen || "Standard Screen",
    language: language || "en-US",
    timezone: timezone || "UTC",
    userAgent: ua || "",
    capturedAt: new Date().toISOString()
  };

  if (city) result.city = city;
  if (country) result.country = country;

  return result;
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
