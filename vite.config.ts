import { defineConfig } from 'vite';

// Same-origin /api as scrap. Vercel strips /api and herback serves /binter.
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://herback-1.onrender.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
