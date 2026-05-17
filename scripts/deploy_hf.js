const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const HF_SPACE_URL = 'https://huggingface.co/spaces/Sammy1808/aether';
const distDir = path.join(__dirname, '..', 'apps', 'web', 'out');

console.log("🌌 Starting Aether Hugging Face Deployment Pipeline...");

// ── 1. COMPILE NEXTJS STATIC VISUALIZER ──────────────────────────────────────
try {
  console.log("⚙ Compiling static visualizer assets...");
  execSync('npm run build --prefix apps/web', { stdio: 'inherit' });
  console.log("✔ Compiled successfully!");
} catch (e) {
  console.error("❌ Next.js build failed. Aborting deployment.");
  process.exit(1);
}

// ── 2. WRITE HUGGING FACE METADATA README ────────────────────────────────────
const metadata = `---
title: Aether Observatory
emoji: 🌌
colorFrom: indigo
colorTo: purple
sdk: static
pinned: false
---

# 🌌 Aether AI Cognition Observatory

Headless cinematic replay observatory of AI agent reasoning logs, telemetry data, and guardrail correction lifecycles.

Deployed automatically via Aether CLI.
`;

fs.writeFileSync(path.join(distDir, 'README.md'), metadata, 'utf8');
console.log("✔ Injected Hugging Face Space YAML metadata into README.md");

// ── 3. DETACHED GIT PUSH TO HF SPACE ─────────────────────────────────────────
try {
  console.log("⚡ Initializing isolated Git deployment...");
  
  // Clear any old temp git state in out folder
  const tempGitDir = path.join(distDir, '.git');
  if (fs.existsSync(tempGitDir)) {
    fs.rmSync(tempGitDir, { recursive: true, force: true });
  }

  // Git init and commit
  execSync('git init', { cwd: distDir, stdio: 'ignore' });
  execSync('git checkout -b main', { cwd: distDir, stdio: 'ignore' });
  execSync(`git remote add hf "${HF_SPACE_URL}"`, { cwd: distDir, stdio: 'ignore' });
  
  // Add files
  execSync('git add -A', { cwd: distDir, stdio: 'ignore' });
  execSync('git commit -m "HF static deploy: production visualizer"', { cwd: distDir, stdio: 'ignore' });

  // Force push to space main branch
  console.log(`🚀 Uploading visualizer assets directly to Hugging Face Space...`);
  execSync('git push hf main --force', { cwd: distDir, stdio: 'inherit' });
  
  // Clean up
  fs.rmSync(tempGitDir, { recursive: true, force: true });
  console.log("🎉 Successfully deployed static visualizer to Hugging Face Spaces!");
  console.log(`🔗 Live URL: https://huggingface.co/spaces/Sammy1808/aether`);
} catch (e) {
  console.error("❌ Git push to Hugging Face failed:", e.message);
  process.exit(1);
}
