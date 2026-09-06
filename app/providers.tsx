'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId="cmsme6edh01ig0cjj1do2eqx2"
        config={{
          loginMethods: ['email', 'wallet', 'google'],
          appearance: {
            theme: 'dark',
            accentColor: '#3B82F6',
          },
          defaultChain: {
            id: 5042002,
            name: 'Arc Testnet',
            nativeCurrency: {
              name: 'USDC',
              symbol: 'USDC',
              decimals: 18,
            },
            rpcUrls: {
              default: { http: ['https://rpc.testnet.arc.io'] },
            },
          },
          supportedChains: [
            {
              id: 5042002,
              name: 'Arc Testnet',
              nativeCurrency: {
                name: 'USDC',
                symbol: 'USDC',
                decimals: 18,
              },
              rpcUrls: {
                default: { http: ['https://rpc.testnet.arc.io'] },
              },
            },
          ],
        }}
      >
        {children}
      </PrivyProvider>
    </QueryClientProvider>
  )
}
