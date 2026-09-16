import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { usePrivy, useWallets, useLogin } from "@privy-io/react-auth";
import { useChainId } from "wagmi";
import { formatUnits } from "viem";
import { SplitForm } from "./components/SplitForm";
import { History } from "./components/History";
import { GatewayDashboard } from "./components/GatewayDashboard";
import { useAllBalances } from "./hooks/useBalances";
import { useSound } from "./hooks/useSound";
import { GatewayStatus } from "./components/GatewayStatus";
import { RecentActivity } from "./components/RecentActivity";
import SplittyLogo from "./components/SplittyLogo";
import SplittyLoadingText from "./components/SplittyLoadingText";
import {
  ArrowRight,
  FileSpreadsheet,
  Fuel,
  Split,
  Wallet,
  Waypoints,
  Zap,
  Volume2,
  VolumeX,
} from "lucide-react";

type Tab = "split" | "gateway" | "history";

function App() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const handleLogout = async () => {
    window.localStorage.removeItem("splitty-wallet-session");
    await logout();
  };

  const { login } = useLogin({
    onComplete: ({ loginMethod, loginAccount }) => {
      if (!loginMethod) return;

      const isExternalWallet =
        loginMethod === "siwe" ||
        loginMethod === "siws" ||
        loginAccount?.type === "wallet";

      window.localStorage.setItem(
        "splitty-wallet-session",
        isExternalWallet ? "external" : "privy"
      );
    },
  });

  const rabbyWallet = wallets.find(
    (wallet) =>
      wallet.meta?.name?.toLowerCase() === "rabby" ||
      wallet.meta?.id?.toLowerCase().includes("rabby")
  );

  const embeddedWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType === "privy" ||
      wallet.walletClientType === "privy-v2"
  );

  const session =
    typeof window !== "undefined"
      ? window.localStorage.getItem("splitty-wallet-session")
      : null;

  const externalWallet = wallets.find(
    (wallet) =>
      wallet.walletClientType !== "privy" &&
      wallet.walletClientType !== "privy-v2"
  );

  const preferredWallet =
    session === "privy"
      ? embeddedWallet ?? externalWallet ?? wallets[0]
      : session === "external"
        ? externalWallet ?? embeddedWallet ?? wallets[0]
        : externalWallet ?? embeddedWallet ?? wallets[0];

  const address = preferredWallet?.address ?? user?.wallet?.address;

  const chainId = useChainId();
  const { play, muted, toggleMute } = useSound();
  const [activeTab, setActiveTab] = useState<Tab>("split");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [, setStatusMessage] = useState("");

  const { arcWallet, arcGateway, baseGateway, ethGateway, isLoading } =
    useAllBalances();

  const arcWalletNum = arcWallet
    ? parseFloat(formatUnits(BigInt(arcWallet), 6))
    : 0;

  const totalGateway = [arcGateway, baseGateway, ethGateway]
    .filter((b) => b)
    .reduce((sum, b) => sum + parseFloat(b || "0"), 0);

  const handleMuteToggle = () => toggleMute();

  // ========== LOADING SCREEN ==========
  if (!ready) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          backgroundColor: "#15100b",
        }}
      >
        <SplittyLogo size={64} spinning />
        <div style={{ marginTop: "16px" }}>
          <SplittyLoadingText />
        </div>
      </div>
    );
  }

  // ========== LANDING PAGE (unauthenticated) ==========
  if (!authenticated) {
    const features = [
      {
        icon: Split,
        label: "Batch Transfer",
        note: "One transaction, many recipients",
      },
      {
        icon: Waypoints,
        label: "Gateway Bridging",
        note: "Pull funds from other chains",
      },
      {
        icon: Wallet,
        label: "Unified Balance",
        note: "Wallet and Gateway as one pot",
      },
      {
        icon: FileSpreadsheet,
        label: "CSV & Lists",
        note: "Paste or upload, save for reuse",
      },
      {
        icon: Zap,
        label: "Sub-second Finality",
        note: "Settled before you look away",
      },
      {
        icon: Fuel,
        label: "USDC Gas",
        note: "No separate gas token to hold",
      },
    ];

    return (
      <div className="relative min-h-screen overflow-x-hidden bg-[#15100B] text-[#EDE3D0]">
        {/* Ambient glow. Fixed and clipped so it cannot create sideways scroll. */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute left-1/2 top-[-25%] h-[55vh] w-[120vw] -translate-x-1/2 rounded-full bg-[#F2B134] opacity-[0.07] blur-[110px]" />
          <div className="absolute bottom-[-30%] left-1/2 h-[50vh] w-[100vw] -translate-x-1/2 rounded-full bg-[#8A6A2C] opacity-[0.10] blur-[110px]" />
        </div>

        <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 py-14 sm:px-8 sm:py-20">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <SplittyLogo size={34} />
            <span className="font-sans text-lg font-bold tracking-tight text-[#F2B134] sm:text-xl">
              SPLITTY
            </span>
          </div>

          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-[rgba(242,177,52,0.2)] bg-[#1D1712] px-3 py-1 font-mono text-[10px] tracking-[0.15em] text-[#9C917E] sm:text-[11px]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4ADE80]" />
            LIVE ON ARC TESTNET
          </span>

          {/* Headline. No hard line break -- it wraps to suit the viewport. */}
          <h1 className="mt-7 max-w-3xl text-balance text-center font-sans text-[2rem] font-semibold leading-[1.14] tracking-tight text-[#EDE3D0] sm:text-5xl sm:leading-[1.08] lg:text-6xl">
            Pay everyone at once,{" "}
            <span className="text-[#F2B134]">in one transaction</span>
          </h1>

          <p className="mt-5 max-w-xl text-balance text-center font-sans text-[15px] leading-relaxed text-[#9C917E] sm:text-lg">
            Seamlessly distribute USDC or any token on{" "}
            <span className="text-[#EDE3D0]">Arc</span>, powered by{" "}
            <span className="text-[#EDE3D0]">Circle Gateway</span> — a unified
            USDC account for instant cross-chain liquidity.
          </p>

          {/* CTA. Full width on phones, sized to content from sm up. */}
          <div className="mt-9 w-full sm:w-auto">
            <button
              onClick={async () => {
                if (isLoggingIn) return;
                setIsLoggingIn(true);
                try {
                  await login();
                } finally {
                  setTimeout(() => setIsLoggingIn(false), 800);
                }
              }}
              disabled={isLoggingIn}
              className={`group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#F2B134] px-8 py-3.5 font-sans text-base font-bold text-[#15100B] shadow-[0_0_45px_-10px_rgba(242,177,52,0.75)] transition-colors hover:bg-[#FFC65A] ${isLoggingIn ? "opacity-60 cursor-wait" : ""}`}
            >
              {isLoggingIn ? "Opening…" : "Get started"}
              {!isLoggingIn && (
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              )}
            </button>
            <p className="mt-3 text-center font-mono text-[11px] text-[#6B5F4F]">
              Connect a wallet, or sign in with email
            </p>
          </div>

          {/* Features. Two columns on phones, three from sm up, so the last row
              is never a lone orphan. */}
          <div className="mt-14 grid w-full grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4">
            {features.map(({ icon: Icon, label, note }) => (
              <div
                key={label}
                className="rounded-lg border border-[rgba(242,177,52,0.14)] bg-[#1D1712]/70 p-3.5 text-left transition-colors hover:border-[rgba(242,177,52,0.32)] sm:p-4"
              >
                <Icon size={16} className="text-[#F2B134]" />
                <div className="mt-2.5 font-mono text-[12px] font-medium text-[#EDE3D0] sm:text-[13px]">
                  {label}
                </div>
                <div className="mt-1 font-sans text-[11px] leading-snug text-[#6B5F4F] sm:text-xs">
                  {note}
                </div>
              </div>
            ))}
          </div>

          {/* Balance preview */}
          <div className="mt-14 w-full max-w-md rounded-xl border border-[rgba(242,177,52,0.16)] bg-[#1D1712]/80 p-5 text-left sm:mt-16">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#6B5F4F]">
              Unified balance
            </div>
            <div className="mt-1.5 font-mono text-3xl font-bold text-[#F2B134] sm:text-4xl">
              $1,240.00
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-[#9C917E]">
              <span>
                wallet <span className="text-[#EDE3D0]">$480.00</span>
              </span>
              <span className="text-[#6B5F4F]">|</span>
              <span>
                gateway <span className="text-[#EDE3D0]">$760.00</span>
              </span>
            </div>
            <div className="mt-4 border-t border-[rgba(242,177,52,0.1)] pt-3 font-mono text-[10px] text-[#6B5F4F]">
              Example — connect your wallet to see real balances
            </div>
          </div>

          {/* Footer */}
          <div className="mt-14 w-full border-t border-[rgba(242,177,52,0.08)] pt-6 sm:mt-16">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] text-[#6B5F4F]">
              <span>Arc Testnet</span>
              <span aria-hidden="true">·</span>
              <span>Circle Gateway</span>
              <span aria-hidden="true">·</span>
              <span>USDC &amp; ERC-20 tokens</span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <a
                href="https://github.com/SPLITTY-ORG/SPLITTY"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.18)] bg-[#1D1712]/70 px-3 py-1.5 font-mono text-[11px] text-[#9C917E] transition-colors hover:border-[rgba(242,177,52,0.4)] hover:text-[#F2B134]"
                aria-label="Splitty on GitHub"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                GitHub
              </a>
              <a
                href="https://x.com/splittyonarc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.18)] bg-[#1D1712]/70 px-3 py-1.5 font-mono text-[11px] text-[#9C917E] transition-colors hover:border-[rgba(242,177,52,0.4)] hover:text-[#F2B134]"
                aria-label="Splitty on X"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ========== AUTHENTICATED APP ==========
  return (
    <div className="min-h-screen bg-[#15100B] text-[#EDE3D0] p-4 md:p-6">
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      <div className="max-w-7xl mx-auto">
        <nav className="flex flex-wrap items-center justify-between gap-y-2 border-b border-[rgba(242,177,52,0.16)] pb-2 mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <SplittyLogo size={28} />
              <span className="text-xl font-bold font-sans tracking-tight text-[#F2B134]">
                SPLITTY_
              </span>
              <span className="blink-cursor text-[#F2B134]"></span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9C917E] bg-[#1D1712] px-2 py-1 rounded-full border border-[rgba(242,177,52,0.16)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
                ARC TESTNET
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1">
              {[
                { id: "split", label: "SPLIT" },
                { id: "gateway", label: "FUND GATEWAY" },
                { id: "history", label: "HISTORY" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as Tab);
                    play("tab");
                  }}
                  className={`px-3 py-1.5 text-xs font-mono transition border-b-2 ${
                    activeTab === tab.id
                      ? "border-[#F2B134] text-[#EDE3D0]"
                      : "border-transparent text-[#9C917E] hover:text-[#EDE3D0]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {authenticated && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleMuteToggle}
                  className="text-[#9C917E] hover:text-[#EDE3D0] text-sm transition"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                <div className="flex items-center gap-2 bg-[#1D1712] border border-[rgba(242,177,52,0.16)] rounded-full px-3 py-1.5">
                  <button
                    type="button"
                    disabled={!address}
                    onClick={async () => {
                      if (!address) return;

                      try {
                        await navigator.clipboard.writeText(address);
                        setStatusMessage("Wallet address copied.");
                        setTimeout(() => setStatusMessage(""), 2000);
                      } catch {
                        setStatusMessage("Could not copy wallet address.");
                        setTimeout(() => setStatusMessage(""), 2000);
                      }
                    }}
                    title={address ? "Copy wallet address" : "Creating wallet"}
                    className="text-left disabled:cursor-default"
                  >
                    <span className="hidden sm:inline text-xs font-mono text-[#EDE3D0]">
                      {address
                        ? `${address.slice(0, 6)}…${address.slice(-4)}`
                        : "CREATING WALLET…"}
                    </span>

                    <span className="sm:hidden text-xs font-mono text-[#EDE3D0]">
                      {address ? `${address.slice(0, 4)}…` : "CREATING…"}
                    </span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="text-[#9C917E] hover:text-[#C4553D] text-xs transition"
                  >
                    disconnect
                  </button>
                </div>
              </div>
            )}

            {!authenticated && (
              <button
                onClick={() => login()}
                className="btn-primary text-sm py-1.5 px-4"
              >
                Connect
              </button>
            )}
          </div>
        </nav>

        {authenticated ? (
          <>
            {activeTab === "split" && (
              <div className="app-grid">
                <div className="space-y-6">
                  <SplitForm onGoToFundGateway={() => setActiveTab("gateway")} />
                </div>

                <div className="space-y-6">
                  <GatewayStatus />
                  <RecentActivity onViewAll={() => setActiveTab("history")} />
                </div>
              </div>
            )}

            {activeTab === "gateway" && <GatewayDashboard />}
            {activeTab === "history" && <History />}
          </>
        ) : (
          <div className="panel text-center py-16">
            <p className="text-[#9C917E]">
              Connect your wallet to start splitting payments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
