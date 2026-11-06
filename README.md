<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Schema Explorer

A tool for visually exploring complex JSON schemas and their corresponding data
files — in practice, the llm-d benchmark report schema (`br_v0_2`). Fully static
SPA: it reads schema and data files and renders them, with no backend.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

No API key and no environment configuration are required. In development the app
loads the example schema/data from the `llm-d/llm-d-benchmark` repo; in production
it serves the copies in `public/`.

## Build and deploy

`npm run build` emits a static SPA into `dist/`. The `Dockerfile` packages that
into an nginx image, with `nginx.conf` handling SPA routing and asset caching:

```bash
npm run build
docker build -t benchmark-schema-explorer .
docker run -p 8080:8080 benchmark-schema-explorer
```

## A note on the removed Gemini plumbing

This repo used to carry the scaffolding for a Gemini-backed feature: a
`GEMINI_API_KEY` injected through Vite's `define`, plus the `@google/genai` and
`dotenv` dependencies. **Nothing in `src/` ever referenced it** — there was no AI
code, only the wiring — so it has been removed.

Worth knowing why it mattered: Vite's `define` is a **compile-time literal
substitution**, so any build with a real key in `.env.local` would have published
that key verbatim inside `dist/assets/*.js`, readable by anyone via View Source.

If AI features are ever added here, the key must stay **server-side**. Never
compile a key into client code.
