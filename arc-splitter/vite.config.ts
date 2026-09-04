import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  optimizeDeps: {
    exclude: ['@solana/web3.js', '@solana/kit', '@solana-program/system'],
  },
  build: {
    rollupOptions: {
      external: ['@solana/web3.js', '@solana/kit', '@solana-program/system'],
    },
  },
});
