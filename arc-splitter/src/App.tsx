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
// NEW IMPORTS
import { GatewayStatus } from "./components/GatewayStatus";
import { RecentActivity } from "./components/RecentActivity";

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

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center bg-[#15100B] text-[#EDE3D0]">Loading...</div>;
  }

  const handleMuteToggle = () => {
    toggleMute();
  };

  return (
    <div className="min-h-screen bg-[#15100B] text-[#EDE3D0] p-4 md:p-6">
      <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
      <div className="max-w-7xl mx-auto">
        <nav className="flex items-center justify-between border-b border-[rgba(242,177,52,0.16)] pb-2 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
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
              <button onClick={login} className="btn-primary text-sm py-1.5 px-4">
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
