export type ProfileCardTheme = "obsidian" | "neon" | "velvet" | "sunset" | "cyberpunk";

export interface ProfileShareCardOptions {
  username: string;
  displayName?: string;
  publicUrl: string;
  theme?: ProfileCardTheme;
  headline?: string;
  subheadline?: string;
  qrCodeDataUrl?: string;
}

export async function generateProfileShareCard(options: ProfileShareCardOptions): Promise<{ blob: Blob; dataUrl: string }> {
  const {
    username,
    displayName,
    theme = "obsidian",
    headline = "send me anonymous messages! 🤫"
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080; // Perfect 1:1 Square Shape Card
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

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

  // 4. Top Brand Header ("🌚 WHISPER")
  const brandPillW = 220;
  const brandPillH = 56;
  const brandPillX = (1080 - brandPillW) / 2;
  const brandPillY = cardY + 60;

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  drawRoundedRect(ctx, brandPillX, brandPillY, brandPillW, brandPillH, 28);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, brandPillX, brandPillY, brandPillW, brandPillH, 28);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = `800 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🌚 WHISPER", brandPillX + brandPillW / 2, brandPillY + brandPillH / 2);
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

  ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowBlur = 16;

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

  // Initial
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initial, 540, profileCenterY - 28);
  ctx.restore();

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

interface ShareCardOptions {
  text: string;
  reaction?: string;
  mood?: string;
  publicUrl?: string;
  username?: string;
}

export async function generateShareImageBlob(options: ShareCardOptions): Promise<{ blob: Blob; dataUrl: string }> {
  const { text, reaction, mood } = options;

  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  // 1. Deep Midnight Obsidian Noir Canvas Background
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  bgGrad.addColorStop(0, "#08090e");
  bgGrad.addColorStop(0.5, "#0b0d14");
  bgGrad.addColorStop(1, "#050608");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Cosmic Ambient Aurora Glows (Atmospheric depth)
  // Top-Right Electric Violet Aurora
  const glowTR = ctx.createRadialGradient(880, 260, 40, 880, 260, 580);
  glowTR.addColorStop(0, "rgba(147, 51, 234, 0.28)");
  glowTR.addColorStop(0.5, "rgba(99, 102, 241, 0.12)");
  glowTR.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowTR;
  ctx.fillRect(0, 0, 1080, 1920);

  // Bottom-Left Cyan / Deep Indigo Nebula
  const glowBL = ctx.createRadialGradient(200, 1600, 50, 200, 1600, 650);
  glowBL.addColorStop(0, "rgba(79, 70, 229, 0.25)");
  glowBL.addColorStop(0.5, "rgba(14, 165, 233, 0.10)");
  glowBL.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glowBL;
  ctx.fillRect(0, 0, 1080, 1920);

  // Center subtle back-glow behind card
  const centerGlow = ctx.createRadialGradient(540, 960, 120, 540, 960, 600);
  centerGlow.addColorStop(0, "rgba(168, 85, 247, 0.15)");
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

  const headerH = 140;
  const emojiH = emojiStr ? 90 : 0;
  const textBlockH = Math.max(lines.length * lineHeight, 140);
  const footerH = 100;
  const bodyPaddingY = 70;

  const totalCardH = Math.min(
    1300,
    Math.max(headerH + emojiH + textBlockH + footerH + bodyPaddingY * 2, 600)
  );

  const cardY = Math.max(260, (1700 - totalCardH) / 2 - 30);
  const cardRadius = 44;

  // 4. Draw Glowing Neon Gradient Border (Underlayer)
  ctx.save();
  ctx.shadowColor = "rgba(139, 92, 246, 0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;

  const neonStroke = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + totalCardH);
  neonStroke.addColorStop(0, "#c084fc"); // Neon Purple
  neonStroke.addColorStop(0.35, "#818cf8"); // Electric Indigo
  neonStroke.addColorStop(0.7, "#38bdf8"); // Sky Blue / Cyan
  neonStroke.addColorStop(1, "#a855f7"); // Vivid Violet

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

  // 6. Header Section: Glowing Badge ("🔒 SECRET WHISPER")
  const badgeW = 480;
  const badgeH = 68;
  const badgeX = 540 - badgeW / 2;
  const badgeY = cardY + 42;

  ctx.save();
  // Badge pill background
  const badgeBg = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeBg.addColorStop(0, "rgba(99, 102, 241, 0.3)");
  badgeBg.addColorStop(1, "rgba(168, 85, 247, 0.3)");
  ctx.fillStyle = badgeBg;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 34);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = "rgba(192, 132, 252, 0.45)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 34);
  ctx.stroke();

  // Badge Text
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(192, 132, 252, 0.8)";
  ctx.shadowBlur = 12;
  ctx.fillText("🔒 SECRET WHISPER • 100% ANONYMOUS", 540, badgeY + badgeH / 2);
  ctx.restore();

  // Decorative sleek line under header
  ctx.save();
  const divGrad = ctx.createLinearGradient(cardX + 80, 0, cardX + cardW - 80, 0);
  divGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
  divGrad.addColorStop(0.5, "rgba(147, 51, 234, 0.4)");
  divGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 80, cardY + headerH);
  ctx.lineTo(cardX + cardW - 80, cardY + headerH);
  ctx.stroke();
  ctx.restore();

  // 7. Render Reaction / Mood (if available)
  let contentStartY = cardY + headerH + 30;
  if (emojiStr) {
    ctx.save();
    ctx.font = "64px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.fillText(emojiStr, 540, contentStartY + 35);
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

  // 9. Card Footer Bar (Cyber Security Seal)
  const sealY = cardY + totalCardH - 52;
  ctx.save();
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.font = `600 20px -apple-system, BlinkMacSystemFont, "SF Mono", Menlo, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("/// END-TO-END ENCRYPTED CONFESSION ///", 540, sealY);
  ctx.restore();

  // 10. Bottom Story Canvas Branding (Unique Whisper Neon Emblem)
  const brandY = 1720;

  // Moon & Title
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Glowing brand logo
  ctx.font = `900 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const logoGrad = ctx.createLinearGradient(380, brandY, 700, brandY);
  logoGrad.addColorStop(0, "#ffffff");
  logoGrad.addColorStop(0.6, "#e0e7ff");
  logoGrad.addColorStop(1, "#c084fc");
  ctx.fillStyle = logoGrad;
  ctx.shadowColor = "rgba(168, 85, 247, 0.6)";
  ctx.shadowBlur = 20;
  ctx.fillText("🌚 WHISPER", 540, brandY);

  // Subtitle
  ctx.font = `600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "rgba(203, 213, 225, 0.7)";
  ctx.shadowBlur = 8;
  ctx.fillText("anonymous & encrypted messaging", 540, brandY + 46);
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
