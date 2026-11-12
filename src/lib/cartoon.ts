/**
 * Cartoon avatar engine — professional Bitmoji-style illustrations.
 *
 * The character is rendered by DiceBear's "Avataaars" set (art by Pablo
 * Stanley, free for commercial use) — dozens of real illustrated hairstyles,
 * outfits, eyes and accessories, combined from a small CartoonConfig and
 * generated fully locally (no network calls, no CDN).
 *
 * suggestFromSelfie() optionally seeds skin + hair colors from a photo using
 * the MediaPipe face landmarker (on-device, loaded lazily from CDN).
 */
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

/* ------------------------------------------------------------------ */
/* Catalog — palettes (hex WITHOUT the leading '#', DiceBear format)   */
/* ------------------------------------------------------------------ */

export const SKIN_TONES = [
  'ffdbb4', 'f5cfa8', 'edb98a', 'd99e6f', 'd08b5b',
  'b57941', 'ae5d29', '8d5524', '614335', '47301e',
] as const;

export const HAIR_COLORS = [
  '0e0e0e', '2c1b18', '4a312c', '724133', 'a55728',
  'b58143', 'd6b370', 'e9d3a3', 'c93305', 'b9b9bb',
  'e8e1e1', 'f4a7c0', 'b39ddb', '4a90d9',
] as const;

export const CLOTHES_COLORS = [
  'f1f3f5', 'b9b9bb', '3c4f5c', '1f2933', '266841',
  '3e8e5a', '8a9358', 'd8a75b', 'e8590c', 'c92a2a',
  'd670ad', '7950f2',
] as const;

export const ACCESSORY_COLORS = ['262e33', '963c3c', '586069', 'd670ad', 'f1c40f'] as const;

export const BG_COLORS = ['b6e3f4', 'c0aede', 'ffd5dc', 'ffdfbf', 'd1f4d9', 'e6e6e6', '2a3b46'] as const;

/* --------------------------- option lists --------------------------- */

export const TOPS = [
  'longButNotTooLong', 'straight01', 'straight02', 'straightAndStrand', 'curvy',
  'bob', 'bun', 'curly', 'shortCurly', 'shortFlat', 'shortRound', 'shortWaved',
  'shaggy', 'shaggyMullet', 'sides', 'theCaesar', 'theCaesarAndSidePart',
  'bigHair', 'fro', 'froBand', 'dreads', 'dreads01', 'dreads02', 'frida',
  'frizzle', 'miaWallace', 'shavedSides', 'hat', 'hijab', 'turban',
  'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04',
] as const;
export type Top = (typeof TOPS)[number];

export const EYES = [
  'default', 'happy', 'hearts', 'wink', 'winkWacky', 'side', 'squint',
  'closed', 'surprised', 'cry', 'eyeRoll', 'xDizzy',
] as const;
export type Eye = (typeof EYES)[number];

export const EYEBROWS = [
  'default', 'defaultNatural', 'raisedExcited', 'raisedExcitedNatural',
  'upDown', 'upDownNatural', 'flatNatural', 'angry', 'angryNatural',
  'frownNatural', 'sadConcerned', 'sadConcernedNatural', 'unibrowNatural',
] as const;
export type Eyebrow = (typeof EYEBROWS)[number];

export const MOUTHS = [
  'smile', 'twinkle', 'eating', 'tongue', 'default', 'serious',
  'concerned', 'disbelief', 'grimace', 'sad', 'screamOpen', 'vomit',
] as const;
export type Mouth = (typeof MOUTHS)[number];

/** 'none' hides facial hair entirely. */
export const FACIAL_HAIR = [
  'none', 'beardLight', 'beardMedium', 'beardMajestic',
  'moustacheFancy', 'moustacheMagnum',
] as const;
export type FacialHair = (typeof FACIAL_HAIR)[number];

/** 'none' hides accessories entirely. */
export const ACCESSORIES = [
  'none', 'kurt', 'prescription01', 'prescription02', 'round',
  'sunglasses', 'wayfarers', 'eyepatch',
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const CLOTHINGS = [
  'hoodie', 'shirtCrewNeck', 'shirtScoopNeck', 'shirtVNeck', 'graphicShirt',
  'collarAndSweater', 'blazerAndShirt', 'blazerAndSweater', 'overall',
] as const;
export type Clothing = (typeof CLOTHINGS)[number];

export const GRAPHICS = [
  'bat', 'bear', 'cumbia', 'deer', 'diamond', 'hola', 'pizza', 'resist',
  'skull', 'skullOutline',
] as const;
export type Graphic = (typeof GRAPHICS)[number];

export type CartoonConfig = {
  v: 3;
  skin: string;          // hex without '#'
  hair: string;          // hex without '#'
  top: Top;
  eyes: Eye;
  eyebrows: Eyebrow;
  mouth: Mouth;
  facialHair: FacialHair;
  accessory: Accessory;
  accessoryColor: string;
  clothing: Clothing;
  clothesColor: string;  // hex without '#'
  graphic: Graphic;      // used when clothing is 'graphicShirt'
  background: string;    // hex without '#'
};

/* ------------------------------------------------------------------ */
/* Config helpers                                                      */
/* ------------------------------------------------------------------ */

/** A tasteful default. */
export function defaultConfig(): CartoonConfig {
  return {
    v: 3,
    skin: 'edb98a',
    hair: '2c1b18',
    top: 'longButNotTooLong',
    eyes: 'default',
    eyebrows: 'default',
    mouth: 'smile',
    facialHair: 'none',
    accessory: 'none',
    accessoryColor: '262e33',
    clothing: 'hoodie',
    clothesColor: '3c4f5c',
    graphic: 'diamond',
    background: 'b6e3f4',
  };
}

const pick = <T,>(arr: readonly T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length)];

