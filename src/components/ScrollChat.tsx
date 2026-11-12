import { useState, type RefObject } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Camera, Flame, Heart } from 'lucide-react';

export const CHAT_STEPS = [
  { count: 0, title: 'A conversation starts with a little mystery.', detail: 'One spark pairs you with a random classmate. Say hello before you know their name.', messages: ['Triangles, circles or squares?'] },
  { count: 3, title: 'Find your common ground.', detail: 'At three messages, your classmate’s interests appear.', messages: ['Triangles, circles or squares?', 'Squares. Triangles are for people with opinions.', 'Wrong answer, but I respect it.'] },
  { count: 8, title: 'Put a face to the conversation.', detail: 'After eight messages, a profile photo appears if your classmate added one.', messages: ['You’re into photography too?', 'Mostly blurry pictures of my coffee.', 'An entire artistic movement.'] },
  { count: 16, title: 'Mystery classmate becomes Meera.', detail: 'Sixteen messages unlock a name. The conversation already has a little history.', messages: ['So what should I call the coffee photographer?', 'Meera. And I stand by my work.', 'Nice to meet you properly, Meera.'] },
  { count: 26, title: 'Your paths might already cross.', detail: 'At twenty-six messages, course and year are revealed.', messages: ['Wait, third-year ECE?', 'Yes! Usually running late with a coffee.', 'I think we’ve been in the same canteen queue.'] },
  { count: 38, title: 'Both get a say in what comes next.', detail: 'At thirty-eight messages, privately choose Match or Pass. A mutual Match keeps the friendship.', messages: ['Same queue tomorrow?', 'Only if you promise no photography criticism.', 'Deal. Coffee after class?'] },
  { count: 38, title: 'Come back tomorrow.', detail: 'Answer the Question of the Day on consecutive days to build your daily streak.', messages: ['Day 2 · Question of the Day answered', 'Daily streak grows to 2'] },
  { count: 38, title: 'Make a little campus ritual.', detail: 'Another day, another answer. Your daily streak reaches three.', messages: ['Day 3 · Question of the Day answered', 'Daily streak grows to 3'] },
];

export function ScrollChat({ story }: { story: RefObject<HTMLDivElement> }) {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: story, layoutEffect: false, offset: ['start 75%', 'end 85%'] });
  const [step, setStep] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', value => {
    setStep(Math.min(CHAT_STEPS.length - 1, Math.floor(value * CHAT_STEPS.length)));
  });
  const rotateX = useTransform(scrollYProgress, [0, .35, .7, 1], [10, -4, 5, 0]);
  const rotateY = useTransform(scrollYProgress, [0, .5, 1], [-13, 8, 0]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-4, 2]);
  const current = CHAT_STEPS[step];
  const stage = [3, 8, 16, 26, 38].filter(n => current.count >= n).length;

  return (
    <aside className="scroll-chat-pin" aria-label="Illustrated chat walkthrough">
      <div className="pairing-poster scroll-chat-poster">
        <div className="poster-orbit" aria-hidden="true" />
        <div className="poster-print" aria-hidden="true">yc.</div>
        <motion.div className="poster-chat scroll-chat-card"
          style={reduced ? undefined : { rotateX, rotateY, rotate }}>
          <div className="scroll-chat-header">
            <span className="scroll-chat-avatar" aria-hidden="true">{step >= 2 ? <Camera size={18} /> : '?'}</span>
            <div>
              <strong>{step >= 3 ? 'Meera' : 'Mystery classmate'}</strong>
              <p>{step >= 4 ? '3rd year · ECE' : step >= 2 ? 'Photo unlocked · example' : 'Identity reveals as you talk'}</p>
            </div>
          </div>
          <div className="scroll-chat-context">
            {step >= 6 ? <><Flame size={14} /> {step - 4}-day streak · Question of the Day</>
              : step >= 1 ? 'Photography · Coffee · Music' : 'A new pairing · say hello'}
          </div>
          <div className="scroll-chat-messages" aria-live="off">
            {current.messages.map((message, index) => (
              <motion.p key={message} className={index % 2 ? 'is-mine' : ''}
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, delay: index * .06 }}>
                {message}
              </motion.p>
            ))}
          </div>
          <div className="scroll-chat-meter">
            <div><span><Flame size={13} /> Spark meter</span><span>{current.count} / 38</span></div>
            <div role="progressbar" aria-label="Example conversation progress" aria-valuemin={0} aria-valuemax={38} aria-valuenow={current.count} className="scroll-chat-track">
              <span style={{ width: `${current.count / 38 * 100}%` }} />
            </div>
            <p>{step >= 5 ? <><Heart size={12} /> Match or Pass unlocked</> : `Stage ${stage} of 5 · ${[3, 8, 16, 26, 38][stage] - current.count} messages to next reveal`}</p>
          </div>
        </motion.div>
      </div>
      <p className="scroll-chat-caption">Example conversation · scroll to follow along</p>
    </aside>
  );
}
