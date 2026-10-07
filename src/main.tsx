import React from "react";
import ReactDOM from "react-dom/client";
import { createConfig, http } from "wagmi";
import { WagmiProvider } from "@privy-io/wagmi";
import { injected } from "@wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "./chains/arcTestnet";
import { arc } from "./chains/arc";
import {
  baseSepolia,
  sepolia,
  optimismSepolia,
  avalancheFuji,
  polygonAmoy,
  base,
  mainnet,
  optimism,
  avalanche,
  polygon,
} from "viem/chains";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";

const IS_MAINNET = import.meta.env.VITE_APP_ENV === "mainnet";

const WALLET_SESSION_KEY = "splitty-wallet-session";

const getWalletSession = (): "privy" | "external" | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(WALLET_SESSION_KEY);
  return value === "privy" || value === "external" ? value : null;
};

const config = IS_MAINNET
  ? createConfig({
      chains: [arc, base, mainnet, optimism, avalanche, polygon],
      connectors: [injected()],
      transports: {
        [arc.id]: http(import.meta.env.VITE_ARC_MAINNET_RPC_URL || "https://rpc.mainnet.arc.io"),
        [base.id]: http("https://mainnet.base.org"),
        [mainnet.id]: http("https://ethereum-rpc.publicnode.com"),
        [optimism.id]: http("https://mainnet.optimism.io"),
        [avalanche.id]: http("https://api.avax.network/ext/bc/C/rpc"),
        [polygon.id]: http("https://polygon-bor-rpc.publicnode.com"),
      },
    })
  : createConfig({
      chains: [arcTestnet, baseSepolia, sepolia, optimismSepolia, avalancheFuji, polygonAmoy],
      connectors: [injected()],
      transports: {
        [arcTestnet.id]: http(import.meta.env.VITE_ARC_RPC_URL),
        [baseSepolia.id]: http("https://sepolia.base.org"),
        [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
        [optimismSepolia.id]: http("https://sepolia.optimism.io"),
        [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
        [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology"),
      },
    });

const defaultChain = IS_MAINNET ? arc : arcTestnet;
const supportedChains = IS_MAINNET
  ? ([arc, base, mainnet, optimism, avalanche, polygon] as const)
  : ([arcTestnet, baseSepolia, sepolia, optimismSepolia, avalancheFuji, polygonAmoy] as const);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        config={{
          appearance: { theme: "dark" },
          loginMethods: ["email", "wallet"],
          embeddedWallets: {
            ethereum: {
              createOnLogin: "users-without-wallets",
            },
          },
          defaultChain,
          supportedChains,
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider
            config={config}
            setActiveWalletForWagmi={({ wallets }) => {
              const session = getWalletSession();

              const externalWallet = wallets.find(
                (wallet) =>
                  wallet.walletClientType !== "privy" &&
                  wallet.walletClientType !== "privy-v2"
              );

              const privyWallet = wallets.find(
                (wallet) =>
                  wallet.walletClientType === "privy" ||
                  wallet.walletClientType === "privy-v2"
              );

              if (session === "privy") {
                return privyWallet ?? wallets[0];
              }

              if (session === "external") {
                return externalWallet ?? privyWallet ?? wallets[0];
              }

              return externalWallet ?? privyWallet ?? wallets[0];
            }}
          >
            <App />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