/** Random character (mulberry32 seeded — same seed, same avatar). */
export function randomConfig(seed = Math.floor(Math.random() * 2 ** 31)): CartoonConfig {
  let s = seed >>> 0;
  const rnd = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    v: 3,
    skin: pick(SKIN_TONES, rnd),
    hair: pick(HAIR_COLORS, rnd),
    top: pick(TOPS, rnd),
    eyes: pick(EYES.filter((e) => !['cry', 'xDizzy', 'vomit'].includes(e)), rnd),
    eyebrows: pick(EYEBROWS, rnd),
    mouth: pick(MOUTHS.filter((m) => !['vomit', 'screamOpen'].includes(m)), rnd),
    facialHair: rnd() < 0.25 ? pick(FACIAL_HAIR.slice(1), rnd) : 'none',
    accessory: rnd() < 0.35 ? pick(ACCESSORIES.slice(1), rnd) : 'none',
    accessoryColor: pick(ACCESSORY_COLORS, rnd),
    clothing: pick(CLOTHINGS, rnd),
    clothesColor: pick(CLOTHES_COLORS, rnd),
    graphic: pick(GRAPHICS, rnd),
    background: pick(BG_COLORS, rnd),
  };
}

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */

const inList = <T extends string>(v: unknown, list: readonly T[]): v is T =>
  typeof v === 'string' && (list as readonly string[]).includes(v);
const isHex = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-fA-F]{6}$/.test(v);

/**
 * Heals any config that doesn't fully match the current catalog — configs
 * saved by earlier avatar versions (v1 3D face data, v2 hand-drawn fields)
 * would otherwise render as broken/random-looking characters (e.g. bald).
 * Unknown fields fall back to the default individually, so a partially valid
 * config keeps everything the user actually chose.
 */
export function sanitizeConfig(input: unknown): CartoonConfig {
  const d = defaultConfig();
  if (!input || typeof input !== 'object') return d;
  const c = input as Record<string, unknown>;
  return {
    v: 3,
    skin: isHex(c.skin) ? c.skin : d.skin,
    hair: isHex(c.hair) ? c.hair : d.hair,
    top: inList(c.top, TOPS) ? c.top : d.top,
    eyes: inList(c.eyes, EYES) ? c.eyes : d.eyes,
    eyebrows: inList(c.eyebrows, EYEBROWS) ? c.eyebrows : d.eyebrows,
    mouth: inList(c.mouth, MOUTHS) ? c.mouth : d.mouth,
    facialHair: inList(c.facialHair, FACIAL_HAIR) ? c.facialHair : d.facialHair,
    accessory: inList(c.accessory, ACCESSORIES) ? c.accessory : d.accessory,
    accessoryColor: isHex(c.accessoryColor) ? c.accessoryColor : d.accessoryColor,
    clothing: inList(c.clothing, CLOTHINGS) ? c.clothing : d.clothing,
    clothesColor: isHex(c.clothesColor) ? c.clothesColor : d.clothesColor,
    graphic: inList(c.graphic, GRAPHICS) ? c.graphic : d.graphic,
    background: isHex(c.background) ? c.background : d.background,
  };
}

/**
 * Renders the avatar as an SVG string. Deterministic: the same config always
 * produces the same markup. opts.bg === false → transparent background.
 * Invalid/stale configs are sanitized, so this never throws or renders junk.
 */
export function renderAvatarSvg(raw: CartoonConfig, opts?: { bg?: boolean }): string {
  const c = sanitizeConfig(raw);
  const svg = createAvatar(avataaars, {
    skinColor: [c.skin],
    top: [c.top],
    hairColor: [c.hair],
    eyes: [c.eyes],
    eyebrows: [c.eyebrows],
    mouth: [c.mouth],
    facialHair: c.facialHair === 'none' ? undefined : [c.facialHair],
    facialHairProbability: c.facialHair === 'none' ? 0 : 100,
    accessories: c.accessory === 'none' ? undefined : [c.accessory],
    accessoriesColor: [c.accessoryColor],
    accessoriesProbability: c.accessory === 'none' ? 0 : 100,
    clothing: [c.clothing],
    clothesColor: [c.clothesColor],
    clothingGraphic: c.clothing === 'graphicShirt' ? [c.graphic] : undefined,
    backgroundColor: opts?.bg === false ? [] : [c.background],
  }).toString();
  // Post-processing:
  // 1. Strip DiceBear's <mask id="viewboxMask"> — several Chromium builds
  //    fail to rasterize masked inline SVGs and render them fully transparent
  //    (blank avatars). The mask only applies the optional corner radius,
  //    which we don't use, so removing it is safe.
  // 2. Strip fixed width/height so CSS controls size.
  // 3. Crop to cover so portrait slots (swipe cards) don't letterbox.
  return svg
    .replace(/ mask="url\(#viewboxMask\)"/g, '')
    .replace(/<mask id="viewboxMask">[\s\S]*?<\/mask>/g, '')
    .replace(/(width|height)="[^"]*"/g, '')
    .replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
}

