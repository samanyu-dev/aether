# Contributing to Aether

We are thrilled that you want to help refine Aether into the ultimate lightweight AI cognition observatory! Here are the guidelines to ensure a smooth, stable, and cinematic development experience for everyone.

## Core Development Rules

1. **Prioritize Stability & Performance**: Aether is specifically engineered to run smoothly on standard laptops like the MacBook Air. Avoid introducing canvas-heavy elements, custom WebGL/Three.js engines, or giant rendering frameworks.
2. **Keep the Monorepo Organized**:
   - `apps/web`: Next.js frontend with ReactFlow & Zustand.
   - `packages/sdk-python`: The lightweight Python telemetry tracer.
3. **Caps & Safety Limits**:
   - Maintain the memory buffer limit of **5,000 events** on the backend and **200 events** in the UI.
   - Limit graph visualization to **50 visible nodes** max to prevent memory exhaustion and browser slowdown.

## Local Setup

1. **Clone and Install**:
   ```bash
   git clone https://github.com/your-username/Aether.git
   cd Aether
   npm install
   ```
2. **Launch Dev Environment**:
   ```bash
   npm run dev:web
   ```
3. **Launch Backend**:
   ```bash
   cd apps/backend
   pip install -r requirements.txt
   python main.py
   ```

## Pull Request Guidelines

- Ensure typescript builds compile cleanly without warnings.
- Run the demo generator scripts to confirm the visual hierarchy remains intact.
- Decouple intense state calculations from graph rendering loops.
