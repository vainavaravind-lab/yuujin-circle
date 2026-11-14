import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { GlassDice } from './GlassDice';

const MotionLink = motion(Link);

/** A native link with restrained pointer tilt and immediate touch feedback. */
export function ChatInvitation({ to, detail }: { to: string; detail: string }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 320, damping: 30 });
  const rotateY = useSpring(y, { stiffness: 320, damping: 30 });
  const reset = () => { x.set(0); y.set(0); };
  return <div className="chat-invitation-stage">
    <MotionLink to={to} className="chat-invitation"
      style={reduced ? undefined : { rotateX, rotateY }}
      whileTap={reduced ? undefined : { scale: .96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onPointerMove={(event) => {
        if (reduced || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(-((event.clientY - rect.top) / rect.height - .5) * 8);
        y.set(((event.clientX - rect.left) / rect.width - .5) * 8);
      }}
      onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}>
      <span className="chat-invitation-corner" aria-hidden="true"><ArrowUpRight size={20} /></span>
      <GlassDice />
      <span className="chat-invitation-copy">
        <span className="chat-invitation-title">Open the chat</span>
        <span className="chat-invitation-detail">{detail}</span>
      </span>
    </MotionLink>
  </div>;
}
