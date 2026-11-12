import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const PROFILE_AVATAR_BUCKET = 'profile-avatars';

export function ProfilePhoto({
  path, preview, className = '',
}: { path?: string | null; preview?: string; className?: string }) {
  const [signed, setSigned] = useState<{ path: string; url: string }>();
  const [failedUrl, setFailedUrl] = useState('');

  useEffect(() => {
    if (!path || preview) return;
    let active = true;

    async function sign() {
      if (!path) return;
      const { data } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).createSignedUrl(path, 120);
      if (active) setSigned(data ? { path, url: data.signedUrl } : undefined);
    }

    void sign();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') void sign();
    }, 90_000);
    function onVisibility() {
      if (document.visibilityState === 'visible') void sign();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      window.clearInterval(refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [path, preview]);

  const src = preview ?? (path && signed?.path === path ? signed.url : undefined);

  return (
    <span className={`profile-photo ${className}`}>
      {src && failedUrl !== src ? (
        <img src={src} alt="" onError={() => setFailedUrl(src)} />
      ) : (
        <UserRound aria-hidden="true" size="44%" strokeWidth={1.4} />
      )}
    </span>
  );
}

