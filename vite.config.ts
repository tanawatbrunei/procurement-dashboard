import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const mock = fileURLToPath(new URL('./src/demo/mockFirebase.ts', import.meta.url))

// https://vite.dev/config/
// `--mode demo` swaps the Firebase SDK for an in-memory mock (src/demo) so the
// app runs as a static site with fictional data and no backend.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Relative base so the demo works from a sub-path (GitHub Pages) as well as a domain root (Vercel).
  base: mode === 'demo' ? './' : '/',
  resolve: mode === 'demo'
    ? { alias: [{ find: /^firebase\/(app|auth|firestore)$/, replacement: mock }] }
    : undefined,
}))
