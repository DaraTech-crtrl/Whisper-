export interface SenderHint {
  ip: string;
  location: string;
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
 * Parses user agent to extract clean device name, OS, and browser version.
 */
export function parseUserAgent(ua: string = navigator.userAgent) {
  let device = "Desktop / Laptop";
  let os = "Unknown OS";
  let browser = "Unknown Browser";

  // Device & OS Detection
  if (/iPhone/i.test(ua)) {
    device = "Apple iPhone";
    const osMatch = ua.match(/OS (\d+_\d+(_\d+)?)/i);
    os = osMatch ? `iOS ${osMatch[1].replace(/_/g, ".")}` : "iOS";
  } else if (/iPad/i.test(ua)) {
    device = "Apple iPad";
    const osMatch = ua.match(/OS (\d+_\d+(_\d+)?)/i);
    os = osMatch ? `iPadOS ${osMatch[1].replace(/_/g, ".")}` : "iPadOS";
  } else if (/Android/i.test(ua)) {
    if (/Mobile/i.test(ua)) {
      if (/Samsung/i.test(ua)) device = "Samsung Galaxy";
      else if (/Pixel/i.test(ua)) device = "Google Pixel";
      else if (/Redmi|Xiaomi/i.test(ua)) device = "Xiaomi Phone";
      else if (/OnePlus/i.test(ua)) device = "OnePlus Phone";
      else device = "Android Smartphone";
    } else {
      device = "Android Tablet";
    }
    const osMatch = ua.match(/Android (\d+(\.\d+)?)/i);
    os = osMatch ? `Android ${osMatch[1]}` : "Android";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    device = "Apple Mac";
    const osMatch = ua.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/i);
    os = osMatch ? `macOS ${osMatch[1].replace(/_/g, ".")}` : "macOS";
  } else if (/Windows/i.test(ua)) {
    device = "Windows PC";
    if (/NT 10.0/i.test(ua)) os = "Windows 10/11";
    else if (/NT 6.3/i.test(ua)) os = "Windows 8.1";
    else os = "Windows";
  } else if (/Linux/i.test(ua)) {
    device = "Linux Machine";
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
 * Capture real IP, location, device, and browser configuration.
 * Times out gracefully after 2 seconds to avoid delaying message send.
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

  let ip = "Detecting...";
  let location = "Unknown Location";
  let city = "";
  let country = "";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2200);

    // Try primary geo endpoint
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
    // Secondary fallback for IP if primary fails or is blocked
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

  // If location still empty, format from timezone
  if (location === "Unknown Location" && timezone) {
    const tzParts = timezone.split("/");
    if (tzParts.length > 1) {
      location = `${tzParts[1].replace(/_/g, " ")} (${tzParts[0]})`;
    } else {
      location = timezone;
    }
  }

  if (ip === "Detecting...") {
    ip = "Masked via Relay";
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
 * Deterministically generates an estimated/derived hint for older messages
 * that do not have a stored `senderHint`.
 */
export function getFallbackSenderHint(senderId: string = "anon", messageId: string = "msg"): SenderHint {
  let hash = 0;
  const str = senderId + messageId;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const devices = ["Apple iPhone", "Samsung Galaxy", "Google Pixel", "Apple iPad", "Windows PC", "Apple Mac"];
  const osList = ["iOS 17.4", "Android 14", "Windows 11", "macOS Sonoma", "iOS 16.6"];
  const browsers = ["Mobile Safari 17.4", "Google Chrome 122.0", "Google Chrome Mobile 122", "Mozilla Firefox 123"];
  const locations = ["New York, United States", "London, United Kingdom", "Toronto, Canada", "Lagos, Nigeria", "Sydney, Australia", "Berlin, Germany"];
  const screens = ["390x844 (3x DPR)", "412x915 (2.75x DPR)", "1440x900 (2x DPR)", "393x852 (3x DPR)"];
  const timezones = ["America/New_York", "Europe/London", "America/Toronto", "Africa/Lagos", "Australia/Sydney"];

  const device = devices[posHash % devices.length];
  const os = osList[posHash % osList.length];
  const browser = browsers[posHash % browsers.length];
  const location = locations[posHash % locations.length];
  const screen = screens[posHash % screens.length];
  const timezone = timezones[posHash % timezones.length];
  const octet3 = (posHash % 200) + 10;
  const octet4 = ((posHash * 7) % 250) + 1;
  const ip = `104.28.${octet3}.${octet4}`;

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
