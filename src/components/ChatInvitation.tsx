import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { motion, useAnimationControls, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { GlassDice } from './GlassDice';

const MotionLink = motion(Link);

/** Pointer feedback stays on the dice; navigation waits only for their short exit. */
export function ChatInvitation({ to, detail }: { to: string; detail: string }) {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const exit = useAnimationControls();
  const mounted = useRef(true);
  const entering = useRef(false);
  const [opening, setOpening] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 320, damping: 30 });
  const rotateY = useSpring(y, { stiffness: 320, damping: 30 });
  const diceX = useTransform(rotateY, value => value * 1.5);
  const diceY = useTransform(rotateX, value => -value * 1.5);
  const diceRotate = useTransform(rotateY, value => value * 1.5);
  const reset = () => { x.set(0); y.set(0); };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; exit.stop(); };
  }, [exit]);

  async function openChat(event: MouseEvent<HTMLAnchorElement>) {
    // Keep native new-tab and keyboard behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (reduced || event.detail === 0) return;
    event.preventDefault();
    if (entering.current) return;
    entering.current = true;
    setOpening(true);
    reset();
    await exit.start({
      transform: 'translateY(-8px) scale(1.65)',
      opacity: 0,
      transition: { duration: .28, ease: [.23, 1, .32, 1] },
    });
    if (mounted.current) navigate(to);
  }

  return <div className="chat-invitation-stage">
    <MotionLink to={to} className="chat-invitation" aria-busy={opening || undefined}
      onClick={openChat}
      style={reduced ? undefined : { rotateX, rotateY }}
      whileTap={reduced || opening ? undefined : { scale: .96 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      onPointerMove={(event) => {
        if (reduced || entering.current || event.pointerType !== 'mouse' ||
            !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(-((event.clientY - rect.top) / rect.height - .5) * 8);
        y.set(((event.clientX - rect.left) / rect.width - .5) * 8);
      }}
      onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}>
      <span className="chat-invitation-corner" aria-hidden="true"><ArrowUpRight size={20} /></span>
      <motion.span className="chat-invitation-dice" animate={exit}
        initial={{ transform: 'translateY(0px) scale(1)', opacity: 1 }} aria-hidden="true">
        <motion.span className="chat-invitation-dice-follow"
          style={reduced ? undefined : { x: diceX, y: diceY, rotate: diceRotate }}>
          <GlassDice />
        </motion.span>
      </motion.span>
      <span className="chat-invitation-copy">
        <span className="chat-invitation-title">Open the chat</span>
        <span className="chat-invitation-detail">{detail}</span>
      </span>
    </MotionLink>
  </div>;
}
