import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  ChevronRight,
  Download,
  Heart,
  LogOut,
  Pencil,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { COLLEGE_DOMAIN } from '../lib/constants';
import { deptYear, fullName, initialsOf, lookingForLabel } from '../lib/profile';
import { Avatar } from '../components/CartoonAvatar';
import { ConfirmDialog } from '../components/ConfirmDialog';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  async function handleDelete() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const url = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${url}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not delete account');

      toast('Account deleted. Take care! 👋', 'success');
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete account', 'error');
    }
  }

  if (!profile) return null;

  return (
    <div className="pb-4">
      <header>
        <h1 className="display-1">Profile</h1>
        <p className="lead mt-3 max-w-[46ch]">
          What a classmate sees once the meter has filled: the three answers, the interests, and the
          course your @{COLLEGE_DOMAIN} address proved.
        </p>
      </header>

      {/* ---------------- identity ---------------- */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }}
        className="mt-8 flex flex-col gap-6 border-y border-white/[0.08] py-7 sm:flex-row sm:items-start"
      >
        <div className="shrink-0">
          <Avatar profile={profile} size="lg" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="display-2 text-ink">{fullName(profile)}</h2>
            <span className="label flex items-center gap-1 !text-teal-deep">
              <BadgeCheck size={12} /> verified
            </span>
          </div>
          <p className="mt-1 text-[14px] text-ink-soft">
            {deptYear(profile)} · {lookingForLabel(profile.looking_for)}
          </p>

          {profile.bio && (
            <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.65] text-ink">{profile.bio}</p>
          )}

          {profile.interests.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5">
              {profile.interests.slice(0, 8).map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-ink-soft">
                  <Heart size={11} className="text-teal-brand" />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>

      {/* ---------------- photos ---------------- */}
      {profile.photos.length > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {profile.photos.map((src) => (
            <img key={src} src={src} alt="" className="h-28 w-22 shrink-0 rounded-[12px] object-cover" />
          ))}
        </div>
      )}

      {/* ---------------- prompts ---------------- */}
      {profile.prompts?.length > 0 && (
        <section className="mt-12 rise">
          <h2 className="display-3 text-ink">In their words</h2>
          <dl className="mt-4 border-t border-white/[0.08]">
            {profile.prompts.map((p, i) => (
              <div key={i} className="border-b border-white/[0.08] py-4">
                <dt className="label">{p.question}</dt>
                <dd className="mt-1.5 text-[16px] leading-[1.55] text-ink">{p.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ---------------- settings ---------------- */}
      <section className="mt-12 rise">
        <h2 className="display-3 text-ink">Your account</h2>

        <div className="mt-4 flex items-center justify-between gap-4 border-y border-white/[0.08] py-3.5">
          <span className="label flex items-center gap-1.5">
            <BadgeCheck size={12} className="text-teal-deep" /> verified student
          </span>
          <span className="truncate text-[13px] text-ink-soft">{user?.email}</span>
        </div>

        <ul className="mt-2">
          {[
            {
              key: 'edit',
              icon: Pencil,
              label: 'Edit profile and prompts',
              note: 'Bio, interests, the three answers.',
            },
            {
              key: 'safety',
              icon: ShieldCheck,
              label: 'Safety and reporting',
              note: 'Reach the team behind the campus check.',
            },
            {
              key: 'logout',
              icon: LogOut,
              label: 'Log out',
              note: 'Signing back in takes one link.',
            },
          ].map(({ key, icon: Icon, label, note }) => {
            const inner = (
              <>
                <Icon size={16} className="shrink-0 text-ink-soft" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium text-ink">{label}</span>
                  <span className="block text-[13px] text-ink-soft">{note}</span>
                </span>
                <ChevronRight
                  size={15}
                  className="shrink-0 text-ink-faint transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </>
            );
            const cls =
              'group flex w-full items-center gap-4 border-b border-white/[0.08] py-4 text-left transition-colors duration-200 hover:bg-white/[0.03]';
            if (key === 'edit')
              return (
                <li key={key}>
                  <Link to="/onboarding/edit" className={cls}>
                    {inner}
                  </Link>
                </li>
              );
            if (key === 'safety')
              return (
                <li key={key}>
                  <a href="mailto:support@yuujincircle.app?subject=Safety%20concern" className={cls}>
                    {inner}
                  </a>
                </li>
              );
            return (
              <li key={key}>
                <button
                  onClick={() => setConfirmLogout(true)}
                  className={cls}
                >
                  {inner}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------- deleting ---------------- */}
      <section className="mt-12 rise">
        <h2 className="display-3 text-ink">Leaving for good</h2>
        <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.6] text-ink-soft">
          Deleting removes your profile, photos, pairings and every message. It cannot be undone.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button className="btn-ghost-rose" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={15} /> Delete account
          </button>
          <span className="flex items-center gap-1.5 text-[12px] text-ink-soft">
            <Download size={12} /> Want a copy first? Ask the support address above.
          </span>
        </div>
      </section>

      <p className="label mt-12 border-t border-white/[0.08] pt-6">
        Yuujin Circle · @{COLLEGE_DOMAIN} · {initialsOf(profile)}
      </p>

      <ConfirmDialog
        open={confirmLogout}
        title="Log out?"
        body="You can sign back in anytime with a magic link to your college email."
        confirmLabel="Log out"
        onConfirm={async () => {
          setConfirmLogout(false);
          await signOut();
        }}
        onCancel={() => setConfirmLogout(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        danger
        title="Delete account?"
        body={
          <div className="space-y-3">
            <p>
              This permanently deletes your profile, photos, matches and messages. This cannot be
              undone.
            </p>
            <p>
              Type <strong className="text-ink">DELETE</strong> to confirm:
            </p>
            <input
              className="input"
              placeholder="DELETE"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
            />
          </div>
        }
        confirmLabel="Delete forever"
        onConfirm={() => {
          if (deleteText.trim().toUpperCase() !== 'DELETE') {
            toast('Type DELETE to confirm', 'error');
            return;
          }
          setConfirmDelete(false);
          handleDelete();
        }}
        onCancel={() => {
          setConfirmDelete(false);
          setDeleteText('');
        }}
      />
    </div>
  );
}
