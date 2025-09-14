# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository overview
- Stack: Static frontend (HTML/CSS/JS). No bundler or test runner configured. Deployment via Netlify.
- Entrypoint: index.html served from repo root.
- Notable configs/docs: netlify.toml (deploy + proxy), POLLINATIONS_INTEGRATION.md (provider fallback design).

Common commands
- Serve locally (simple static server):
  ```bash path=null start=null
  # Option A: Python (macOS has Python 3 preinstalled)
  python3 -m http.server 8081
  # visit http://localhost:8081/index.html
  ```
  ```bash path=null start=null
  # Option B: Node (if you prefer)
  npx http-server -p 8081 .
  # or
  npx serve -l 8081 .
  ```
- Serve with Netlify proxy (to mirror production redirects/headers):
  ```bash path=null start=null
  # Requires Netlify CLI: npm i -g netlify-cli
  netlify dev --port=8081
  # visit http://localhost:8081 and exercise calls to /api/* via local proxy
  ```
- Build: None defined in package.json (scripts.build = "echo 'no build script'")
- Lint/format: No linter/formatter configured in this repo.

Manual test pages
The repo uses browser-based test pages instead of a unit test framework. Serve the repo, then open these pages to validate features:
- /test-models.html — Verify model list/config display
- /test-pollinations.html — Exercise Pollinations.AI integration
- /test-streaming.html — Validate streaming UI/logic
- /test-mobile.html — Validate mobile CSS/UX fixes
- /test-fallback.html — Validate provider fallback behavior

Examples:
```bash path=null start=null
# After starting a local server on 8081
open http://localhost:8081/test-pollinations.html
open http://localhost:8081/test-models.html
```

High-level architecture
- index.html: Single-page UI shell with extensive CSS variables and responsive layout rules. Loads all JS modules directly without a bundler.
- css/ (styles only):
  - main.css, responsive.css, mobile-fixes.css: Layout, responsiveness, and mobile DX (100dvh, sticky input area, etc.).
  - components.css, animations.css, themes.css: Component styles, transitions, and theming.
- js/ (behavioral modules):
  - main.js: Application bootstrap and core UI interactions across the chat interface.
  - components.js: Reusable UI elements (cards, modals, inputs, headers) referenced by main.js.
  - models.js: Centralized model metadata and presentation details (labels, colors, availability flags).
  - gpt4free-integration.js: Primary provider integration for GPT4Free/Puter; coordinates requests and model IDs when available.
  - pollinations-provider.js: Alternative provider with OpenAI-compatible endpoints. Used as fallback when GPT4Free/Puter is unavailable or rejects models.
  - local-server-provider.js: Uses a backend reachable under /api/*; intended to be proxied in production by Netlify (see netlify.toml).
  - storage.js: Local persistence (e.g., recent chats, preferences) for fast UX.
  - theme.js: Light/dark theming and runtime CSS variable management.
  - utils.js: Shared helpers (formatting, network utilities, etc.).
  - comparison.js: Model/provider comparison logic and associated UI.
- img/: Static icons/thumbnails for model branding in the UI.

Provider and fallback design (summarized from POLLINATIONS_INTEGRATION.md)
- Selection flow:
  1) Try GPT4Free/Puter first.
  2) If unavailable, timing out, or rejecting selected model, transparently switch to Pollinations.AI.
  3) Maintain provider-specific model histories and adjust UI to reflect availability.
- Model mapping (examples):
  - ChatGPT → openai (on Pollinations)
  - Gemini → gemini (Pollinations)
  - Grok → mistral (fallback mapping)
  - DeepSeek → qwen-coder (fallback mapping)
  - Claude → not available on Pollinations (UI disables when on Pollinations)
- Streaming and non-streaming supported; UI indicates provider/model availability and fallbacks.

Networking and deployment
- Netlify configuration (netlify.toml):
  - build.publish = "." (serve repo root as static site)
  - Proxy: All /api/* requests are forwarded to http://13.61.23.21:8080/:splat
  - Headers: Cache-Control set to public, max-age=600 for all paths
- Local development parity:
  - For accurate /api/* behavior while developing, prefer running with Netlify Dev so that redirects and headers emulate production.

Development workflow tips (repo-specific)
- Since there’s no bundler or module system, changes to JS/CSS take effect immediately on refresh. Use a static server with live reload if desired.
- Manual tests are the source of truth; validate features by loading the appropriate test-*.html pages.
- When verifying fallback behavior, check the browser console for logs indicating provider selection ("Using GPT4Free" vs "Using Pollinations.AI").

Security note
- A file named api.txt exists and appears to contain tokens. Treat these as sensitive. Do not display, log, or commit any secrets in commands or outputs. Use the Netlify /api/* proxy in development and production rather than embedding secrets client-side.

