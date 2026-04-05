interface Props {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function SyncraLogo({ size = "md", showText = true }: Props) {
  const sizeMap = {
    sm: { icon: 28, text: "text-lg" },
    md: { icon: 36, text: "text-2xl" },
    lg: { icon: 52, text: "text-4xl" },
  };
  const { icon, text } = sizeMap[size];

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Syncra logo"
      >
        <defs>
          <linearGradient
            id="syncra-bg"
            x1="0"
            y1="0"
            x2="36"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="oklch(0.22 0.03 50)" />
            <stop offset="100%" stopColor="oklch(0.16 0.022 50)" />
          </linearGradient>
          <linearGradient
            id="syncra-line"
            x1="0"
            y1="0"
            x2="36"
            y2="36"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="oklch(0.88 0.18 72)" />
            <stop offset="60%" stopColor="oklch(0.76 0.19 72)" />
            <stop offset="100%" stopColor="oklch(0.65 0.17 72)" />
          </linearGradient>
          <linearGradient
            id="syncra-dot"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="oklch(0.80 0.18 155)" />
            <stop offset="100%" stopColor="oklch(0.65 0.18 155)" />
          </linearGradient>
        </defs>
        {/* Background pill */}
        <rect width="36" height="36" rx="10" fill="url(#syncra-bg)" />
        <rect
          width="36"
          height="36"
          rx="10"
          fill="oklch(0.78 0.19 72 / 0.04)"
        />
        {/* S path */}
        <path
          d="M9 13.5C9 11.0 11.0 9 13.5 9h5C21.0 9 23 11.0 23 13.5S21.0 18 18.5 18H13.5C11.0 18 9 20.0 9 22.5S11.0 27 13.5 27H23"
          stroke="url(#syncra-line)"
          strokeWidth="2.8"
          strokeLinecap="round"
          fill="none"
        />
        {/* Accent dot */}
        <circle cx="27" cy="13.5" r="2.5" fill="url(#syncra-dot)" />
      </svg>
      {showText && (
        <span
          className={`font-display font-bold tracking-tight ${text}`}
          style={{ color: "oklch(0.96 0.008 75)" }}
        >
          Syncra
        </span>
      )}
    </div>
  );
}
