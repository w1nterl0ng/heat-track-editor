import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for GitHub Pages: assets are served under the repo name sub-path.
  base: '/heat-track-editor/',
})
