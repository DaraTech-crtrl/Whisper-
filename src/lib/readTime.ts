/**
 * Utility to calculate estimated read time for messages based on character count.
 * Standard silent reading speed is ~200-250 words per minute, which is roughly
 * 1,000 to 1,200 characters per minute (~18-20 characters per second).
 */

export interface ReadTimeInfo {
  label: string;
  charCount: number;
  wordCount: number;
  seconds: number;
}

export function getReadTimeEstimate(text?: string, fallbackChars?: number): ReadTimeInfo {
  const content = (text || "").trim();
  const charCount = content.length > 0 ? content.length : (fallbackChars || 0);
  const wordCount = content.length > 0 ? content.split(/\s+/).filter(Boolean).length : Math.max(0, Math.round(charCount / 5));

  if (charCount <= 0) {
    return { label: "< 15s read", charCount: 0, wordCount: 0, seconds: 10 };
  }

  if (charCount < 150) {
    return { label: "< 15s read", charCount, wordCount, seconds: 15 };
  }

  if (charCount < 350) {
    return { label: "~30s read", charCount, wordCount, seconds: 30 };
  }

  if (charCount < 700) {
    return { label: "~45s read", charCount, wordCount, seconds: 45 };
  }

  const minutes = Math.max(1, Math.ceil(charCount / 1000));
  return {
    label: `${minutes} min read`,
    charCount,
    wordCount,
    seconds: minutes * 60
  };
}
