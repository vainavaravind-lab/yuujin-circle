import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Splash } from '../components/Splash';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (session) {
      if (!handled.current) {
        handled.current = true;
        navigate('/meet', { replace: true });
      }
      return;
    }

    // No session yet — try PKCE code exchange (?code=... from a real magic-link email)
    // or OTP token verification (?token_hash=... from the dev test-user script).
    if (!handled.current) {
      handled.current = true;
      (async () => {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');

        if (tokenHash && type) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            type: type as 'magiclink' | 'signup',
            token_hash: tokenHash,
          });
          if (otpErr) {
            setError(otpErr.message);
            return;
          }
          navigate('/meet', { replace: true });
          return;
        }

        const { error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exErr) {
          setError(exErr.message);
        } else {
          navigate('/meet', { replace: true });
        }
      })();
    }
  }, [session, loading, navigate]);

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md border border-white/10 bg-cream-100 p-8">
          <CircleAlert size={24} className="text-rose-brand" />
          <h1 className="display-2 mt-5 text-ink">Sign-in did not finish</h1>
          <p className="mt-3 text-[15px] leading-[1.6] text-ink-soft">
            {error}. Requesting a fresh link usually fixes it.
          </p>
          <button className="btn-primary mt-6 w-full" onClick={() => navigate('/', { replace: true })}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return <Splash label="Signing you in…" />;
}
