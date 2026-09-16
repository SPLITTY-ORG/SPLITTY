import React from "react";
import ReactDOM from "react-dom/client";
import { createConfig, http } from "wagmi";
import { WagmiProvider } from "@privy-io/wagmi";
import { injected } from "@wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { arcTestnet } from "./chains/arcTestnet";
import { baseSepolia, sepolia } from "viem/chains";
import { ErrorBoundary } from "./components/ErrorBoundary";
import App from "./App";
import "./index.css";

const WALLET_SESSION_KEY = "splitty-wallet-session";

const getWalletSession = (): "privy" | "external" | null => {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(WALLET_SESSION_KEY);
  return value === "privy" || value === "external" ? value : null;
};

const config = createConfig({
  chains: [arcTestnet, baseSepolia, sepolia],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(import.meta.env.VITE_ARC_RPC_URL),
    [baseSepolia.id]: http("https://sepolia.base.org"),
    [sepolia.id]: http("https://ethereum-sepolia-rpc.publicnode.com"),
  },
});

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
          defaultChain: arcTestnet,
          supportedChains: [arcTestnet, baseSepolia, sepolia],
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
