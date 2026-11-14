import type { ReactNode } from 'react';
export function CampusHeader({ label, title, accent, children }: {
  label: string; title: string; accent: string; children: ReactNode;
}) {
  return <header className="campus-heading"><div className="campus-heading-copy">
    <p className="label">{label}</p>
    <h1>{title} <em>{accent}</em></h1>
    <div className="campus-heading-detail">{children}</div>
  </div></header>;
}
