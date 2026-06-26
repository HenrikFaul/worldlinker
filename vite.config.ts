import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative so the build works from any sub-path
// (static hosting, preview servers, GitHub Pages, etc.).
export default defineConfig({
  plugins: [react()],
  base: './',
});
