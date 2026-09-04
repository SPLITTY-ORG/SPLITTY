import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true },
  resolve: {
    alias: {
      '@solana/web3.js': '/src/stubs/empty.ts',
      '@solana/kit': '/src/stubs/empty.ts',
      '@solana-program/token': '/src/stubs/empty.ts',
      '@solana-program/system': '/src/stubs/empty.ts',
    },
  },
});
