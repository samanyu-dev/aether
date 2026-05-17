# Aether 🌌 — Public Release & Deployment Guide

This guide maps out the deployment blueprints, configuration profiles, and release steps to launch **Aether** into public production environments, presenting it as a world-class, interview-ready "portfolio centerpiece."

---

## 🌎 1. Two-Tiered Deployment Strategy

To reach maximum audience, Aether is structured to support two distinct public endpoints:

| Deployed Version | Hosting Platform | Target Audience | Runtime Mode | Core Features |
| :--- | :--- | :--- | :--- | :--- |
| **Official Showcase** | Vercel | Recruiters, Interviewers, GitHub | Serverless / Static | Polished Landing, 3 Static Demos, Architecture Walkthrough, Social OpenGraph previews |
| **Interactive Sandbox** | HF Spaces | AI Developers, Sandbox users | Static SDK | Live Drag-and-drop local trace upload, Timeline Scrubber, Hallucination debugger |

---

## 🏗️ 2. Step-by-Step Vercel Serverless Deployment

Aether’s Next.js web application is optimized to run as a **100% serverless static export**, removing any live websocket or active python backend requirement for general visitors.

### Setup Steps
1.  **Install Vercel CLI** (Optional, or connect GitHub repo directly to Vercel Dashboard):
    ```bash
    npm install -g vercel
    ```
2.  **Verify Production Configuration**:
    *   Our Next.js config [next.config.ts](file:///Users/apple/Desktop/Aether/apps/web/next.config.ts) is pre-configured with `output: "export"` and `images: { unoptimized: true }`.
    *   Our routing manifest [vercel.json](file:///Users/apple/Desktop/Aether/apps/web/vercel.json) enforces security headers (DENY frames, XSS blocks, nosniff content).
3.  **Run Compilation Locally to Verify**:
    ```bash
    cd apps/web
    npm run build
    ```
    *(Outputs a production-grade, pre-rendered `out/` folder in under 3 seconds)*
4.  **Deploy Command**:
    ```bash
    # Run from apps/web folder to deploy to Vercel
    vercel --prod
    ```
5.  **Environment Variables**:
    *   If you choose to host a public live WebSocket endpoint (e.g. on Render/Heroku/Fly.io), configure the `NEXT_PUBLIC_AETHER_WS_URL` environment variable inside Vercel's Project Settings.
    *   Otherwise, **leave it blank** to let the dashboard fall back safely and silently to local offline playback with zero console warnings!

---

## 🤗 3. Hugging Face Spaces Deployment

Hugging Face Spaces supports serving static HTML applications globally for free using their **Static SDK**.

### Setup Steps
1.  **Create Space**: Log in to Hugging Face, click **New Space**, name it `aether-observatory`, and select **Static** as the SDK template.
2.  **Generate compiled export**:
    ```bash
    cd apps/web
    npm run build
    ```
3.  **Upload Build Files**:
    *   Clone your HF Space git repository locally.
    *   Copy the entire compiled contents of `apps/web/out/*` directly into your HF Space folder.
4.  **Add Hugging Face Metadata**:
    *   Copy the pre-configured [HUGGINGFACE_README.md](file:///Users/apple/Desktop/Aether/docs/HUGGINGFACE_README.md) to the root of your Space, naming it `README.md`.
    *   The YAML header at the top of the README tells Hugging Face to serve Aether's index dashboard:
        ```yaml
        ---
        title: Aether AI Cognition Observatory
        emoji: 🌌
        colorFrom: indigo
        colorTo: cyan
        sdk: static
        pinned: false
        ---
        ```
5.  **Git Push**:
    ```bash
    git add .
    git commit -m "Launch Aether Cinematic Observatory Playground"
    git push origin main
    ```

---

## 📈 4. Portability & High-Performance Audit

To guarantee the project is stable on lower-spec hardware (MacBook Air) and requires **no setup friction**:
*   **Decoupled Replay Store**: State scrubbing maps to portable JSON arrays. Hitting playback or timeline scrolling runs purely inside client memory.
*   **Websocket Failures Silenced**: If WS URL connection fails, the socket silently detaches without looping reconnection retry alerts or polluting production developer tools.
*   **Pure CSS Rendering**: Node entry animations (`framer-motion`) and SVG link sweeps avoid heavy WebGL canvas instances, preserving low CPU usage.
