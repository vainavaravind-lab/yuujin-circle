import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

/** A readable pause between the incoming and receding tide. */
export function TideText({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 95%', 'end 15%'] });
  const flow = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const y = useTransform(flow, [0, .2, .72, 1], [22, 0, 0, -38]);
  const x = useTransform(flow, [0, .2, .72, 1], [-8, 0, 0, 12]);
  const opacity = useTransform(flow, [0, .18, .72, 1], [.25, 1, 1, 0]);
  const filter = useTransform(flow, [0, .2, .75, 1], ['blur(3px)', 'blur(0px)', 'blur(0px)', 'blur(7px)']);
  return <div ref={ref} className="tide-text-anchor"><motion.div style={reduced ? undefined : { x, y, opacity, filter }}>{children}</motion.div></div>;
}

export function TideLight() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const flow = useSpring(scrollYProgress, { stiffness: 70, damping: 28 });
  const y = useTransform(flow, [0, 1], ['-15%', '15%']);
  const rotate = useTransform(flow, [0, 1], [-12, 18]);
  return <div className="tide-light" aria-hidden="true"><motion.div style={reduced ? undefined : { y, rotate }} /></div>;
}
