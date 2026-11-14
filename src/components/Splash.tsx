import { LogoMark } from './Logo';
export function Splash({ label = 'Opening Yuujin Circle…' }: { label?: string }) {
  return <main className="splash-screen" role="status" aria-live="polite" aria-busy="true">
    <div className="splash-brand"><LogoMark size={32} /><span>Yuujin Circle</span></div>
    <div className="splash-content"><span className="splash-ring" aria-hidden="true" /><p>{label}</p></div>
    <p className="splash-campus">Shiv Nadar University Chennai</p>
  </main>;
}
