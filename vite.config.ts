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
    allowedHosts: ['.preview.studio.arc.io'],
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'wagmi',
      'viem',
      '@wagmi/core',
      '@tanstack/react-query',
    ],

  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'wagmi',
      'viem',
      '@tanstack/react-query',
      '@wagmi/core',
      '@wagmi/connectors',
      '@privy-io/wagmi',
      'events',
      'buffer',
    ],
    exclude: [
      '@privy-io/react-auth',
      '@solana/kit',
      '@solana/web3.js',
      '@solana-program/token',
      '@solana-program/system',
      '@web3icons/react',
    ],
  },
});
