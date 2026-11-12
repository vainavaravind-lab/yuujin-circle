import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Splash } from '../components/Splash';

/**
 * Verifies OTP tokens that arrive as ?token_hash=...&type=magiclink
 * (used when a mail client strips the PKCE code flow).
 */
export default function Verify() {
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get('token_hash');
      const type = params.get('type') as 'magiclink' | 'signup' | null;
      if (!tokenHash || !type) {
        setStatus('error');
        setMessage('This link looks incomplete. Please request a new one.');
        return;
      }
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) {
        setStatus('error');
        setMessage(error.message);
      } else {
        window.location.replace('/meet');
      }
    })();
  }, []);

  if (status === 'error') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md border border-white/10 bg-cream-100 p-8">
          <Link2 size={24} className="text-ink-soft" />
          <h1 className="display-2 mt-5 text-ink">That link is spent</h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft">
            {message || 'Magic links are single-use and expire after a few minutes.'}
          </p>
          <a href="/" className="btn-primary mt-6 w-full">
            Request a new one
          </a>
        </div>
      </div>
    );
  }

  return <Splash label="Verifying your link…" />;
}
