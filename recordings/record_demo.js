const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3005;
const distDir = path.join(__dirname, '..', 'apps', 'web', 'out');

// Ensure output directories exist
const videoDir = path.join(__dirname, 'videos');
const gifDir = path.join(__dirname, 'gifs');
fs.mkdirSync(videoDir, { recursive: true });
fs.mkdirSync(gifDir, { recursive: true });

// Check arguments
const target = process.argv[2];
if (!['low', 'medium', 'high'].includes(target)) {
  console.error("Usage: node record_demo.js <low|medium|high>");
  process.exit(1);
}

// ── 1. LIGHTWEIGHT STATIC WEB SERVER ──────────────────────────────────────────
const serveStatic = (req, res) => {
  let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url);
  
  // Default to index.html for spa support
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  if (ext === '.css') contentType = 'text/css';
  if (ext === '.png') contentType = 'image/png';
  if (ext === '.jpg') contentType = 'image/jpeg';
  if (ext === '.ico') contentType = 'image/x-icon';
  if (ext === '.svg') contentType = 'image/svg+xml';
  if (ext === '.json') contentType = 'application/json';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
};

const server = http.createServer(serveStatic);
server.listen(PORT, async () => {
  console.log(`📡 Static web server online at http://localhost:${PORT}`);
  
  try {
    await runRecording();
  } catch (err) {
    console.error("❌ Recording process failed:", err);
  } finally {
    server.close(() => {
      console.log("🔌 Web server shut down cleanly.");
      process.exit(0);
    });
  }
});

// ── 2. PLAYWRIGHT RECORDING PROCESS ───────────────────────────────────────────
async function runRecording() {
  console.log(`🎬 Initializing Chromium for '${target.toUpperCase()}' demo...`);
  
  const rawVideoDir = path.join(__dirname, 'videos', 'raw');
  fs.mkdirSync(rawVideoDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: rawVideoDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();
  console.log(`🕸 Navigating to Aether Observatory...`);
  await page.goto(`http://localhost:${PORT}/`);
  
  // Wait for the landing page assets
  await page.waitForTimeout(2000);

  // Click target card
  let cardText = '';
  let durationMs = 0;
  let filenameBase = '';

  if (target === 'low') {
    cardText = 'Simple Reasoning';
    durationMs = 21000; // 12 nodes * 1.4s + padding
    filenameBase = 'low_demo';
  } else if (target === 'medium') {
    cardText = 'Multi-Tool Agent';
    durationMs = 40000; // 25 nodes * 1.4s + padding
    filenameBase = 'medium_demo';
  } else if (target === 'high') {
    cardText = 'Hallucination & Correction';
    durationMs = 52000; // 32 nodes * 1.4s + slowdowns + padding
    filenameBase = 'high_demo';
  }

  console.log(`⚡ Selecting card: "${cardText}"`);
  await page.click(`text="${cardText}"`);
  await page.waitForTimeout(1500);

  console.log(`▶ Triggering replay sequence...`);
  // Click the Play timeline button
  await page.click('[title="Play"]');
  
  console.log(`🎥 Recording viewport stream. Waiting ${durationMs / 1000}s for complete reasoning traversal...`);
  
  // Pacing progress logging
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.waitForTimeout(durationMs / steps);
    console.log(`⏳ Progress: ${Math.round((i / steps) * 100)}% complete`);
  }

  // Capture final screenshot
  const screenshotPath = path.join(__dirname, 'screenshots', `${filenameBase}_final.png`);
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log(`📸 Saved final trace screenshot at: ${screenshotPath}`);

  // Flush video
  console.log(`💾 Closing browser context to flush recording video...`);
  await context.close();
  await browser.close();

  // Find flushed webm file
  const files = fs.readdirSync(rawVideoDir);
  const webmFile = files.find(f => f.endsWith('.webm'));
  if (!webmFile) {
    throw new Error("Could not locate recorded WebM video file!");
  }

  const rawPath = path.join(rawVideoDir, webmFile);
  const mp4Path = path.join(videoDir, `${filenameBase}.mp4`);
  const webpPath = path.join(gifDir, `${filenameBase}.webp`);

  console.log(`⚙ Encoding formats using ffmpeg...`);
  
  // Convert to high-quality compressed MP4
  try {
    execSync(`ffmpeg -y -i "${rawPath}" -c:v libx264 -crf 20 -preset fast -pix_fmt yuv420p "${mp4Path}"`, { stdio: 'ignore' });
    console.log(`✔ successfully exported MP4 video at: ${mp4Path}`);
  } catch (e) {
    console.warn("⚠️ Failed to encode MP4 using ffmpeg. Copying source video directly instead.");
    fs.copyFileSync(rawPath, path.join(videoDir, `${filenameBase}.mp4`));
  }

  // Convert to beautiful fluid WebP animation (using optimized webp settings)
  try {
    execSync(`ffmpeg -y -i "${rawPath}" -vf "fps=10,scale=800:-1" -loop 0 "${webpPath}"`, { stdio: 'ignore' });
    console.log(`✔ successfully exported optimized WebP animation at: ${webpPath}`);
  } catch (e) {
    // If WebP encoder fails, let's fallback to generating a clean GIF!
    console.warn("⚠️ Failed to encode WebP animation using ffmpeg. Attempting GIF export fallback...");
    const gifPath = webpPath.replace('.webp', '.gif');
    try {
      execSync(`ffmpeg -y -i "${rawPath}" -vf "fps=10,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" -loop 0 "${gifPath}"`, { stdio: 'ignore' });
      console.log(`✔ successfully exported fallback GIF animation at: ${gifPath}`);
      // Copy GIF to WebP as a rename fallback so the requested filename is present
      fs.copyFileSync(gifPath, webpPath);
    } catch (gifErr) {
      console.warn("⚠️ Failed to encode GIF animation fallback using ffmpeg.");
    }
  }

  // Clean raw temp folder
  fs.unlinkSync(rawPath);
  try {
    fs.rmdirSync(rawVideoDir);
  } catch (e) {}

  console.log(`🎉 Demo recording successfully finalized for '${target.toUpperCase()}'!`);
}
