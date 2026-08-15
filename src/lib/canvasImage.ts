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
