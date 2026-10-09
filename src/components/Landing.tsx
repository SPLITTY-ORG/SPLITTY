import {
  ArrowRight,
  BookOpen,
  Split,
  Waypoints,
  Wallet,
  FileSpreadsheet,
  Zap,
  Fuel,
  PlugZap,
  Users,
  SendHorizonal,
} from "lucide-react";
import SplittyLogo from "./SplittyLogo";
import { IS_MAINNET } from "../config/gateway.active";

const GithubIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

const XLogoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);


// ── Notched CTA button (Agon TagButton pattern) ───────────────────────────────
// clip-path: top-right corner is cut at 14px; hover lifts 1px; no rounded corners.
const NOTCH = "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)";

interface TagButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
  href?: string;
  target?: string;
  rel?: string;
}

function TagButton({ onClick, disabled, children, variant = "primary", href, target, rel }: TagButtonProps) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 font-mono text-[13px] uppercase tracking-[0.12em] px-5 py-2.5 transition-transform duration-100 select-none whitespace-nowrap";
  const variantCls =
    variant === "primary"
      ? "bg-[#F2B134] text-[#15100B] hover:-translate-y-px hover:bg-[#D99A2A] disabled:opacity-50 disabled:pointer-events-none"
      : "border border-[rgba(242,177,52,0.45)] text-[#EDE3D0] hover:-translate-y-px hover:border-[#F2B134] hover:text-[#F2B134] disabled:opacity-50";

  if (href) {
    return (
      <a href={href} target={target} rel={rel} className={`${base} ${variantCls}`} style={{ clipPath: NOTCH }}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variantCls}`}
      style={{ clipPath: variant === "primary" ? NOTCH : undefined }}
    >
      {children}
    </button>
  );
}

// ── Section eyebrow label ─────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.20em] text-[#B8923F]">
      {children}
    </p>
  );
}

// ── Hairline divider ──────────────────────────────────────────────────────────
function Hairline({ className = "" }: { className?: string }) {
  return <div className={`border-t border-[rgba(242,177,52,0.16)] ${className}`} />;
}

// ── Faint pinwheel background mark ───────────────────────────────────────────
function PinwheelMark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute"
        style={{
          right: "-10%",
          top: "50%",
          transform: "translateY(-50%)",
          width: "min(780px, 95vw)",
          aspectRatio: "1",
          opacity: 0.07,
        }}
      >
        <SplittyLogo size="100%" />
      </div>
    </div>
  );
}

// ── Feature grid data ─────────────────────────────────────────────────────────
const FEATURES = [
  { n: "01", icon: Split,         label: "BATCH TRANSFER",    copy: "One transaction, any number of recipients — USDC or any ERC-20." },
  { n: "02", icon: Waypoints,     label: "GATEWAY BRIDGING",  copy: "Pull USDC from Base, Ethereum, Avalanche, OP, or Polygon." },
  { n: "03", icon: Wallet,        label: "UNIFIED BALANCE",   copy: "Wallet and Gateway treated as a single pool of funds." },
  { n: "04", icon: FileSpreadsheet, label: "CSV & SAVED LISTS", copy: "Upload a spreadsheet, paste addresses, or reuse a saved list." },
  { n: "05", icon: Zap,           label: "SUB-SECOND FINALITY", copy: "Arc settles before you look away. Fees paid in USDC." },
  { n: "06", icon: Fuel,          label: "NO GAS TOKEN",      copy: "USDC is the native gas on Arc — nothing else to hold." },
];

// ── How it works steps ────────────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    icon: PlugZap,
    title: "CONNECT YOUR WALLET",
    copy: "Sign in with a browser wallet or email. No setup, no seed phrase required.",
  },
  {
    n: "02",
    icon: Users,
    title: "ADD RECIPIENTS",
    copy: "Paste addresses, upload a CSV, or pick a saved list. Equal or custom amounts.",
  },
  {
    n: "03",
    icon: SendHorizonal,
    title: "SEND AT ONCE",
    copy: "Review, confirm once. Every recipient receives their share in one on-chain call.",
  },
];

// ── Main component ────────────────────────────────────────────────────────────
interface LandingProps {
  onLogin: () => void;
  isLoggingIn: boolean;
}

export function Landing({ onLogin, isLoggingIn }: LandingProps) {
  const network = IS_MAINNET ? "ARC MAINNET" : "ARC TESTNET";
  const networkHref = IS_MAINNET
    ? "https://splitty-testnet.vercel.app"
    : "https://splitty.live";
  const networkLabel = IS_MAINNET ? "TRY TESTNET" : "TRY MAINNET";

  return (
    <div className="min-h-[100svh] bg-[#15100B] text-[#EDE3D0] flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-[rgba(242,177,52,0.16)]">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-8">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <SplittyLogo size={34} />
            <span className="font-mono text-base font-bold tracking-[0.10em] text-[#F2B134] uppercase">
              Splitty
            </span>
          </div>

          {/* Nav links — hidden on mobile */}
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            <a
              href="https://splittyonarc.gitbook.io/splitty-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C806D] hover:text-[#EDE3D0] transition-colors"
            >
              <BookOpen size={11} strokeWidth={1.8} />
              Docs
            </a>
            <a
              href="https://github.com/SPLITTY-ORG/SPLITTY"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C806D] hover:text-[#EDE3D0] transition-colors"
            >
              <GithubIcon />
              GitHub
            </a>
            <a
              href="https://x.com/splittyonarc"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C806D] hover:text-[#EDE3D0] transition-colors"
            >
              <XLogoIcon />
              X
            </a>
          </nav>

          {/* Right side: network badge + launch button */}
          <div className="flex items-center gap-3">
            <span className={[
              "hidden lg:inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
              IS_MAINNET
                ? "border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.08)] text-[#4ADE80]"
                : "border-[rgba(242,177,52,0.25)] bg-[rgba(242,177,52,0.08)] text-[#F2B134]",
            ].join(" ")}>
              {/* pulsing dot */}
              <span className="relative flex h-2 w-2">
                <span className={[
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  IS_MAINNET ? "bg-[#4ADE80]" : "bg-[#F2B134]",
                ].join(" ")} />
                <span className={[
                  "relative inline-flex h-2 w-2 rounded-full",
                  IS_MAINNET ? "bg-[#4ADE80]" : "bg-[#F2B134]",
                ].join(" ")} />
              </span>
              {IS_MAINNET ? "Live on Mainnet" : "Live on Testnet"}
            </span>
            <TagButton variant="ghost" onClick={onLogin} disabled={isLoggingIn}>
              {isLoggingIn ? "OPENING…" : <><ArrowRight size={13} />LAUNCH APP</>}
            </TagButton>
          </div>
        </div>

        {/* Mobile sub-nav */}
        <nav
          aria-label="Public mobile"
          className="flex flex-wrap items-center justify-center gap-4 border-t border-[rgba(242,177,52,0.10)] px-4 py-2 lg:hidden"
        >
          {/* Live badge — mobile only */}
          <span className={[
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
            IS_MAINNET
              ? "border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.08)] text-[#4ADE80]"
              : "border-[rgba(242,177,52,0.25)] bg-[rgba(242,177,52,0.08)] text-[#F2B134]",
          ].join(" ")}>
            <span className="relative flex h-2 w-2">
              <span className={[
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                IS_MAINNET ? "bg-[#4ADE80]" : "bg-[#F2B134]",
              ].join(" ")} />
              <span className={[
                "relative inline-flex h-2 w-2 rounded-full",
                IS_MAINNET ? "bg-[#4ADE80]" : "bg-[#F2B134]",
              ].join(" ")} />
            </span>
            {IS_MAINNET ? "Live on Mainnet" : "Live on Testnet"}
          </span>
          <a
            href="https://splittyonarc.gitbook.io/splitty-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C806D]"
          >
            <BookOpen size={11} strokeWidth={1.8} />
            Docs
          </a>
          <a
            href="https://github.com/SPLITTY-ORG/SPLITTY"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C806D]"
          >
            <GithubIcon />
            GitHub
          </a>
          <a
            href="https://x.com/splittyonarc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8C806D]"
          >
            <XLogoIcon />
            X
          </a>
        </nav>
      </header>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1440px] px-4 pb-20 pt-10 sm:px-8 sm:pb-28 sm:pt-14">

          {/* ── Hero section ─────────────────────────────────────────────── */}
          <section className="relative isolate border-b border-[rgba(242,177,52,0.16)] pb-14 sm:pb-20">
            <PinwheelMark />

            <div className="relative z-10 max-w-[960px]">
              <Eyebrow>PAY EVERYONE AT ONCE.</Eyebrow>

              <h1
                className="mt-6 font-sans font-bold uppercase text-[#EDE3D0] leading-[0.88] tracking-[-0.05em]"
                style={{ fontSize: "clamp(3.4rem, 11vw, 8.5rem)" }}
              >
                Cross-chain USDC batch<br />
                <span className="text-[#F2B134]">payments on Arc.</span>
              </h1>

              <p className="mt-7 max-w-[52ch] text-base leading-7 text-[#9C917E] sm:text-lg sm:leading-8 text-pretty">
                Split USDC or any ERC-20 to dozens of wallets — one transaction, from any supported chain.
                Powered by Arc and Circle Gateway.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <TagButton onClick={onLogin} disabled={isLoggingIn} variant="primary">
                  {isLoggingIn ? "OPENING…" : <><ArrowRight size={13} />GET STARTED</>}
                </TagButton>
                <TagButton
                  href="https://splittyonarc.gitbook.io/splitty-docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                >
                  <BookOpen size={13} />READ DOCS
                </TagButton>
              </div>

              <p className="mt-4 font-mono text-[11px] text-[#8C806D]">
                Connect a wallet or sign in with email — no setup required.
              </p>
            </div>
          </section>

          {/* ── Feature grid ─────────────────────────────────────────────── */}
          <section className="mt-16 sm:mt-20" aria-labelledby="features-heading">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[rgba(242,177,52,0.16)] pb-5">
              <div>
                <Eyebrow>WHAT IT DOES</Eyebrow>
                <h2
                  id="features-heading"
                  className="mt-3 font-sans font-bold uppercase text-[#EDE3D0] leading-[0.92] tracking-[-0.04em] text-4xl sm:text-6xl"
                >
                  Everything you need<br className="hidden sm:block" /> to split payments.
                </h2>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ n, icon: Icon, label, copy }, i) => (
                <div
                  key={n}
                  className={[
                    "min-h-[200px] border-b border-[rgba(242,177,52,0.16)] py-7 sm:px-6",
                    i % 2 === 0 ? "sm:border-r sm:border-[rgba(242,177,52,0.16)]" : "sm:border-r-0",
                    i % 3 !== 2 ? "lg:border-r lg:border-[rgba(242,177,52,0.16)]" : "lg:border-r-0",
                    i % 3 === 0 ? "lg:pl-0" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em]">
                    <span className="flex items-center gap-1.5 text-[#F2B134]">
                      <Icon size={13} strokeWidth={1.8} />
                      {label}
                    </span>
                    <span className="text-[#8C806D]">{n}</span>
                  </div>
                  <p className="mt-10 max-w-[38ch] text-sm leading-6 text-[#9C917E]">{copy}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────────────────── */}
          <section className="mt-16 sm:mt-20" aria-labelledby="how-heading">
            <div className="border-b border-[rgba(242,177,52,0.16)] pb-5">
              <Eyebrow>HOW IT WORKS</Eyebrow>
              <h2
                id="how-heading"
                className="mt-3 max-w-[18ch] font-sans font-bold uppercase text-[#EDE3D0] leading-[0.92] tracking-[-0.04em] text-4xl sm:text-6xl"
              >
                From a wallet to everyone paid.
              </h2>
            </div>

            <ol className="grid border-b border-[rgba(242,177,52,0.16)] md:grid-cols-3">
              {STEPS.map(({ n, icon: Icon, title, copy }, index) => (
                <li
                  key={n}
                  className={[
                    "min-h-[220px] border-b border-[rgba(242,177,52,0.16)] py-7 md:border-b-0",
                    index > 0 ? "md:border-l md:border-[rgba(242,177,52,0.16)] md:pl-6" : "",
                    index < 2 ? "md:pr-6" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-sans font-bold text-[#F2B134] leading-none tracking-[-0.04em]"
                      style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
                      aria-hidden="true"
                    >
                      {n}
                    </span>
                    <Icon size={22} strokeWidth={1.5} className="text-[#F2B134] opacity-60" />
                  </div>
                  <h3 className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#EDE3D0]">
                    {title}
                  </h3>
                  <p className="mt-3 max-w-[38ch] text-sm leading-6 text-[#9C917E]">{copy}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* ── CTA band ─────────────────────────────────────────────────── */}
          <section className="mt-16 grid gap-8 border-b border-[rgba(242,177,52,0.16)] pb-16 sm:mt-20 lg:grid-cols-[1fr_.7fr] lg:items-end">
            <div>
              <Eyebrow>READY TO SPLIT</Eyebrow>
              <h2 className="mt-4 max-w-[14ch] font-sans font-bold uppercase text-[#EDE3D0] leading-[0.9] tracking-[-0.04em] text-5xl sm:text-7xl">
                One click.<br />Every wallet.
              </h2>
            </div>
            <div>
              <p className="max-w-[44ch] text-sm leading-6 text-[#9C917E]">
                Fund from any chain, split to any number of recipients, settle on Arc in one transaction.
                No separate gas token. No bridges to manage manually.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <TagButton onClick={onLogin} disabled={isLoggingIn} variant="primary">
                  {isLoggingIn ? "OPENING…" : <><ArrowRight size={13} />LAUNCH APP</>}
                </TagButton>
                <TagButton
                  href={networkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="ghost"
                >
                  {networkLabel} →
                </TagButton>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-[rgba(242,177,52,0.16)]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 text-sm text-[#8C806D] sm:grid-cols-3 sm:gap-8 sm:px-8 sm:py-8">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#F2B134]">SPLITTY</div>
            <p className="mt-2 text-[13px] leading-6">
              Pay everyone at once. Cross-chain USDC batch payments on Arc.
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#F2B134]">POWERED BY</div>
            <p className="mt-2 text-[13px] leading-6">
              Arc · Circle Gateway · USDC · ERC-20 tokens
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#F2B134]">LINKS</div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
              <a
                href="https://github.com/SPLITTY-ORG/SPLITTY"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#EDE3D0] transition-colors"
              >
                <GithubIcon />
                GitHub
              </a>
              <a
                href="https://x.com/splittyonarc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#EDE3D0] transition-colors"
              >
                <XLogoIcon />
                X
              </a>
              <a
                href="https://splittyonarc.gitbook.io/splitty-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#EDE3D0] transition-colors"
              >
                <BookOpen size={13} strokeWidth={1.8} />
                Docs
              </a>
              <a
                href={networkHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#EDE3D0] transition-colors"
              >
                <ArrowRight size={13} strokeWidth={1.8} />
                {networkLabel}
              </a>
            </div>
            <div className="mt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8C806D]">
              {network} · SPLITTY.LIVE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
