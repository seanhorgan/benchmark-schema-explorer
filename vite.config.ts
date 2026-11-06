import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// NOTE: deliberately no `define` block here.
//
// It used to do:
//   'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
// which is a compile-time literal substitution — the key was inlined into the
// published bundle at dist/assets/*.js, readable by anyone via View Source.
// Nothing in src/ ever referenced it, so the plumbing has been removed rather
// than merely disabled. If an AI feature is ever added to this app, the key must
// stay server-side; it must never be compiled into client code.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    // HMR can be disabled via DISABLE_HMR (kept so editor/agent tooling can turn
    // it off and avoid flickering during automated edits).
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
