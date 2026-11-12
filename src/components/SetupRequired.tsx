import { Database, KeyRound, Rocket } from 'lucide-react';
import { Logo } from './Logo';
import { CODE_SNIPPET_ENV } from '../lib/setupSteps';

export function SetupRequired() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-cream px-4 py-10">
      <div className="card w-full max-w-lg p-8">
        <Logo size={44} />
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">One quick setup step</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Yuujin Circle is installed, but it isn't connected to a Supabase project yet. Follow
          <strong className="text-ink"> SETUP.md</strong> in the project root — it takes about 5 minutes.
        </p>

        <ol className="mt-6 space-y-4">
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-mist text-teal-deep">
              <Database size={18} />
            </span>
            <div className="text-sm">
              <p className="font-bold text-ink">Create a free project at supabase.com</p>
              <p className="mt-0.5 text-ink-soft">Any name works, e.g. "yuujin-circle".</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-mist text-teal-deep">
              <Database size={18} />
            </span>
            <div className="text-sm">
              <p className="font-bold text-ink">Run supabase/schema.sql</p>
              <p className="mt-0.5 text-ink-soft">Paste the whole file into the Supabase SQL Editor and run it.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-mist text-teal-deep">
              <KeyRound size={18} />
            </span>
            <div className="text-sm">
              <p className="font-bold text-ink">Copy your keys into .env.local</p>
              <p className="mt-0.5 text-ink-soft">From Project Settings → API.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-mist text-teal-deep">
              <Rocket size={18} />
            </span>
            <div className="text-sm">
              <p className="font-bold text-ink">Restart the dev server</p>
              <p className="mt-0.5 text-ink-soft">Stop it, then run npm run dev again.</p>
            </div>
          </li>
        </ol>

        <pre className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-teal-soft">
          {CODE_SNIPPET_ENV}
        </pre>
      </div>
    </div>
  );
}
