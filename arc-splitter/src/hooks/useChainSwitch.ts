import { useState, useEffect, useCallback } from "react";
import { useSwitchChain, useAccount } from "wagmi";
import { chainConfig } from "../config/gateway";
import type { ChainKey } from "../config/gateway";

type ChainSwitchState = {
  isMismatched: boolean;
  isSwitching: boolean;
  error: string | null;
};

export function useChainSwitch(targetChainKey: ChainKey) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const targetChain = chainConfig[targetChainKey];
  const targetChainId = targetChain.chainId;

  const [state, setState] = useState<ChainSwitchState>({
    isMismatched: false,
    isSwitching: false,
    error: null,
  });

  // Detect mismatch
  useEffect(() => {
    const mismatched = chainId !== undefined && chainId !== targetChainId;
    setState(prev => ({ ...prev, isMismatched: mismatched, error: null }));
  }, [chainId, targetChainId]);

  const switchChain = useCallback(async () => {
    setState(prev => ({ ...prev, isSwitching: true, error: null }));
    try {
      await switchChainAsync({ chainId: targetChainId });
      setState(prev => ({ ...prev, isSwitching: false, isMismatched: false }));
    } catch (err: any) {
      // Error code 4902 means chain not added – we need to add it
      if (err.code === 4902 || err.message?.includes("chain not added")) {
        try {
          // Add the chain using wallet_addEthereumChain
          const provider = await (window as any).ethereum?.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChain.addParams.chainId,
                chainName: targetChain.addParams.chainName,
                rpcUrls: targetChain.addParams.rpcUrls,
                nativeCurrency: targetChain.addParams.nativeCurrency,
                blockExplorerUrls: targetChain.addParams.blockExplorerUrls,
              },
            ],
          });
          // After adding, try switching again
          await switchChainAsync({ chainId: targetChainId });
          setState(prev => ({ ...prev, isSwitching: false, isMismatched: false }));
        } catch (addErr: any) {
          setState(prev => ({
            ...prev,
            isSwitching: false,
            error: addErr.message || "Failed to add network",
          }));
        }
      } else if (err.code === 4001) {
        // User rejected the switch
        setState(prev => ({
          ...prev,
          isSwitching: false,
          error: "Network switch was cancelled — approve it in your wallet to continue.",
        }));
      } else {
        setState(prev => ({
          ...prev,
          isSwitching: false,
          error: err.message || "Failed to switch network",
        }));
      }
    }
  }, [switchChainAsync, targetChainId, targetChain.addParams]);

  return {
    ...state,
    switchChain,
    targetChain,
  };
}
