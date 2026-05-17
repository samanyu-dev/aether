# Changelog

All notable changes to Aether will be documented in this file.

## [0.2.0-alpha] - 2026-05-17

### Added
- **Showcase Landing Page**: An interactive, Vercel-quality initial view for offline trace previews, built-in architecture SVG flows, and quickstart commands.
- **Offline JSON Replay Loader**: Direct drag-and-drop / upload uploader button built into the top actions panel.
- **One-Click Replay Traces**: Packaged 3 robust reasoning traces (`simple_reasoning`, `tool_agent`, and `hallucination_repair` showing self-correction) loaded in a single click.
- **Enhanced Node Visuals**: Cyan glows for root thoughts, amber pulsing edges for tool calls, and intense warning frames for active hallucinations.

### Changed
- **Monorepo Refactoring**: Cleaned the repository into standard folders: `apps/web` (Next.js app) and `packages/sdk-python` (Python SDK).
- **TypeScript & Build Performance**: Resolved all layout pointer duplicate keys and strict typings, boosting Next.js compilation speed.

### Fixed
- **Memory Buffer Bounds**: Restricted active session memory cap to 5,000 backend entries and capped the UI layout elements to 50 active nodes.
