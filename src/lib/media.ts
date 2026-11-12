/** GIF messages: stored as `gif:<url>` so they're unambiguous in the DB and previews. */
export const GIF_PREFIX = 'gif:';

/** Extract a renderable GIF url from message content, or null if it's not a GIF message. */
export function gifUrlFromContent(content: string): string | null {
  if (content.startsWith(GIF_PREFIX)) {
    const url = content.slice(GIF_PREFIX.length).trim();
    return /^https?:\/\//.test(url) ? url : null;
  }
  // Bare .gif/.webp URL fallback (legacy/edge cases).
  const bare = content.trim();
  return /^https?:\/\/\S+\.(gif|webp)(\?\S*)?$/i.test(bare) ? bare : null;
}

export const isGifMessage = (content: string): boolean => gifUrlFromContent(content) !== null;
