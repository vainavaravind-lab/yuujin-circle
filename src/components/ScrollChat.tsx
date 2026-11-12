import { useRef, useState, type RefObject } from 'react';
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
  const beats = [0, .15, .28, .4, .53, .66, .8, 1];
  const rotateX = useTransform(scrollYProgress, beats, [12, -5, 0, 7, -6, 0, 8, 0]);
  const rotateY = useTransform(scrollYProgress, beats, [-14, 8, 0, -9, 10, 0, -7, 0]);
  const rotate = useTransform(scrollYProgress, beats, [-5, 3, -2, 2, -3, 0, 3, 0]);
  const scale = useTransform(scrollYProgress, beats, [.88, 1, 1.12, .94, 1.08, 1.13, .95, 1]);
  const orbitRotate = useTransform(scrollYProgress, [0, 1], [-35, 145]);
  const haloX = useTransform(scrollYProgress, [0, .5, 1], ['-25%', '25%', '-10%']);
  // Move between clear reading lanes; cross the center only between chapters.
  const travel = useTransform(scrollYProgress,
    [0, .21, .26, .45, .51, .70, .76, .85, .92, 1],
    ['0%', '0%', '-132%', '-132%', '0%', '0%', '-132%', '-132%', '-66%', '-66%']);
  const lightX = useTransform(scrollYProgress, [.85, 1], ['-110%', '110%']);
  const driftX = useTransform(scrollYProgress, beats, [0, 8, -8, -6, 8, 6, -8, 0]);
  const glassOpacity = useTransform(scrollYProgress, [.84, .94], [0, 1]);
  const current = CHAT_STEPS[step];
  const stage = [3, 8, 16, 26, 38].filter(n => current.count >= n).length;

  return (
    <motion.aside className="scroll-chat-pin" aria-label="Illustrated chat walkthrough" style={reduced ? undefined : { x: travel }}>
      <div className={`pairing-poster scroll-chat-poster chat-phase-${step}`}>
        <motion.div className="chat-color-field" aria-hidden="true" style={reduced ? undefined : { x: haloX, rotate: orbitRotate }} />
        <motion.div className="poster-orbit" aria-hidden="true" style={reduced ? undefined : { rotate: orbitRotate }} />
        <div className="poster-print" aria-hidden="true">yc.</div>
        <motion.div className="chat-prism" aria-hidden="true" style={{ opacity: reduced ? (step === 7 ? 1 : 0) : glassOpacity }}>
          <motion.div className="chat-prism-light" style={reduced ? undefined : { x: lightX }} />
        </motion.div>
        <motion.div className="poster-chat scroll-chat-card"
          style={reduced ? undefined : { rotateX, rotateY, rotate, scale, x: driftX }}>
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
        <motion.div key={step} className="chat-glass-reveal" aria-hidden="true"
          initial={reduced ? false : { opacity: 0, y: 18, scale: .85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 180, damping: 20 }}>
          {step >= 6 ? <Flame size={17} /> : step >= 5 ? <Heart size={17} /> : <Camera size={17} />}
          <span>{['A little mystery', 'Common ground found', 'A face behind the words', 'Hello, Meera.', 'Closer than you think', 'Your next chapter?', 'Two days. Keep going.', 'A three-day ritual.'][step]}</span>
        </motion.div>
      </div>
      <p className="scroll-chat-caption">Example conversation · scroll to follow along</p>
    </motion.aside>
  );
}

const CHAPTER_LINES = [
  ['First, a little', 'mystery.'], ['Same wavelength.', 'Different opinions.'],
  ['Oh, so', 'that’s you.'], ['Less mystery.', 'More Meera.'],
  ['Same campus.', 'Small world.'], ['A coffee?', 'Your call.'],
  ['One more day.', 'One more hello.'], ['Strangers once.', 'A ritual now.'],
];

export function ChatChapter({ index, story }: { index: number; story: RefObject<HTMLDivElement> }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, .5, 1], [35, 0, -25]);
  const rotate = useTransform(scrollYProgress, [0, .5, 1], [-3, 0, 2]);
  const { scrollYProgress: journey } = useScroll({ target: story, layoutEffect: false, offset: ['start 75%', 'end 85%'] });
  const start = index / 8;
  const opacity = useTransform(journey, [Math.max(0, start - .025), start + .025, start + .09, Math.min(1, start + .125)], [0, 1, 1, 0]);
  const x = useTransform(journey, [start, start + .04, start + .125], [index === 2 || index === 3 || index === 6 ? 30 : -30, 0, 0]);
  const step = CHAT_STEPS[index];
  return <motion.section ref={ref} className={`scroll-chat-chapter chapter-${index}`} style={reduced ? undefined : { opacity: index === 7 ? undefined : opacity, x }}>
    <p className="label"><span className="chapter-dot" />{index >= 6 ? 'Daily streak · day ' + (index - 4) : step.count + ' messages'}</p>
    <motion.h2 style={reduced ? undefined : { y }}>
      <span>{CHAPTER_LINES[index][0]}</span>
      <motion.em style={reduced ? undefined : { rotate }}>{CHAPTER_LINES[index][1]}</motion.em>
    </motion.h2>
    <motion.p initial={reduced ? false : { opacity: .3, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: .8 }} transition={{ duration: .5 }}>{step.detail}</motion.p>
  </motion.section>;
}
