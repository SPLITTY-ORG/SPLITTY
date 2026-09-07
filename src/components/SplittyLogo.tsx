import React from 'react';

interface SplittyLogoProps {
  size?: number;
  spinning?: boolean;
  className?: string;
}

const SplittyLogo: React.FC<SplittyLogoProps> = ({ size = 32, spinning = false, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Splitty logo"
    >
      <style>{`
        @keyframes splitty-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <g
        transform="translate(50,50)"
        style={
          spinning
            ? { animation: 'splitty-rotate 1s linear infinite', transformOrigin: '50% 50%' }
            : undefined
        }
      >
        <path d="M0 0 L0 -40 A10 10 0 0 1 10 -30 L10 -10 A10 10 0 0 1 0 0 Z" fill="#f2b134" />
        <path d="M0 0 L40 0 A10 10 0 0 1 30 10 L10 10 A10 10 0 0 1 0 0 Z" fill="#faeeda" />
        <path d="M0 0 L0 40 A10 10 0 0 1 -10 30 L-10 10 A10 10 0 0 1 0 0 Z" fill="#f2b134" />
        <path d="M0 0 L-40 0 A10 10 0 0 1 -30 -10 L-10 -10 A10 10 0 0 1 0 0 Z" fill="#faeeda" />
        <circle cx="0" cy="0" r="8" fill="#15100b" />
      </g>
    </svg>
  );
};

export default SplittyLogo;
