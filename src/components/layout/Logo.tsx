import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  showWordmark?: boolean;
  /** Renders the wordmark in cream for dark surfaces. */
  onDark?: boolean;
}

/** Testify mark — an inked approval seal. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="Testify logo"
      className={cn("h-8 w-8", className)}
    >
      <rect x="2" y="2" width="28" height="28" rx="7" className="fill-brand-green dark:fill-primary" />
      <rect
        x="5"
        y="5"
        width="22"
        height="22"
        rx="4.5"
        fill="none"
        stroke="#F6F0E2"
        strokeOpacity="0.35"
        strokeWidth="1.4"
        className="dark:stroke-room"
      />
      <path
        d="M9.5 16.4l4.4 4.6 8.6-9.6"
        fill="none"
        stroke="#F6F0E2"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="dark:stroke-room"
      />
    </svg>
  );
}

export function Logo({ className, iconClassName, showWordmark = true, onDark = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={iconClassName} />
      {showWordmark && (
        <span
          className={cn(
            "font-display text-[1.45rem] font-bold leading-none tracking-tight",
            onDark ? "text-cream" : "text-foreground",
          )}
        >
          Testify
        </span>
      )}
    </span>
  );
}
