import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2, RotateCcw, Shuffle, X } from 'lucide-react';
import {
  renderAvatarSvg,
  sanitizeConfig,
  defaultConfig,
  randomConfig,
  suggestFromSelfie,
  SKIN_TONES,
  HAIR_COLORS,
  TOPS,
  EYES,
  EYEBROWS,
  MOUTHS,
  FACIAL_HAIR,
  ACCESSORIES,
  ACCESSORY_COLORS,
  CLOTHINGS,
  CLOTHES_COLORS,
  GRAPHICS,
  BG_COLORS,
} from '../lib/cartoon';
import type { CartoonConfig } from '../lib/cartoon';

type Phase = 'pick' | 'ready';

const LABELS: Record<string, Record<string, string>> = {
  top: {
    longButNotTooLong: 'Long', straight01: 'Straight', straight02: 'Swoop',
    straightAndStrand: 'Side strand', curvy: 'Curvy', bob: 'Bob', bun: 'Bun',
    curly: 'Curly', shortCurly: 'Short curly', shortFlat: 'Short flat',
    shortRound: 'Short round', shortWaved: 'Short waved', shaggy: 'Shaggy',
    shaggyMullet: 'Mullet', sides: 'Sides', theCaesar: 'Caesar',
    theCaesarAndSidePart: 'Caesar part', bigHair: 'Big hair', fro: 'Fro',
    froBand: 'Fro + band', dreads: 'Dreads', dreads01: 'Dreads alt',
    dreads02: 'Dreads tucked', frida: 'Frida', frizzle: 'Frizzle',
    miaWallace: 'Mia', shavedSides: 'Shaved sides', hat: 'Hat',
    hijab: 'Hijab', turban: 'Turban', winterHat1: 'Winter hat',
    winterHat02: 'Beanie', winterHat03: 'Winter 3', winterHat04: 'Winter 4',
  },
  eyes: {
    default: 'Default', happy: 'Happy', hearts: 'Hearts', wink: 'Wink',
    winkWacky: 'Wacky wink', side: 'Side eye', squint: 'Squint',
    closed: 'Closed', surprised: 'Surprised', cry: 'Crying',
    eyeRoll: 'Eye roll', xDizzy: 'Dizzy',
  },
  eyebrows: {
    default: 'Default', defaultNatural: 'Natural', raisedExcited: 'Excited',
    raisedExcitedNatural: 'Excited+', upDown: 'UpDown', upDownNatural: 'UpDown+',
    flatNatural: 'Flat', angry: 'Angry', angryNatural: 'Angry+',
    frownNatural: 'Frown', sadConcerned: 'Sad', sadConcernedNatural: 'Sad+',
    unibrowNatural: 'Unibrow',
  },
  mouth: {
    smile: 'Smile', twinkle: 'Twinkle', eating: 'Eating', tongue: 'Tongue',
    default: 'Open', serious: 'Serious', concerned: 'Concerned',
    disbelief: 'Disbelief', grimace: 'Grimace', sad: 'Sad',
    screamOpen: 'Scream', vomit: 'Yuck',
  },
  facialHair: {
    none: 'None', beardLight: 'Light beard', beardMedium: 'Medium beard',
    beardMajestic: 'Majestic', moustacheFancy: 'Moustache',
    moustacheMagnum: 'Magnum',
  },
  accessory: {
    none: 'None', kurt: 'Kurt', prescription01: 'Glasses 1',
    prescription02: 'Glasses 2', round: 'Round glasses',
    sunglasses: 'Sunglasses', wayfarers: 'Wayfarers', eyepatch: 'Eyepatch',
  },
  clothing: {
    hoodie: 'Hoodie', shirtCrewNeck: 'Crew neck', shirtScoopNeck: 'Scoop neck',
    shirtVNeck: 'V-neck', graphicShirt: 'Graphic tee',
    collarAndSweater: 'Collar + sweater', blazerAndShirt: 'Blazer + shirt',
    blazerAndSweater: 'Blazer + sweater', overall: 'Overall',
  },
  graphic: {
    bat: 'Bat', bear: 'Bear', cumbia: 'Cumbia', deer: 'Deer', diamond: 'Diamond',
    hola: 'Hola', pizza: 'Pizza', resist: 'Resist', skull: 'Skull',
    skullOutline: 'Skull outline',
  },
};

