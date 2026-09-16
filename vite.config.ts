import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill `Buffer` and `process` globally
      globals: {
        Buffer: true,
        process: true,
      },
      // Whether to polyfill specific modules
      protocolImports: true,
    }),
  ],
  server: {
    host: true,
    allowedHosts: ['ibf87k1u9lh3nl2t4r0hx.preview.studio.arc.io'],
  },
});
