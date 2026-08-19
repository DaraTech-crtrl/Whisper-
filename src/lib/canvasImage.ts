import { WhisperMode, getMessageMode } from "./whisperModes";
import { getAssetUrl } from "./assets";
import { WHISPER_LOGO_DATA_URL } from "./logoBase64";

export type ProfileCardTheme = "obsidian" | "neon" | "velvet" | "sunset" | "cyberpunk";

async function loadLogoImage(): Promise<HTMLImageElement | null> {
  try {
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback to local url if data URI fails for any reason
        const fallbackImg = new Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () => resolve(null);
        fallbackImg.src = getAssetUrl("android-chrome-192x192.png");
      };
      img.src = WHISPER_LOGO_DATA_URL;
    });
  } catch {
    return null;
  }
}

function drawWhisperLogoMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, logoImg?: HTMLImageElement | null) {
  ctx.save();
  const radius = size * 0.26;
  
  if (logoImg && (logoImg.complete || logoImg.naturalWidth > 0)) {
    // Draw rounded clipped authentic logo image with outer glow/border
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.clip();
    ctx.drawImage(logoImg, x, y, size, size);
  } else {
    // Elegant fallback gradient app icon
    const iconGrad = ctx.createLinearGradient(x, y, x + size, y + size);
    iconGrad.addColorStop(0, "#6366f1");
    iconGrad.addColorStop(0.5, "#8b5cf6");
    iconGrad.addColorStop(1, "#d946ef");
    ctx.fillStyle = iconGrad;
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, size, size, radius);
    ctx.stroke();

    // White stylized speech bubble / whisper emblem
    ctx.fillStyle = "#ffffff";
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.24;

    ctx.beginPath();
    ctx.arc(cx, cy - 2, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy + r * 0.5);
    ctx.lineTo(cx - r * 1.15, cy + r * 1.15);
    ctx.lineTo(cx, cy + r * 0.65);
    ctx.closePath();
    ctx.fill();

    // Center lock eye
    ctx.fillStyle = "#6366f1";
    ctx.beginPath();
    ctx.arc(cx, cy - 2, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface ProfileShareCardOptions {
  username: string;
  displayName?: string;
  publicUrl: string;
  theme?: ProfileCardTheme;
  headline?: string;
  subheadline?: string;
  qrCodeDataUrl?: string;
  photoURL?: string | null;
  avatarUrl?: string | null;
}

export async function generateProfileShareCard(options: ProfileShareCardOptions): Promise<{ blob: Blob; dataUrl: string }> {
  const {
    username,
    displayName,
    theme = "obsidian",
    headline = "send me anonymous messages! 🤫",
    photoURL,
    avatarUrl
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080; // Perfect 1:1 Square Shape Card
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // Ensure high quality crisp text and image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Theme palettes configuration
  const themeConfigs: Record<ProfileCardTheme, {
    bgColors: [string, string, string];
    aurora1: { color: string; x: number; y: number; r: number };
    aurora2: { color: string; x: number; y: number; r: number };
    neonStrokes: string[];
    cardBg: [string, string, string];
    accentText: string;
    bubbleBg: string;
    bubbleBorder: string;
  }> = {
    obsidian: {
      bgColors: ["#07080e", "#0b0d18", "#040509"],
      aurora1: { color: "rgba(147, 51, 234, 0.35)", x: 880, y: 200, r: 550 },
      aurora2: { color: "rgba(99, 102, 241, 0.25)", x: 200, y: 880, r: 550 },
      neonStrokes: ["#c084fc", "#818cf8", "#38bdf8", "#a855f7"],
      cardBg: ["rgba(16, 18, 28, 0.96)", "rgba(11, 13, 21, 0.98)", "rgba(7, 8, 14, 0.99)"],
      accentText: "#c084fc",
      bubbleBg: "rgba(255, 255, 255, 0.04)",
      bubbleBorder: "rgba(192, 132, 252, 0.22)"
    },
    neon: {
      bgColors: ["#060514", "#12072e", "#03020a"],
      aurora1: { color: "rgba(236, 72, 153, 0.38)", x: 880, y: 200, r: 550 },
      aurora2: { color: "rgba(6, 182, 212, 0.30)", x: 180, y: 900, r: 520 },
      neonStrokes: ["#f43f5e", "#d946ef", "#06b6d4", "#f43f5e"],
      cardBg: ["rgba(24, 12, 38, 0.96)", "rgba(14, 8, 26, 0.98)", "rgba(8, 4, 16, 0.99)"],
      accentText: "#f472b6",
      bubbleBg: "rgba(255, 255, 255, 0.04)",
      bubbleBorder: "rgba(244, 114, 182, 0.22)"
    },
    velvet: {
      bgColors: ["#0e060e", "#1b0a1b", "#060206"],
      aurora1: { color: "rgba(244, 63, 94, 0.38)", x: 850, y: 220, r: 520 },
      aurora2: { color: "rgba(245, 158, 11, 0.28)", x: 200, y: 880, r: 500 },
      neonStrokes: ["#fb7185", "#e11d48", "#fbbf24", "#f43f5e"],
      cardBg: ["rgba(30, 14, 26, 0.96)", "rgba(18, 8, 16, 0.98)", "rgba(10, 4, 9, 0.99)"],
      accentText: "#fb7185",
      bubbleBg: "rgba(255, 255, 255, 0.04)",
      bubbleBorder: "rgba(251, 113, 133, 0.22)"
    },
    sunset: {
      bgColors: ["#0a0512", "#1d0a20", "#050209"],
      aurora1: { color: "rgba(249, 115, 22, 0.38)", x: 860, y: 200, r: 550 },
      aurora2: { color: "rgba(168, 85, 247, 0.30)", x: 190, y: 890, r: 520 },
      neonStrokes: ["#ff7e5f", "#feb47b", "#c084fc", "#f97316"],
      cardBg: ["rgba(28, 12, 30, 0.96)", "rgba(16, 7, 18, 0.98)", "rgba(9, 3, 10, 0.99)"],
      accentText: "#ff7e5f",
      bubbleBg: "rgba(255, 255, 255, 0.04)",
      bubbleBorder: "rgba(251, 146, 60, 0.22)"
    },
    cyberpunk: {
      bgColors: ["#030b08", "#071a13", "#010504"],
      aurora1: { color: "rgba(16, 185, 129, 0.38)", x: 860, y: 220, r: 550 },
      aurora2: { color: "rgba(56, 189, 248, 0.28)", x: 190, y: 880, r: 520 },
      neonStrokes: ["#34d399", "#10b981", "#38bdf8", "#34d399"],
      cardBg: ["rgba(10, 26, 20, 0.96)", "rgba(6, 16, 12, 0.98)", "rgba(3, 9, 7, 0.99)"],
      accentText: "#34d399",
      bubbleBg: "rgba(255, 255, 255, 0.04)",
      bubbleBorder: "rgba(52, 211, 153, 0.22)"
    }
  };

  const palette = themeConfigs[theme] || themeConfigs.obsidian;
  const logoImg = await loadLogoImage();

  // 1. Draw Canvas Background (1080x1080)
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1080);
  bgGrad.addColorStop(0, palette.bgColors[0]);
  bgGrad.addColorStop(0.5, palette.bgColors[1]);
  bgGrad.addColorStop(1, palette.bgColors[2]);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1080);

  // 2. Draw Ambient Radial Aura Glows
  const g1 = ctx.createRadialGradient(palette.aurora1.x, palette.aurora1.y, 40, palette.aurora1.x, palette.aurora1.y, palette.aurora1.r);
  g1.addColorStop(0, palette.aurora1.color);
  g1.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, 1080, 1080);

  const g2 = ctx.createRadialGradient(palette.aurora2.x, palette.aurora2.y, 40, palette.aurora2.x, palette.aurora2.y, palette.aurora2.r);
  g2.addColorStop(0, palette.aurora2.color);
  g2.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, 1080, 1080);

  // 3. Main Outer Card Frame (Centered 920x920)
  const cardW = 920;
  const cardH = 920;
  const cardX = (1080 - cardW) / 2; // 80
  const cardY = (1080 - cardH) / 2; // 80
  const cardRadius = 48;

  // Outer Neon Glow Stroke
  ctx.save();
  ctx.shadowColor = palette.accentText;
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;

  const strokeGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  strokeGrad.addColorStop(0, palette.neonStrokes[0]);
  strokeGrad.addColorStop(0.35, palette.neonStrokes[1]);
  strokeGrad.addColorStop(0.7, palette.neonStrokes[2]);
  strokeGrad.addColorStop(1, palette.neonStrokes[3]);

  ctx.strokeStyle = strokeGrad;
  ctx.lineWidth = 3.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();
  ctx.restore();

  // Glass Card Body Fill
  ctx.save();
  const cardBgGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardBgGrad.addColorStop(0, palette.cardBg[0]);
  cardBgGrad.addColorStop(0.5, palette.cardBg[1]);
  cardBgGrad.addColorStop(1, palette.cardBg[2]);
  ctx.fillStyle = cardBgGrad;
  drawRoundedRect(ctx, cardX + 2, cardY + 2, cardW - 4, cardH - 4, cardRadius - 2);
  ctx.fill();
  ctx.restore();

  // Top Edge Specular Highlight
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  drawTopRoundedRect(ctx, cardX + 4, cardY + 4, cardW - 8, 70, cardRadius - 4);
  ctx.stroke();
  ctx.restore();

  // 4. Top Brand Header with Authentic Logo
  const brandPillW = 240;
  const brandPillH = 58;
  const brandPillX = (1080 - brandPillW) / 2;
  const brandPillY = cardY + 60;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  drawRoundedRect(ctx, brandPillX, brandPillY, brandPillW, brandPillH, 29);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, brandPillX, brandPillY, brandPillW, brandPillH, 29);
  ctx.stroke();

  // Draw Logo mark
  const topLogoSize = 32;
  const topLogoX = brandPillX + 18;
  const topLogoY = brandPillY + (brandPillH - topLogoSize) / 2;
  drawWhisperLogoMark(ctx, topLogoX, topLogoY, topLogoSize, logoImg);

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("WHISPER", topLogoX + topLogoSize + 12, brandPillY + brandPillH / 2);
  ctx.restore();

  // 5. Center Prompt Message Box (Hero Element)
  const boxX = cardX + 60; // 140
  const boxY = cardY + 160; // 240
  const boxW = cardW - 120; // 800
  const boxH = 460;
  const boxRadius = 36;

  // Prompt Box Glass
  ctx.save();
  ctx.fillStyle = palette.bubbleBg;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, boxRadius);
  ctx.fill();

  ctx.strokeStyle = palette.bubbleBorder;
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, boxRadius);
  ctx.stroke();
  ctx.restore();

  // Headline Text inside Center Speech Bubble
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const rawHeadline = headline.trim() || "send me anonymous messages!";
  let fontSize = 52;
  if (rawHeadline.length > 80) fontSize = 38;
  else if (rawHeadline.length > 50) fontSize = 44;

  ctx.font = `900 ${fontSize}px "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  const wrappedHeadline = wrapText(ctx, rawHeadline, boxW - 80);
  const totalTextH = wrappedHeadline.length * (fontSize * 1.25);
  const startY = boxY + (boxH - totalTextH) / 2 + (fontSize * 0.4);

  wrappedHeadline.forEach((line, i) => {
    ctx.fillText(line, 540, startY + i * (fontSize * 1.25));
  });
  ctx.restore();

  // 6. Bottom User Identity Tag (Clean & Minimalist)
  const profileCenterY = boxY + boxH + 115;
  const nameToDisplay = displayName || username || "Anonymous";
  const initial = nameToDisplay.charAt(0).toUpperCase();

  // Avatar Circle
  const avatarRadius = 40;
  const avatarCenterX = 540;
  const avatarCenterY = profileCenterY - 30;

  const avatarImgSrc = photoURL || avatarUrl;
  let loadedAvatarImg: HTMLImageElement | null = null;

  if (avatarImgSrc) {
    try {
      loadedAvatarImg = await new Promise<HTMLImageElement | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = avatarImgSrc;
      });
    } catch {
      loadedAvatarImg = null;
    }
  }

  if (loadedAvatarImg) {
    ctx.save();
    ctx.shadowColor = palette.accentText;
    ctx.shadowBlur = 12;

    // Glowing outer ring border
    const avGrad = ctx.createLinearGradient(avatarCenterX - avatarRadius - 3, avatarCenterY - avatarRadius - 3, avatarCenterX + avatarRadius + 3, avatarCenterY + avatarRadius + 3);
    avGrad.addColorStop(0, palette.neonStrokes[0]);
    avGrad.addColorStop(1, palette.neonStrokes[1]);
    ctx.strokeStyle = avGrad;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Clip image inside circle
    ctx.beginPath();
    ctx.arc(avatarCenterX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(loadedAvatarImg, avatarCenterX - avatarRadius, avatarCenterY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();
  } else {
    // Fallback: Gradient Circle & Initial
    ctx.save();
    ctx.shadowColor = palette.accentText;
    ctx.shadowBlur = 20;

    const avGrad = ctx.createLinearGradient(540 - avatarRadius, profileCenterY - avatarRadius, 540 + avatarRadius, profileCenterY + avatarRadius);
    avGrad.addColorStop(0, palette.neonStrokes[0]);
    avGrad.addColorStop(1, palette.neonStrokes[1]);
    ctx.fillStyle = avGrad;
    ctx.beginPath();
    ctx.arc(540, profileCenterY - 30, avatarRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 36px "Plus Jakarta Sans", "Inter", -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initial, 540, profileCenterY - 28);
    ctx.restore();
  }

  // Username
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  ctx.font = `800 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 8;
  ctx.fillText(nameToDisplay, 540, profileCenterY + 22);

  ctx.font = `700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = palette.accentText;
  ctx.fillText(`@${username}`, 540, profileCenterY + 62);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          dataUrl: canvas.toDataURL("image/png")
        });
      } else {
        reject(new Error("Failed to generate profile share card blob"));
      }
    }, "image/png", 1.0);
  });
}

/**
 * Generates an ultra-sleek, unique Whisper Signature Story Card (1080x1920 / 9:16)
 * Aesthetic: Midnight Obsidian Noir 🌚, Electric Neon Violet & Indigo Glow,
 * Cyber-Encrypted Frosted Glass, and bold typography. Completely distinct from NGL.
 */

export interface ShareCardOptions {
  text: string;
  reaction?: string;
  mood?: string;
  publicUrl?: string;
  username?: string;
  mode?: WhisperMode | string;
  theme?: ProfileCardTheme;
}

export async function generateShareImageBlob(options: ShareCardOptions): Promise<{ blob: Blob; dataUrl: string }> {
  const { text, reaction, mood, mode: rawMode, theme } = options;

  const activeMode: WhisperMode = typeof rawMode === "object" && rawMode !== null
    ? rawMode
    : getMessageMode(typeof rawMode === "string" ? { mode: rawMode } : null);

  const activeTheme = theme || activeMode.themeStyle || "obsidian";
  const logoImg = await loadLogoImage();

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // 1. Deep Midnight Canvas Background
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  bgGrad.addColorStop(0, "#08090e");
  bgGrad.addColorStop(0.5, "#0b0d14");
  bgGrad.addColorStop(1, "#050608");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Dynamic Ambient Aurora Glows matching mode
  const modeGlowThemes: Record<string, {
    tr: string;
    bl: string;
    center: string;
    strokeColors: [string, string, string, string];
    badgeBorder: string;
    badgeGlow: string;
  }> = {
    obsidian: {
      tr: "rgba(147, 51, 234, 0.28)",
      bl: "rgba(79, 70, 229, 0.25)",
      center: "rgba(168, 85, 247, 0.15)",
      strokeColors: ["#c084fc", "#818cf8", "#38bdf8", "#a855f7"],
      badgeBorder: "rgba(192, 132, 252, 0.45)",
      badgeGlow: "rgba(192, 132, 252, 0.8)"
    },
    neon: {
      tr: "rgba(236, 72, 153, 0.32)",
      bl: "rgba(168, 85, 247, 0.28)",
      center: "rgba(244, 63, 94, 0.18)",
      strokeColors: ["#f43f5e", "#d946ef", "#ec4899", "#a855f7"],
      badgeBorder: "rgba(244, 114, 182, 0.45)",
      badgeGlow: "rgba(244, 114, 182, 0.8)"
    },
    velvet: {
      tr: "rgba(244, 63, 94, 0.32)",
      bl: "rgba(217, 70, 239, 0.25)",
      center: "rgba(251, 113, 133, 0.18)",
      strokeColors: ["#fb7185", "#f43f5e", "#e11d48", "#c084fc"],
      badgeBorder: "rgba(251, 113, 133, 0.45)",
      badgeGlow: "rgba(251, 113, 133, 0.8)"
    },
    sunset: {
      tr: "rgba(249, 115, 22, 0.32)",
      bl: "rgba(234, 88, 12, 0.25)",
      center: "rgba(245, 158, 11, 0.18)",
      strokeColors: ["#f97316", "#fb923c", "#fbbf24", "#ea580c"],
      badgeBorder: "rgba(251, 146, 60, 0.45)",
      badgeGlow: "rgba(251, 146, 60, 0.8)"
    },
    cyberpunk: {
      tr: "rgba(6, 182, 212, 0.32)",
      bl: "rgba(20, 184, 166, 0.25)",
      center: "rgba(56, 189, 248, 0.18)",
      strokeColors: ["#22d3ee", "#06b6d4", "#14b8a6", "#38bdf8"],
      badgeBorder: "rgba(34, 211, 238, 0.45)",
      badgeGlow: "rgba(34, 211, 238, 0.8)"
    }
  };

  const glowTheme = modeGlowThemes[activeTheme] || modeGlowThemes.obsidian;

  // Top-Right Aurora
  const glowTR = ctx.createRadialGradient(880, 260, 40, 880, 260, 580);
  glowTR.addColorStop(0, glowTheme.tr);
  glowTR.addColorStop(0.5, "rgba(99, 102, 241, 0.08)");
  glowTR.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowTR;
  ctx.fillRect(0, 0, 1080, 1920);

  // Bottom-Left Aurora
  const glowBL = ctx.createRadialGradient(200, 1600, 50, 200, 1600, 650);
  glowBL.addColorStop(0, glowTheme.bl);
  glowBL.addColorStop(0.5, "rgba(14, 165, 233, 0.08)");
  glowBL.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowBL;
  ctx.fillRect(0, 0, 1080, 1920);

  // Center subtle back-glow behind card
  const centerGlow = ctx.createRadialGradient(540, 960, 120, 540, 960, 600);
  centerGlow.addColorStop(0, glowTheme.center);
  centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, 1080, 1920);

  // 3. Prepare Text & Geometry
  const rawText = text || "...";
  const emojiStr = [mood, reaction].filter(Boolean).join(" ");

  // Typography sizing based on length
  let fontSize = 54;
  if (rawText.length > 280) fontSize = 38;
  else if (rawText.length > 180) fontSize = 44;
  else if (rawText.length > 90) fontSize = 48;

  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

  const cardW = 900;
  const cardX = (1080 - cardW) / 2; // 90
  const maxTextWidth = cardW - 130; // 770
  const lineHeight = fontSize * 1.44;

  // Split and wrap paragraphs
  const textParagraphs = rawText.split("\n");
  const lines: string[] = [];
  textParagraphs.forEach(p => {
    if (!p.trim()) return;
    const wrapped = wrapText(ctx, p, maxTextWidth);
    lines.push(...wrapped);
  });

  const headerH = 120;
  const emojiH = emojiStr ? 90 : 0;
  const textBlockH = Math.max(lines.length * lineHeight, 140);
  const footerH = 90;
  const bodyPaddingY = 60;

  const totalCardH = Math.min(
    1300,
    Math.max(headerH + emojiH + textBlockH + footerH + bodyPaddingY * 2, 580)
  );

  const cardY = Math.max(260, (1700 - totalCardH) / 2 - 30);
  const cardRadius = 44;

  // 4. Draw Glowing Neon Gradient Border (Underlayer)
  ctx.save();
  ctx.shadowColor = glowTheme.badgeGlow;
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;

  const neonStroke = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + totalCardH);
  neonStroke.addColorStop(0, glowTheme.strokeColors[0]);
  neonStroke.addColorStop(0.35, glowTheme.strokeColors[1]);
  neonStroke.addColorStop(0.7, glowTheme.strokeColors[2]);
  neonStroke.addColorStop(1, glowTheme.strokeColors[3]);

  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 4.5;
  drawRoundedRect(ctx, cardX, cardY, cardW, totalCardH, cardRadius);
  ctx.stroke();
  ctx.restore();

  // 5. Draw Card Body (Dark Obsidian Glass Container)
  ctx.save();
  const cardBgGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + totalCardH);
  cardBgGrad.addColorStop(0, "rgba(19, 21, 33, 0.94)");
  cardBgGrad.addColorStop(0.5, "rgba(13, 15, 24, 0.96)");
  cardBgGrad.addColorStop(1, "rgba(9, 10, 17, 0.98)");
  ctx.fillStyle = cardBgGrad;
  drawRoundedRect(ctx, cardX + 2, cardY + 2, cardW - 4, totalCardH - 4, cardRadius - 2);
  ctx.fill();
  ctx.restore();

  // Subtle inner card top highlight
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.5;
  drawTopRoundedRect(ctx, cardX + 4, cardY + 4, cardW - 8, 80, cardRadius - 4);
  ctx.stroke();
  ctx.restore();

  // 6. Header Section: Clean Floating Badge (No line behind)
  const badgeLabel = `${activeMode.icon} ${activeMode.badge.toUpperCase()} • 100% ANONYMOUS`;
  const badgeW = Math.min(620, Math.max(460, badgeLabel.length * 14.5));
  const badgeH = 64;
  const badgeX = 540 - badgeW / 2;
  const badgeY = cardY + 44;

  ctx.save();
  // Badge pill background
  const badgeBg = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeBg.addColorStop(0, "rgba(255, 255, 255, 0.09)");
  badgeBg.addColorStop(1, "rgba(255, 255, 255, 0.05)");
  ctx.fillStyle = badgeBg;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 32);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = glowTheme.badgeBorder;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 32);
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = glowTheme.badgeGlow;
  ctx.shadowBlur = 10;
  ctx.fillText(badgeLabel, 540, badgeY + badgeH / 2);
  ctx.restore();

  // 7. Render Reaction / Mood (if available)
  let contentStartY = badgeY + badgeH + 36;
  if (emojiStr) {
    ctx.save();
    ctx.font = "64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.fillText(emojiStr, 540, contentStartY + 30);
    ctx.restore();
    contentStartY += emojiH;
  }

  // 8. Render Message Text (Centered in available content zone)
  const availableContentH = (cardY + totalCardH - footerH) - contentStartY;
  const textStartY = contentStartY + (availableContentH / 2) - ((lines.length - 1) * lineHeight / 2);

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  lines.forEach((line, idx) => {
    ctx.fillText(line, 540, textStartY + idx * lineHeight);
  });
  ctx.restore();

  // 9. Card Footer Bar (Modern Clean End-to-End Indicator without slashes)
  const sealY = cardY + totalCardH - 48;
  const sealText = `End-to-End Encrypted • Anonymous ${activeMode.name}`;
  ctx.save();
  ctx.font = `600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const sealMetrics = ctx.measureText(sealText);
  const dotRadius = 4.5;
  const dotSpacing = 12;
  const totalSealW = dotRadius * 2 + dotSpacing + sealMetrics.width;
  const sealStartX = 540 - totalSealW / 2;

  // Glowing emerald status dot
  ctx.fillStyle = "#10b981";
  ctx.shadowColor = "rgba(16, 185, 129, 0.8)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(sealStartX + dotRadius, sealY, dotRadius, 0, Math.PI * 2);
  ctx.fill();

  // Security text
  ctx.fillStyle = "rgba(203, 213, 225, 0.85)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 4;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(sealText, sealStartX + dotRadius * 2 + dotSpacing, sealY);
  ctx.restore();

  // 10. Bottom Story Canvas Branding (Authentic Whisper Logo & Wordmark)
  const brandCenterY = 1730;
  const logoSize = 46;
  const brandWordmark = "WHISPER";

  ctx.save();
  ctx.font = `900 40px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const wordmarkMetrics = ctx.measureText(brandWordmark);
  const totalBrandW = logoSize + 16 + wordmarkMetrics.width;
  const brandStartX = 540 - totalBrandW / 2;
  const logoY = brandCenterY - logoSize / 2 - 14;

  // 1. Draw Authentic Logo Mark
  drawWhisperLogoMark(ctx, brandStartX, logoY, logoSize, logoImg);

  // 2. Draw Wordmark Text
  const logoGrad = ctx.createLinearGradient(brandStartX + logoSize + 16, 0, brandStartX + totalBrandW, 0);
  logoGrad.addColorStop(0, "#ffffff");
  logoGrad.addColorStop(0.6, "#e0e7ff");
  logoGrad.addColorStop(1, glowTheme.strokeColors[0] || "#c084fc");
  ctx.fillStyle = logoGrad;
  ctx.shadowColor = glowTheme.badgeGlow;
  ctx.shadowBlur = 18;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(brandWordmark, brandStartX + logoSize + 16, logoY + logoSize / 2);

  // 3. Draw Subtitle
  ctx.font = `600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "rgba(203, 213, 225, 0.75)";
  ctx.textAlign = "center";
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.fillText("anonymous & encrypted messaging", 540, logoY + logoSize + 26);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve({
          blob,
          dataUrl: canvas.toDataURL("image/png")
        });
      } else {
        reject(new Error("Failed to generate image blob"));
      }
    }, "image/png", 1.0);
  });
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawTopRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}
