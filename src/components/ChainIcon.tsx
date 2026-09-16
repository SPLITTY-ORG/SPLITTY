import {
  NetworkBase,
  NetworkEthereum,
  NetworkAvalancheFuji,
  NetworkPolygonAmoy,
  NetworkOptimism,
  NetworkArbitrumOne,
} from "@web3icons/react";

interface ChainIconProps {
  chainKey: string;
  size?: number;
  className?: string;
}

export function ChainIcon({ chainKey, size = 16, className = "" }: ChainIconProps) {
  const props = { size, className: `shrink-0 ${className}`.trim() };

  switch (chainKey) {
    case "arc":
      return (
        <span
          style={{ width: size, height: size, fontSize: size * 0.55 }}
          className="inline-flex items-center justify-center rounded-full bg-[#F2B134] text-[#0D0B09] font-black leading-none shrink-0"
        >
          A
        </span>
      );
    case "baseSepolia":
    case "base":
      return <NetworkBase {...props} />;
    case "ethereumSepolia":
    case "eth":
      return <NetworkEthereum {...props} />;
    case "avalancheFuji":
      return <NetworkAvalancheFuji {...props} />;
    case "polygonAmoy":
      return <NetworkPolygonAmoy {...props} />;
    case "optimismSepolia":
      return <NetworkOptimism {...props} />;
    case "arbitrumSepolia":
      return <NetworkArbitrumOne {...props} />;
    default:
      return null;
  }
}
