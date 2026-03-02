interface Props {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function SyncraLogo({ size = "md", showText = true }: Props) {
  const sizeMap = {
    sm: { icon: 24, text: "text-lg" },
    md: { icon: 32, text: "text-2xl" },
    lg: { icon: 48, text: "text-4xl" },
  };
  const { icon, text } = sizeMap[size];

  return (
    <div className="flex items-center gap-2.5">
      {/* Logo mark — two interlocked S shapes */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Syncra logo"
      >
        <defs>
          <linearGradient
            id="syncra-grad"
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="oklch(0.72 0.14 195)" />
            <stop offset="100%" stopColor="oklch(0.65 0.18 220)" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="oklch(0.22 0.025 264)" />
        <path
          d="M8 12c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4s-1.8 4-4 4H12c-2.2 0-4 1.8-4 4s1.8 4 4 4h8"
          stroke="url(#syncra-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="24" cy="12" r="2" fill="oklch(0.72 0.18 155)" />
      </svg>
      {showText && (
        <span
          className={`font-display font-bold tracking-tight ${text}`}
          style={{ color: "oklch(0.96 0.005 264)" }}
        >
          Syncra
        </span>
      )}
    </div>
  );
}
