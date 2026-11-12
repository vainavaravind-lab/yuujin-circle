import { useMemo } from 'react';
import { renderAvatarSvg, defaultConfig } from '../lib/cartoon';
import type { CartoonConfig } from '../lib/cartoon';
import { initialsOf } from '../lib/profile';
import type { Profile } from '../lib/database.types';

/** The image a profile shows as its face: cartoon avatar → photo → initials. */
export function faceImageOf(profile: Profile | null | undefined): string | null {
  return profile?.photos?.[0] ?? null;
}

/**
 * Inline cartoon avatar. Renders the profile's character directly as SVG
 * (crisp at any size, zero asset loads); falls back to initials.
 */
export function CartoonAvatar({
  config,
  className = '',
}: {
  config: CartoonConfig | null | undefined;
  className?: string;
}) {
  const svg = useMemo(() => (config ? renderAvatarSvg(config, { bg: true }) : null), [config]);
  if (!svg) return null;
  return (
    <div
      className={`overflow-hidden [&>svg]:h-full [&>svg]:w-full ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

const SIZES: Record<string, string> = {
  sm: 'h-10 w-10 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export function Avatar({
  profile,
  size = 'md',
  ring = false,
}: {
  profile: Profile | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  ring?: boolean;
}) {
  const src = faceImageOf(profile);
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full
        ${SIZES[size]} bg-gradient-to-br from-teal-soft to-teal-soft font-bold text-teal-deep
        ${ring ? 'ring-2 ring-white/25' : ''}`}
    >
      {profile?.avatar?.config ? (
        <CartoonAvatar config={profile.avatar.config} className="h-full w-full" />
      ) : src ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        initialsOf(profile)
      )}
    </div>
  );
}
