import React from 'react';

const WORD = 'Splitty';

const SplittyLoadingText: React.FC = () => {
  return (
    <div
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '22px',
        fontWeight: 600,
        color: '#faeeda',
        letterSpacing: '1px',
        display: 'flex',
      }}
      aria-label="Splitty"
    >
      <style>{`
        @keyframes splitty-letter {
          0%, 100% { opacity: 0; transform: translateY(4px); }
          50% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      {WORD.split('').map((letter, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            animation: 'splitty-letter 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
};

export default SplittyLoadingText;
