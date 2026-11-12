export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lg-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12A5A5" />
          <stop offset="1" stopColor="#36D7F4" />
        </linearGradient>
      </defs>
      {/* Open orbit arc — gap sits upper-right, round caps */}
      <path
        d="M 36.42 11.22 A 21.25 21.25 0 1 0 52.53 37.5"
        fill="none"
        stroke="url(#lg-arc)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Endpoint dot */}
      <circle cx="52.53" cy="37.5" r="3.4" fill="#36D7F4" />
      {/* Fading trail toward the gap */}
      <circle cx="52.44" cy="26.14" r="1.6" fill="#36D7F4" opacity="0.6" />
      <circle cx="48.75" cy="18.91" r="1.25" fill="#36D7F4" opacity="0.42" />
      <circle cx="42.63" cy="13.6" r="0.95" fill="#36D7F4" opacity="0.28" />
    </svg>
  );
}

export function Logo({ size = 40, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-xl font-extrabold tracking-tight text-ink">
          Yuujin<span className="text-teal-brand"> Circle</span>
        </span>
      )}
    </span>
  );
}
