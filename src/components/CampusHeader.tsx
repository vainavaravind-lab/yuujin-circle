import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export function CampusHeader({ label, title, accent, children, mark }: {
  label: string; title: string; accent: string; children: ReactNode; mark: string;
}) {
  const reduced = useReducedMotion();
  return <header className="campus-heading">
    <div className="campus-heading-copy">
      <p className="label">{label}</p>
      <h1>{title} <em>{accent}</em></h1>
      <div className="campus-heading-detail">{children}</div>
    </div>
    <motion.div className="campus-heading-art" aria-hidden="true"
      initial={reduced ? false : { opacity: 0, rotate: -8, scale: .92 }}
      animate={{ opacity: 1, rotate: 0, scale: 1 }} transition={{ duration: 1.2, ease: [.16, 1, .3, 1] }}>
      <span className="campus-art-rings" /><span className="campus-art-mark">{mark}</span>
      <span className="campus-art-slip">a little closer.</span>
    </motion.div>
  </header>;
}
