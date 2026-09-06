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
import { Zap, Split, Link, Layers, FileText, Plus, ArrowRight } from "lucide-react";

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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#15100b'
      }}>
        <SplittyLogo size={64} spinning />
        <div style={{ marginTop: '16px' }}>
          <SplittyLoadingText />
        </div>
      </div>
    );
  }

  // ========== LANDING PAGE (unauthenticated) ==========
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#15100B] text-[#EDE3D0] overflow-hidden relative">
        <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
          <div
            style={{
              clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="absolute left-[calc(50%-11rem)] top-[-20rem] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-30 bg-[#F2B134] opacity-10 blur-3xl sm:left-[calc(50%-30rem)] sm:w-[72rem]"
          />
          <div
            style={{
              clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
            className="absolute left-[calc(50%+3rem)] bottom-[-20rem] aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-30 bg-[#C4553D] opacity-10 blur-3xl sm:left-[calc(50%+36rem)] sm:w-[72rem]"
          />
        </div>

        <div className="relative isolate px-6 pt-14 lg:px-8 flex flex-col items-center justify-center min-h-screen">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <SplittyLogo size={48} />
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-[#EDE3D0] sm:text-6xl">
              Distribute USDC &amp; Custom Tokens
            </h1>
            <p className="mt-6 text-lg font-medium text-[#9C917E] sm:text-xl">
              Powered by <span className="text-[#F2B134]">Circle Gateway</span> and <span className="text-[#F2B134]">Arc</span>.
              <br className="hidden sm:block" />
              Batch-send payments across chains with unified balance.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-mono">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Zap size={14} className="text-[#F2B134]" />
                Multicall3From
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Link size={14} className="text-[#F2B134]" />
                Gateway Bridging
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <Layers size={14} className="text-[#F2B134]" />
                Unified Balance
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(242,177,52,0.16)] bg-[#1D1712] px-4 py-1.5 text-[#EDE3D0]">
                <FileText size={14} className="text-[#F2B134]" />
                CSV &amp; Saved Lists
              </span>
            </div>

            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => login()}
                className="rounded-md bg-[#F2B134] px-6 py-3 text-sm font-semibold text-[#15100B] shadow-sm hover:bg-[#D99A2A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F2B134] transition"
              >
                Connect Wallet <ArrowRight size={14} className="inline-block ml-1" />
              </button>
              <a
                href="#"
                className="text-sm font-semibold text-[#9C917E] hover:text-[#EDE3D0] transition"
                onClick={(e) => e.preventDefault()}
              >
                Learn more <span aria-hidden="true">→</span>
              </a>
            </div>

            <div className="mt-16 text-xs text-[#6B5F4F] border-t border-[rgba(242,177,52,0.08)] pt-6">
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
        <nav className="flex items-center justify-between border-b border-[rgba(242,177,52,0.16)] pb-2 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <SplittyLogo size={28} />
              <span className="text-xl font-bold font-sans tracking-tight text-[#F2B134]">SPLITTY_</span>
              <span className="blink-cursor text-[#F2B134]"></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-[#9C917E] bg-[#1D1712] px-2 py-1 rounded-full border border-[rgba(242,177,52,0.16)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse"></span>
                ARC TESTNET
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              {[
                { id: "split", label: "SPLIT" },
                { id: "gateway", label: "GATEWAY" },
                { id: "history", label: "HISTORY" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as Tab); play("tab"); }}
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
                  <span className="text-xs font-mono text-[#EDE3D0]">
                    {address?.slice(0, 6)}…{address?.slice(-4)}
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
