import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount, useChainId } from "wagmi";
import { formatUnits } from "viem";
import { SplitForm } from "./components/SplitForm";
import { History } from "./components/History";
import { GatewayDashboard } from "./components/GatewayDashboard";
import { useAllBalances } from "./hooks/useBalances";
import { useSound } from "./hooks/useSound";
import { GatewaySidebar } from "./components/GatewaySidebar";
import { RecentActivitySidebar } from "./components/RecentActivitySidebar";
import { GatewayStatus } from "./components/GatewayStatus";
import { RecentActivity } from "./components/RecentActivity";
import SplittyLogo from "./components/SplittyLogo";
import SplittyLoadingText from "./components/SplittyLoadingText";
import {
  Zap,
  Send,
  Route,
  Layers,
  FileSpreadsheet,
  Wallet,
  Gauge,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

type Tab = "split" | "gateway" | "history";

function App() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address;
  const chainId = useChainId();
  const { play, muted, toggleMute } = useSound();
  const [activeTab, setActiveTab] = useState<Tab>("split");

  const { arcWallet, arcGateway, baseGateway, ethGateway, isLoading } = useAllBalances();

  const arcWalletNum = arcWallet ? parseFloat(formatUnits(BigInt(arcWallet), 6)) : 0;
  const totalGateway = [arcGateway, baseGateway, ethGateway]
    .filter(b => b)
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
      <div className="min-h-screen bg-[#15100B] text-[#EDE3D0] overflow-hidden relative">
        {/* Background blobs */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="absolute left-[calc(50%-11rem)] top-[-20rem] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-30 bg-[#F2B134] opacity-10 blur-3xl sm:left-[calc(50%-30rem)] sm:w-[72rem]"
          />
          <div
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="absolute left-[calc(50%+3rem)] bottom-[-20rem] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-30 bg-[#8A6A2C] opacity-10 blur-3xl sm:left-[calc(50%+36rem)] sm:w-[72rem]"
          />
        </div>

        <div className="relative isolate px-6 pt-14 lg:px-8 flex flex-col items-center justify-center min-h-screen">
          <div className="mx-auto max-w-3xl text-center">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <SplittyLogo size={48} />
            </div>

            {/* Headline – sans-serif */}
            <h1 className="text-4xl font-semibold tracking-tight text-[#EDE3D0] sm:text-5xl md:text-6xl font-sans">
              Streamline Native Arc Tokens and <br className="hidden sm:block" />
              USDC Distribution with Batch Transfer
            </h1>

            {/* Subtext – sans-serif, slightly muted */}
            <p className="mt-6 text-lg font-medium text-[#9C917E] sm:text-xl font-sans">
              Powered by <span className="text-[#F2B134]">Arc</span> and{" "}
              <span className="text-[#F2B134]">Circle Gateway</span>.
              <br className="hidden sm:block" />
              Batch‑send payments across chains with unified balance, sub‑second finality, and USDC‑denominated gas.
            </p>

            {/* Feature pills – font-mono, with updated icons */}
            <div className="mt-10 flex flex-wrap justify-center gap-3 text-sm font-mono">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Send size={14} className="text-[#F2B134]" />
                Batch Transfer
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Route size={14} className="text-[#F2B134]" />
                Gateway Bridging
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Layers size={14} className="text-[#F2B134]" />
                Unified Balance
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <FileSpreadsheet size={14} className="text-[#F2B134]" />
                CSV &amp; Lists
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Gauge size={14} className="text-[#F2B134]" />
                Sub‑second Finality
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <ShieldCheck size={14} className="text-[#F2B134]" />
                USDC Gas
              </span>
            </div>

            {/* CTA Button – always visible, pulse & glow */}
            <div className="mt-12 flex items-center justify-center gap-x-6">
              <button
                onClick={() => login()}
                className="inline-flex items-center justify-center rounded-md bg-[#1D1712] px-8 py-4 text-base font-bold text-[#F2B134] border-2 border-[#F2B134] shadow-[0_0_30px_rgba(242,177,52,0.3)] hover:shadow-[0_0_50px_rgba(242,177,52,0.7)] transition-all duration-200 animate-pulse"
              >
                Get Started <ArrowRight size={18} className="inline-block ml-2" />
              </button>
            </div>

            {/* Illustrative preview – mirrors the real Unified Balance card */}
            <div className="mt-16 max-w-md mx-auto text-left panel opacity-90">
              <div className="terminal-label text-xs">UNIFIED BALANCE</div>
              <div className="text-2xl font-bold font-mono text-[#F2B134]">$1,240.00 USDC</div>
              <div className="flex flex-wrap gap-4 text-sm text-[#9C917E] mt-1">
                <span>
                  wallet <span className="font-mono text-[#EDE3D0]">$480.00</span>
                </span>
                <span className="text-[#6B5F4F]">|</span>
                <span>
                  gateway <span className="font-mono text-[#EDE3D0]">$760.00</span>
                </span>
              </div>
              <div className="text-[10px] text-[#6B5F4F] mt-2">
                Example — connect your wallet to see your real balance
              </div>
            </div>

            {/* Additional feature row – compact technical highlights */}
            <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs font-mono text-[#9C917E]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={12} className="text-[#F2B134]" />
                USDC‑denominated gas
              </span>
              <span className="text-[#6B5F4F]">·</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={12} className="text-[#F2B134]" />
                Sub‑second finality
              </span>
              <span className="text-[#6B5F4F]">·</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 size={12} className="text-[#F2B134]" />
                Stable, predictable fees
              </span>
            </div>

            {/* Footer */}
            <div className="mt-10 text-xs text-[#6B5F4F] border-t border-[rgba(242,177,52,0.08)] pt-6">
              Arc Testnet · Circle Gateway · USDC &amp; ERC‑20 tokens
            </div>
          </div>
        </div>
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
              <span className="text-xl font-bold font-sans tracking-tight text-[#F2B134]">SPLITTY_</span>
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
                  {muted ? "✕" : "♪"}
                </button>
                <div className="flex items-center gap-2 bg-[#1D1712] border border-[rgba(242,177,52,0.16)] rounded-full px-3 py-1.5">
                  <span className="hidden sm:inline text-xs font-mono text-[#EDE3D0]">
                    {address?.slice(0, 6)}…{address?.slice(-4)}
                  </span>
                  <span className="sm:hidden text-xs font-mono text-[#EDE3D0]">
                    {address?.slice(0, 4)}…
                  </span>
                  <button
                    onClick={logout}
                    className="text-[#9C917E] hover:text-[#C4553D] text-xs transition"
                  >
                    disconnect
                  </button>
                </div>
              </div>
            )}
            {!authenticated && (
              <button onClick={() => login()} className="btn-primary text-sm py-1.5 px-4">
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
                  <SplitForm />
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
            <p className="text-[#9C917E]">Connect your wallet to start splitting payments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
