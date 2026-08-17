import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicVersionPath = path.join(__dirname, 'public', 'version.json');
const srcVersionPath = path.join(__dirname, 'src', 'version.json');

function incrementPatchVersion(versionStr) {
  const cleaned = versionStr.trim().replace(/^v/i, '');
  const parts = cleaned.split('.').map((p) => parseInt(p, 10));

  const major = !isNaN(parts[0]) ? parts[0] : 1;
  const minor = !isNaN(parts[1]) ? parts[1] : 0;
  let patch = !isNaN(parts[2]) ? parts[2] : 0;

  patch += 1;

  return `${major}.${minor}.${patch}`;
}

let rawVersion = '1.0.0';

// Check if running inside GitHub Actions CI/CD pipeline
if (process.env.GITHUB_RUN_NUMBER) {
  const runNumber = parseInt(process.env.GITHUB_RUN_NUMBER, 10) || 1;
  rawVersion = `1.0.${runNumber}`;
  console.log(`[Version Generator] Detected GitHub Action Run #${runNumber}`);
} else if (fs.existsSync(publicVersionPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(publicVersionPath, 'utf8'));
    if (existing && existing.rawVersion) {
      rawVersion = incrementPatchVersion(existing.rawVersion);
    } else if (existing && existing.version) {
      rawVersion = incrementPatchVersion(existing.version);
    } else {
      rawVersion = '1.0.1';
    }
  } catch (err) {
    console.warn('[Version Generator] Error parsing version.json, defaulting to 1.0.1:', err);
    rawVersion = '1.0.1';
  }
} else {
  rawVersion = '1.0.1';
}

const versionData = {
  version: `v${rawVersion}`,
  rawVersion: rawVersion,
  displayVersion: `Whisper v${rawVersion}`,
  buildTime: Date.now(),
  buildDate: new Date().toISOString()
};

fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2));
fs.writeFileSync(srcVersionPath, JSON.stringify(versionData, null, 2));

console.log(`[Version Generator] Generated ${versionData.displayVersion} (${versionData.buildDate})`);