/* ------------------------------------------------------------------ */
/* Selfie color suggestion                                             */
/* ------------------------------------------------------------------ */

/** Photo of the user (data URL) → suggested skin/hair hexes (no '#'). */
export async function suggestFromSelfie(
  src: string,
): Promise<{ skin: string; hair: string } | null> {
  try {
    const vision = await import('@mediapipe/tasks-vision');
    const fileset = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
    );
    const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      numFaces: 1,
    });
    const res = await fetch(src);
    const bmp = await createImageBitmap(await res.blob());
    const { faceLandmarks } = landmarker.detect(bmp);
    const face = faceLandmarks?.[0];
    landmarker.close();
    if (!face || face.length < 468) return null;
    const p = (i: number) => ({ x: face[i].x * bmp.width, y: face[i].y * bmp.height });
    const ctx = document.createElement('canvas');
    ctx.width = bmp.width;
    ctx.height = bmp.height;
    const c2d = ctx.getContext('2d')!;
    c2d.drawImage(bmp, 0, 0);
    const sample = (pt: { x: number; y: number }) => {
      const d = c2d.getImageData(
        Math.max(0, Math.min(bmp.width - 3, Math.round(pt.x - 1))),
        Math.max(0, Math.min(bmp.height - 3, Math.round(pt.y - 1))),
        3,
        3,
      ).data;
      const rgb = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) {
        rgb[0] += d[i];
        rgb[1] += d[i + 1];
        rgb[2] += d[i + 2];
      }
      const n = d.length / 4;
      return [rgb[0] / n, rgb[1] / n, rgb[2] / n] as [number, number, number];
    };
    // Skin: median of cheeks + nose bridge.
    const skinPts = [p(50), p(280), p(205), p(425), p(6)].map(sample);
    skinPts.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
    const skin = skinPts[2];
    // Hair: sample a ring of points just outside the upper face oval (10 =
    // crown, 103/67 = upper sides, 297/332 = the other side). Hair is almost
    // always the darkest non-skin patch up there — blow-out highlights and
    // bright backgrounds are the trap, so prefer the darkest candidate and
    // fall back to a safe dark brown when nothing convincing is found.
    const lum = (v: [number, number, number]) => 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2];
    const center = p(168);
    const cands: [number, number, number][] = [];
    for (const i of [10, 103, 67, 297, 332]) {
      const q = p(i);
      const pt = {
        x: q.x + (q.x - center.x) * 0.3,
        y: q.y + (q.y - center.y) * 0.45,
      };
      if (pt.y < 2 || pt.y > bmp.height - 2 || pt.x < 2 || pt.x > bmp.width - 2) continue;
      cands.push(sample(pt));
    }
    let hairRgb: [number, number, number] | null = null;
    if (cands.length) {
      const nonSkin = cands.filter(
        (s) => Math.hypot(s[0] - skin[0], s[1] - skin[1], s[2] - skin[2]) > 40,
      );
      const pool = (nonSkin.length ? nonSkin : cands)
        .slice()
        .sort((a, b) => lum(a) - lum(b));
      hairRgb = pool[0];
      if (lum(hairRgb) > lum(skin)) hairRgb = null; // blown-out frame — don't guess
    }
    return {
      skin: nearest(SKIN_TONES, skin),
      hair: hairRgb ? nearest(HAIR_COLORS, hairRgb) : '2c1b18',
    };
  } catch {
    return null; // CDN down / offline / no face — the editor still works manually.
  }
}

function nearest(palette: readonly string[], rgb: [number, number, number]): string {
  let best = palette[0];
  let bestD = Infinity;
  for (const hex of palette) {
    const c = hexRgb(hex);
    // Weighted euclidean, roughly perceptual.
    const d =
      2 * (c[0] - rgb[0]) ** 2 + 4 * (c[1] - rgb[1]) ** 2 + 3 * (c[2] - rgb[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = hex;
    }
  }
  return best;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/**
 * Rasterizes the avatar SVG to a PNG data URL (crisp, flat colors —
 * better than JPEG for cartoon art).
 */
export async function avatarToPng(config: CartoonConfig, width = 520): Promise<string> {
  const svg = renderAvatarSvg(config);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const height = Math.round(width);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}
