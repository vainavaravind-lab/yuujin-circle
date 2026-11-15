export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 256 256" aria-hidden="true">
      <g fillRule="evenodd">
        <path fill="#819b86" d="M132 28Q144 16 156 28L228 100Q240 112 228 124L172 180V116Q172 84 140 84H76ZM134 56a12 12 0 1 0 24 0a12 12 0 1 0 -24 0ZM188 110a12 12 0 1 0 24 0a12 12 0 1 0 -24 0Z" />
        <path fill="currentColor" d="M48 104H128Q152 104 152 128V208Q152 232 128 232H48Q24 232 24 208V128Q24 104 48 104ZM50 144a14 14 0 1 0 28 0a14 14 0 1 0 -28 0ZM98 192a14 14 0 1 0 28 0a14 14 0 1 0 -28 0Z" />
      </g>
    </svg>
  );
}

export function Logo({ size = 40, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      {wordmark && (
        <span className="text-xl font-semibold tracking-tight text-ink">
          Yuujin<span> Circle</span>
        </span>
      )}
    </span>
  );
}
