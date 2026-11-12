import { LogoMark } from './Logo';

export function Splash({ label = 'Warming things up…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream">
      <div className="animate-float">
        <LogoMark size={56} />
      </div>
      <p className="text-sm font-semibold text-ink-faint">{label}</p>
    </div>
  );
}