const CATEGORIES = ['skin', 'hair', 'face', 'outfit', 'extras', 'background'] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  skin: { label: 'Skin', emoji: '🎨' },
  hair: { label: 'Hair', emoji: '💇' },
  face: { label: 'Face', emoji: '😊' },
  outfit: { label: 'Outfit', emoji: '👕' },
  extras: { label: 'Extras', emoji: '👓' },
  background: { label: 'Backdrop', emoji: '🌫️' },
};

const titleize = (s: string) =>
  s.replace(/[A-Z]/g, (m) => ` ${m}`).replace(/^./, (m) => m.toUpperCase());

/**
 * Full-screen editor for the cartoon avatar: pick hair/face/outfit/extras,
 * preview live, optionally seed colors from a selfie, then save.
 */
export function CartoonAvatarStudio({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: CartoonConfig | null;
  onClose: () => void;
  onSave: (config: CartoonConfig) => Promise<void>;
}) {
  const [config, setConfig] = useState<CartoonConfig>(
    initial ? sanitizeConfig(initial) : defaultConfig(),
  );
  const [category, setCategory] = useState<Category>('skin');
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestNote, setSuggestNote] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setConfig(initial ? sanitizeConfig(initial) : defaultConfig());
      setCategory('skin');
      setSuggestNote(null);
    }
  }, [open, initial]);

  const svg = useMemo(() => renderAvatarSvg(config), [config]);

  function set<K extends keyof CartoonConfig>(key: K, value: CartoonConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  async function handleSelfie(file: File | null) {
    if (!file) return;
    setSuggesting(true);
    setSuggestNote(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const got = await suggestFromSelfie(dataUrl);
      if (got) {
        setConfig((c) => ({ ...c, ...got }));
        setSuggestNote('Colors picked from your selfie — tweak anything you like.');
      } else {
        setSuggestNote('Couldn’t detect a face — pick colors manually.');
      }
    } catch {
      setSuggestNote('Selfie analysis unavailable — pick colors manually.');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(config);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex flex-col bg-cream"
        >
          {/* header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="text-lg font-extrabold text-ink">Your avatar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfig(randomConfig())}
                className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold text-ink-soft transition hover:bg-white/10"
              >
                <Shuffle size={14} /> Surprise me
              </button>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-ink-soft transition hover:bg-white/10"
                aria-label="Close avatar studio"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {/* preview strip */}
            <div className="mx-auto flex w-full max-w-md items-center gap-4 px-5 pt-5">
              <div
                className="h-36 w-36 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-card"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink">Make it you</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Pick your features — or start from a selfie and we’ll suggest skin + hair
                  colors. Your avatar shows up everywhere as your profile picture.
                </p>
                <label className="btn-ghost mt-3 inline-flex cursor-pointer !py-2 text-xs">
                  {suggesting ? <Loader2 size={14} className="animate-spin" /> : '📷'} Use my selfie
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      handleSelfie(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                </label>
                {suggestNote && (
                  <p className="mt-2 text-[11px] font-semibold leading-snug text-ink-soft">
                    {suggestNote}
                  </p>
                )}
              </div>
            </div>

            {/* category tabs */}
            <div className="mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition
                    ${category === cat ? 'bg-teal-brand text-white shadow-card' : 'border border-white/10 bg-white/5 text-ink-soft hover:bg-white/10'}`}
                >
                  <span>{CATEGORY_META[cat].emoji}</span>
                  {CATEGORY_META[cat].label}
                </button>
              ))}
            </div>

            {/* options for the active category */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-3">
              {category === 'skin' && (
                <Swatches
                  colors={SKIN_TONES}
                  active={config.skin}
                  onPick={(v) => set('skin', v)}
                />
              )}
              {category === 'hair' && (
                <>
                  <Swatches
                    colors={HAIR_COLORS}
                    active={config.hair}
                    onPick={(v) => set('hair', v)}
                  />
                  <Options
                    items={TOPS.map((v) => ({ value: v, label: LABELS.top[v] ?? titleize(v) }))}
                    active={config.top}
                    onPick={(v) => set('top', v)}
                  />
                </>
              )}
              {category === 'face' && (
                <>
                  <Options
                    items={EYES.map((v) => ({ value: v, label: LABELS.eyes[v] ?? v }))}
                    active={config.eyes}
                    onPick={(v) => set('eyes', v)}
                  />
                  <Options
                    items={EYEBROWS.map((v) => ({ value: v, label: LABELS.eyebrows[v] ?? v }))}
                    active={config.eyebrows}
                    onPick={(v) => set('eyebrows', v)}
                  />
                  <Options
                    items={MOUTHS.map((v) => ({ value: v, label: LABELS.mouth[v] ?? v }))}
                    active={config.mouth}
                    onPick={(v) => set('mouth', v)}
                  />
                  <Options
                    items={FACIAL_HAIR.map((v) => ({ value: v, label: LABELS.facialHair[v] ?? v }))}
                    active={config.facialHair}
                    onPick={(v) => set('facialHair', v)}
                  />
                </>
              )}
              {category === 'outfit' && (
                <>
                  <Swatches
                    colors={CLOTHES_COLORS}
                    active={config.clothesColor}
                    onPick={(v) => set('clothesColor', v)}
                  />
                  <Options
                    items={CLOTHINGS.map((v) => ({ value: v, label: LABELS.clothing[v] ?? v }))}
                    active={config.clothing}
                    onPick={(v) => set('clothing', v)}
                  />
                  {config.clothing === 'graphicShirt' && (
                    <Options
                      items={GRAPHICS.map((v) => ({ value: v, label: LABELS.graphic[v] ?? v }))}
                      active={config.graphic}
                      onPick={(v) => set('graphic', v)}
                    />
                  )}
                </>
              )}
              {category === 'extras' && (
                <>
                  <Options
                    items={ACCESSORIES.map((v) => ({ value: v, label: LABELS.accessory[v] ?? v }))}
                    active={config.accessory}
                    onPick={(v) => set('accessory', v)}
                  />
                  {config.accessory !== 'none' && (
                    <Swatches
                      colors={ACCESSORY_COLORS}
                      active={config.accessoryColor}
                      onPick={(v) => set('accessoryColor', v)}
                    />
                  )}
                </>
              )}
              {category === 'background' && (
                <Swatches
                  colors={BG_COLORS}
                  active={config.background}
                  onPick={(v) => set('background', v)}
                />
              )}
            </div>

            {/* save bar */}
            <div className="border-t border-white/10 bg-cream px-5 py-4">
              <div className="mx-auto flex w-full max-w-md gap-3">
                <button
                  className="btn-ghost flex-1"
                  onClick={() => setConfig(initial ? sanitizeConfig(initial) : defaultConfig())}
                  disabled={saving}
                >
                  <RotateCcw size={16} /> Reset
                </button>
                <button className="btn-primary flex-[2]" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                  {saving ? 'Saving…' : 'Use this avatar'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Swatches({
  colors,
  active,
  onPick,
}: {
  colors: readonly string[];
  active: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="mx-auto grid max-w-md grid-cols-5 gap-3 sm:grid-cols-7">
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          aria-label={`Color ${c}`}
          className={`aspect-square rounded-full border-2 transition ${
            active === c ? 'scale-110 border-teal-brand shadow-card' : 'border-white/15 hover:scale-105'
          }`}
          style={{ background: `#${c}` }}
        />
      ))}
    </div>
  );
}

function Options<T extends string>({
  items,
  active,
  onPick,
}: {
  items: { value: T; label: string }[];
  active: T;
  onPick: (v: T) => void;
}) {
  return (
    <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2.5 sm:grid-cols-3">
      {items.map((it) => (
        <button
          key={it.value}
          onClick={() => onPick(it.value)}
          className={`rounded-2xl border px-3 py-3 text-left text-xs font-bold transition ${
            active === it.value
              ? 'border-teal-brand bg-teal-brand/15 text-ink'
              : 'border-white/10 bg-white/5 text-ink-soft hover:bg-white/10'
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
