import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { EMOJI_CATEGORIES } from '../lib/emoji';

const RECENTS_KEY = 'yuujin-recent-emojis';
const MAX_RECENTS = 24;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((e) => typeof e === 'string').slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

/** Themed emoji picker: recents row + category tabs + grid. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [tab, setTab] = useState(0); // -1 = recents
  const [recents, setRecents] = useState<string[]>(loadRecents);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gridRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  const active = useMemo(() => {
    if (tab === -1) return { name: 'Recent', icon: '🕘', emojis: recents };
    return EMOJI_CATEGORIES[tab];
  }, [tab, recents]);

  function pick(emoji: string) {
    onPick(emoji);
    setRecents((cur) => {
      const next = [emoji, ...cur.filter((e) => e !== emoji)].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {
        /* private mode etc. — recents just won't persist */
      }
      return next;
    });
  }

  return (
    <div className="flex h-80 w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#241c3a] shadow-lift">
      {/* category tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/5 px-2 py-2">
        {recents.length > 0 && (
          <TabButton active={tab === -1} onClick={() => setTab(-1)} label="🕘" title="Recent" />
        )}
        {EMOJI_CATEGORIES.map((c, i) => (
          <TabButton
            key={c.name}
            active={tab === i}
            onClick={() => setTab(i)}
            label={c.icon}
            title={c.name}
          />
        ))}
      </div>

      {/* grid */}
      <div ref={gridRef} className="grid flex-1 auto-cols-max grid-cols-8 gap-1 overflow-y-auto p-3" role="listbox" aria-label={`${active.name} emojis`}>
        {active.emojis.length === 0 ? (
          <p className="col-span-8 py-8 text-center text-xs text-white/40">Tap emojis you use — they'll show up here.</p>
        ) : (
          active.emojis.map((e, i) => (
            <button
              key={`${e}-${i}`}
              type="button"
              role="option"
              aria-label={`Insert ${e}`}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition hover:bg-white/10 active:scale-90"
              onClick={() => pick(e)}
            >
              {e}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, title }: { active: boolean; onClick: () => void; label: string; title: string }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl transition ${
        active ? 'bg-white/15' : 'opacity-60 hover:opacity-100'
      }`}
    >
      {label}
    </motion.button>
  );
}
