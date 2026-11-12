import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

/**
 * GIF picker backed by GIPHY (free API key from https://developers.giphy.com).
 * Set VITE_GIPHY_API_KEY in .env.local to enable.
 * (Tenor is sunset for new clients as of 2026 — legacy VITE_TENOR_API_KEY still supported.)
 */

interface Gif {
  id: string;
  preview: string; // small, for the grid
  full: string; // larger, for sending
  desc: string;
  pw?: number; // preview width — reserved so layout never collapses
  ph?: number; // preview height
}

const GIPHY_KEY = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;
const TENOR_KEY = import.meta.env.VITE_TENOR_API_KEY as string | undefined;
const PROVIDER: 'giphy' | 'tenor' | null = GIPHY_KEY ? 'giphy' : TENOR_KEY ? 'tenor' : null;
const KEY = GIPHY_KEY ?? TENOR_KEY;

function mapGiphy(json: any): Gif[] {
  return (json?.data ?? [])
    .map((g: any) => {
      const p = g.images?.fixed_width_downsampled ?? g.images?.fixed_width;
      return {
        id: g.id,
        preview: p?.url,
        full: g.images?.downsized_medium?.url ?? g.images?.fixed_width?.url,
        desc: g.title || 'GIF',
        pw: Number(p?.width) || undefined,
        ph: Number(p?.height) || undefined,
      };
    })
    .filter((g: Gif) => g.preview && g.full);
}

function mapTenor(json: any): Gif[] {
  const out: Gif[] = [];
  for (const r of json?.results ?? []) {
    const media = r.media_formats ?? {};
    const preview = media.tinygif?.url ?? media.gif?.url;
    const full = media.mediumgif?.url ?? media.gif?.url ?? preview;
    const dims = media.tinygif?.dims ?? media.gif?.dims;
    if (preview && full) {
      out.push({
        id: r.id,
        preview,
        full,
        desc: r.content_description ?? 'GIF',
        pw: dims?.[0],
        ph: dims?.[1],
      });
    }
  }
  return out;
}

async function fetchGifs(query: string): Promise<Gif[]> {
  if (PROVIDER === 'giphy') {
    const base = query.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${KEY}&limit=24&rating=pg-13&q=${encodeURIComponent(query)}`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${KEY}&limit=24&rating=pg-13`;
    const res = await fetch(base);
    if (!res.ok) throw new Error(`GIPHY ${res.status}`);
    return mapGiphy(await res.json());
  }
  // Tenor (legacy keys)
  const url = query.trim()
    ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${KEY}&limit=24&media_filter=tinygif,mediumgif&client_key=yuujin_circle`
    : `https://tenor.googleapis.com/v2/featured?key=${KEY}&limit=24&media_filter=tinygif,mediumgif&client_key=yuujin_circle`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tenor ${res.status}`);
  return mapTenor(await res.json());
}

export function GifPicker({ onPick }: { onPick: (url: string) => void }) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial trending load + debounced search.
  useEffect(() => {
    if (!PROVIDER) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => {
        setLoading(true);
        setError('');
        fetchGifs(query)
          .then(setGifs)
          .catch((e) => setError(e.message || 'Could not load GIFs'))
          .finally(() => setLoading(false));
      },
      query.trim() ? 350 : 0
    );
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  if (!PROVIDER) {
    return (
      <div className="flex h-80 w-full flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 bg-[#241c3a] px-6 text-center shadow-lift">
        <span className="text-3xl">🎬</span>
        <p className="text-sm font-bold text-white">GIFs are almost ready</p>
        <p className="text-xs leading-relaxed text-white/50">
          Get a free API key at <strong className="text-white/80">developers.giphy.com</strong> → Create an App →
          copy the key. Then add{' '}
          <code className="rounded bg-white/10 px-1 py-0.5">VITE_GIPHY_API_KEY=your_key</code> to your{' '}
          <code className="rounded bg-white/10 px-1 py-0.5">.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-96 w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#241c3a] shadow-lift">
      <div className="shrink-0 border-b border-white/5 p-2">
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIPHY…"
            className="input h-10 !rounded-full !border-white/10 !bg-black/25 !pl-9 !text-sm !text-white placeholder:!text-white/35"
          />
        </div>
      </div>

      {/* Masonry: CSS columns + reserved image dimensions = every GIF fully visible
          at its natural ratio, exactly like GIPHY's own picker. */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading && (
          <div className="columns-2 gap-1.5 sm:columns-3">
            {[120, 90, 140, 100, 130, 80, 110, 95, 125].map((h, i) => (
              <div key={i} className="mb-1.5 animate-pulse rounded-xl bg-white/5" style={{ height: h }} />
            ))}
          </div>
        )}
        {!loading && error && (
          <p className="py-8 text-center text-xs text-white/50">Couldn't load GIFs ({error}).</p>
        )}
        {!loading && !error && gifs.length === 0 && (
          <p className="py-8 text-center text-xs text-white/40">No GIFs found — try another search.</p>
        )}
        {!loading && gifs.length > 0 && (
          <div className="columns-2 gap-1.5 sm:columns-3">
            {gifs.map((g) => (
              <motion.button
                key={g.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                className="mb-1.5 block w-full break-inside-avoid overflow-hidden rounded-xl bg-white/5"
                onClick={() => onPick(g.full)}
                aria-label={`Send GIF: ${g.desc}`}
              >
                <img
                  src={g.preview}
                  alt={g.desc}
                  width={g.pw}
                  height={g.ph}
                  className="block h-auto w-full"
                />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
