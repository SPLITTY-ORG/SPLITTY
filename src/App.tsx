import { useState } from "react";
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
import { Volume2, VolumeX } from "lucide-react";
import { IS_MAINNET } from "./config/gateway.active";

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
    return (
      <Landing
        onLogin={() => {
          setIsLoggingIn(true);
          login();
        }}
        isLoggingIn={isLoggingIn}
      />
    );
  }

  // ========== AUTHENTICATED APP ==========
  return (
    <div className="min-h-screen bg-[#15100B] text-[#EDE3D0] p-4 md:p-6">
      <SwipeableToaster />
      <div className="max-w-7xl mx-auto">
        <nav className="flex flex-wrap items-center justify-between gap-y-2 border-b border-[rgba(242,177,52,0.16)] pb-2 mb-6 gap-x-2">
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
                {IS_MAINNET ? "ARC MAINNET" : "ARC TESTNET"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
              {[
                { id: "split", label: "SPLIT", mobileLabel: "SPLIT" },
                { id: "gateway", label: "FUND GATEWAY", mobileLabel: "FUND" },
                { id: "history", label: "HISTORY", mobileLabel: "HISTORY" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as Tab);
                    play("tab");
                  }}
                  className={`whitespace-nowrap px-2.5 py-1.5 text-xs font-mono transition border-b-2 ${
                    activeTab === tab.id
                      ? "border-[#F2B134] text-[#EDE3D0]"
                      : "border-transparent text-[#9C917E] hover:text-[#EDE3D0]"
                  }`}
                >
                  <span className="sm:hidden">{tab.mobileLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
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

                <div className="flex items-center gap-2 bg-[#1D1712] border border-[rgba(242,177,52,0.16)] rounded-full px-2.5 py-1.5 sm:px-3">
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
                    <span className="sm:hidden text-[10px] font-mono text-[#EDE3D0]">
                      {address ? `${address.slice(0, 4)}…${address.slice(-3)}` : "…"}
                    </span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="text-[#9C917E] hover:text-[#C4553D] transition"
                    title="Disconnect"
                  >
                    <span className="hidden sm:inline text-xs">disconnect</span>
                    <span className="sm:hidden text-[10px]">✕</span>
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
