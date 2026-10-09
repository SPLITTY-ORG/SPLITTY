import { useState, useEffect } from "react";
import { SwipeableToaster } from "./components/SwipeableToaster";
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
import { Landing } from "./components/Landing";
import { Volume2, VolumeX, Copy, LogOut, Split, Landmark, Clock } from "lucide-react";
import { IS_MAINNET } from "./config/gateway.active";

type Tab = "split" | "gateway" | "history";

const TABS: { id: Tab; label: string; shortLabel: string; icon: React.ElementType; title: string; eyebrow: string }[] = [
  { id: "split",   label: "SPLIT",        shortLabel: "SPLIT",   icon: Split,    title: "SPLIT USDC.",     eyebrow: "01 · PAYMENTS"      },
  { id: "gateway", label: "FUND GATEWAY", shortLabel: "FUND",    icon: Landmark, title: "FUND GATEWAY.",   eyebrow: "02 · BRIDGE & DEPOSIT" },
  { id: "history", label: "HISTORY",      shortLabel: "HISTORY", icon: Clock,    title: "HISTORY.",        eyebrow: "03 · TRANSACTIONS"  },
];

function App() {
  const { ready, authenticated, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const handleLogout = async () => {
    window.localStorage.removeItem("splitty-wallet-session");
    await logout();
  };

  const { login } = useLogin({
    onComplete: ({ loginMethod, loginAccount }) => {
      setIsLoggingIn(false);
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
    onError: () => setIsLoggingIn(false),
  });

  const rabbyWallet = wallets.find(
    (w) => w.meta?.name?.toLowerCase() === "rabby" || w.meta?.id?.toLowerCase().includes("rabby")
  );

  const embeddedWallet = wallets.find(
    (w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2"
  );

  const session =
    typeof window !== "undefined"
      ? window.localStorage.getItem("splitty-wallet-session")
      : null;

  const externalWallet = wallets.find(
    (w) => w.walletClientType !== "privy" && w.walletClientType !== "privy-v2")

  const preferredWallet =
    session === "privy"
      ? embeddedWallet ?? externalWallet ?? wallets[0]
      : externalWallet ?? embeddedWallet ?? wallets[0];

  const address = preferredWallet?.address ?? user?.wallet?.address;

  const chainId = useChainId();
  const { play, muted, toggleMute } = useSound();
  const [activeTab, setActiveTab] = useState<Tab>("split");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ready && !authenticated) setIsLoggingIn(false);
  }, [ready, authenticated]);

  const { arcWallet, arcGateway, baseGateway, ethGateway, isLoading } = useAllBalances();

  const arcWalletNum = arcWallet ? parseFloat(formatUnits(BigInt(arcWallet), 6)) : 0;
  const totalGateway = [arcGateway, baseGateway, ethGateway]
    .filter(Boolean)
    .reduce((sum, b) => sum + parseFloat(b || "0"), 0);

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#15100B]">
        <SplittyLogo size={64} spinning />
        <div className="mt-4"><SplittyLoadingText /></div>
      </div>
    );
  }

  // ── Unauthenticated ──────────────────────────────────────────────────────────
  if (!authenticated) {
    return (
      <Landing
        onLogin={() => { setIsLoggingIn(true); login(); }}
        isLoggingIn={isLoggingIn}
      />
    );
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;

  // ── Authenticated app ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#15100B] text-[#EDE3D0] flex flex-col">
      <SwipeableToaster />

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[rgba(242,177,52,0.16)] bg-[#15100B] sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <SplittyLogo size={34} />
            <span className="font-mono text-base font-bold tracking-[0.10em] text-[#F2B134] uppercase">
              Splitty
            </span>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-end h-full gap-1" aria-label="App navigation">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); play("tab"); }}
                className={[
                  "relative h-full px-4 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors",
                  "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-colors",
                  activeTab === tab.id
                    ? "text-[#EDE3D0] after:bg-[#F2B134]"
                    : "text-[#8C806D] hover:text-[#EDE3D0] after:bg-transparent",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Network badge */}
            <span className={[
              "hidden sm:inline-flex items-center gap-2 px-2.5 py-1 border font-mono text-[10px] uppercase tracking-[0.14em]",
              IS_MAINNET
                ? "border-[rgba(74,222,128,0.25)] text-[#4ADE80]"
                : "border-[rgba(242,177,52,0.25)] text-[#F2B134]",
            ].join(" ")}>
              <span className={[
                "relative flex h-2 w-2",
              ].join(" ")}>
                <span className={[
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  IS_MAINNET ? "bg-[#4ADE80]" : "bg-[#F2B134]",
                ].join(" ")} />
                <span className={[
                  "relative inline-flex h-2 w-2 rounded-full",
                  IS_MAINNET ? "bg-[#4ADE80]" : "bg-[#F2B134]",
                ].join(" ")} />
              </span>
              {IS_MAINNET ? "Mainnet" : "Testnet"}
            </span>

            {/* Sound toggle */}
            <button
              onClick={toggleMute}
              className="text-[#8C806D] hover:text-[#EDE3D0] transition p-1"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Wallet button */}
            <div className="flex items-center gap-0 border border-[rgba(242,177,52,0.22)] bg-[#1D1712]">
              <button
                type="button"
                disabled={!address}
                onClick={handleCopyAddress}
                title={address ? "Copy address" : "Creating wallet…"}
                className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] text-[#EDE3D0] hover:text-[#F2B134] transition disabled:cursor-default"
              >
                <span className="hidden sm:inline">
                  {address
                    ? `${address.slice(0, 6)}…${address.slice(-4)}`
                    : <span className="inline-block w-20 h-2.5 bg-[#241B14] animate-pulse" />}
                </span>
                <span className="sm:hidden">
                  {address ? `${address.slice(0, 4)}…${address.slice(-3)}` : "…"}
                </span>
                {copied
                  ? <span className="text-[10px] text-[#4ADE80]">copied</span>
                  : <Copy size={11} className="text-[#8C806D]" />
                }
              </button>
              <button
                onClick={handleLogout}
                title="Disconnect"
                className="border-l border-[rgba(242,177,52,0.16)] px-2.5 py-2 text-[#8C806D] hover:text-[#C4553D] transition"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab header (eyebrow + title) ─────────────────────────────────────── */}
      <div className="shrink-0 border-b border-[rgba(242,177,52,0.10)] bg-[#15100B]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <p className="step-label mb-1">{activeTabMeta.eyebrow}</p>
          <h1
            className="font-sans font-bold text-[#EDE3D0] uppercase leading-none tracking-[-0.03em]"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}
          >
            {activeTabMeta.title}
          </h1>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 overflow-x-hidden">
        {activeTab === "split" && (
          <div className="app-grid">
            <div className="space-y-6 min-w-0">
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
      </main>

      {/* ── Bottom tab bar (mobile only) ─────────────────────────────────────── */}
      <nav
        className="md:hidden shrink-0 sticky bottom-0 z-40 bg-[#15100B] border-t border-[rgba(242,177,52,0.16)] flex"
        aria-label="Mobile navigation"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); play("tab"); }}
              className={[
                "flex-1 flex flex-col items-center justify-center gap-1 py-2 min-h-[44px]",
                "font-mono text-[9px] uppercase tracking-[0.12em] transition-colors",
                activeTab === tab.id
                  ? "text-[#F2B134]"
                  : "text-[#8C806D]",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={activeTab === tab.id ? 2 : 1.5} />
              {tab.shortLabel}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
