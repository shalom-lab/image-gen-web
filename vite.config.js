import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project site: https://<user>.github.io/image-gen-web/
  // Keep Vite dev server at the root while building the Pages artifact.
  base: process.env.GITHUB_ACTIONS ? '/image-gen-web/' : '/',
  plugins: [react()],
});
