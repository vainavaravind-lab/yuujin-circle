import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera } from 'lucide-react';
import { ProfilePhoto, PROFILE_AVATAR_BUCKET } from '../components/ProfilePhoto';
import { Splash } from '../components/Splash';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DEPARTMENTS, INTEREST_TAGS, LOOKING_FOR_OPTIONS, YEARS } from '../lib/constants';
import type { LookingFor, Profile } from '../lib/database.types';
import { prepareProfilePhoto } from '../lib/profilePhoto';
import { supabase } from '../lib/supabase';

export default function Onboarding() {
  const { profile } = useAuth();
  return profile ? <ProfileEditor key={profile.id} profile={profile} /> : <Splash />;
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const { setProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const editing = profile.onboarding_complete;
  const [name, setName] = useState(profile.full_name);
  const [department, setDepartment] = useState(profile.department);
  const [year, setYear] = useState(profile.year?.toString() ?? '');
  const [bio, setBio] = useState(profile.bio);
  const [interests, setInterests] = useState(profile.interests.slice(0, 8));
  const [lookingFor, setLookingFor] = useState<LookingFor>(profile.looking_for ?? 'both');
  const [photo, setPhoto] = useState<{ blob: Blob; url: string }>();
  const [removePhoto, setRemovePhoto] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (photo) return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  async function pickPhoto(file?: File) {
    if (!file) return;
    setPreparing(true);
    try {
      const blob = await prepareProfilePhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setRemovePhoto(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not open this photo.', 'error');
    } finally {
      setPreparing(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving || preparing || !name.trim() || !year || !department || !interests.length) return;
    setSaving(true);
    const previous = profile.profile_photo_path ?? null;
    let path = removePhoto ? null : previous;
    const bucket = supabase.storage.from(PROFILE_AVATAR_BUCKET);
    try {
      if (photo) {
        path = `${profile.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await bucket.upload(path, photo.blob, { contentType: 'image/jpeg' });
        if (error) throw new Error(error.message);
      }
      const { error } = await supabase.rpc('save_profile', {
        p_name: name, p_department: department, p_year: Number(year), p_bio: bio,
        p_interests: interests, p_looking_for: lookingFor, p_photo_path: path,
        p_previous_photo_path: previous,
      });
      if (error) {
        // Delete a new upload only when the server explicitly rejected the update.
        if (photo && path && error.code === 'P0001') await bucket.remove([path]);
        await refreshProfile();
        throw new Error(error.message);
      }
      setProfile({
        ...profile, full_name: name.trim(), department, year: Number(year), bio: bio.trim(),
        interests, looking_for: lookingFor, profile_photo_path: path, onboarding_complete: true,
      });
      if (previous && previous !== path) await bucket.remove([previous]);
      toast(editing ? 'Profile saved.' : 'You’re ready to meet.', 'success');
      navigate(editing ? '/profile' : '/meet', { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save your profile.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="wrap profile-editor">
      {editing && <Link to="/profile" className="link text-sm">Back to profile</Link>}
      <h1 className="display-1 mt-3">{editing ? 'Edit profile' : 'Make yourself at home.'}</h1>
      <form onSubmit={save} className="mt-7">
        <fieldset disabled={saving} className="space-y-6">
          <div className="card flex flex-wrap items-center gap-5 p-5">
            <ProfilePhoto path={removePhoto ? null : profile.profile_photo_path} preview={photo?.url}
              className="size-24" />
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Profile photo</h2>
              <p className="mb-3 text-sm text-ink-soft">Optional. Your classmate can see it after eight messages.</p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-ghost relative cursor-pointer focus-within:outline focus-within:outline-offset-2">
                  <Camera size={16} /> {preparing ? 'Preparing…' : 'Choose photo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={preparing}
                    className="sr-only" aria-label="Choose profile photo"
                    onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ''; }} />
                </label>
                {(photo || (!removePhoto && profile.profile_photo_path)) && (
                  <button type="button" className="link text-sm" disabled={preparing}
                    onClick={() => { setPhoto(undefined); setRemovePhoto(true); }}>Remove</button>
                )}
              </div>
            </div>
          </div>
          <label className="grid gap-2 text-sm">Name
            <input className="input" autoComplete="name" required maxLength={60} value={name}
              onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <label className="grid gap-2 text-sm">Department
              <select className="input" required value={department} onChange={(e) => setDepartment(e.target.value)}>
                <option value="">Select department</option>
                {[...new Set([...DEPARTMENTS, ...(profile.department ? [profile.department] : [])])].map((item) =>
                  <option key={item}>{item}</option>
                )}
              </select>
            </label>
            <label className="grid gap-2 text-sm">Year
              <select className="input" required value={year} onChange={(e) => setYear(e.target.value)}>
                <option value="">Select year</option>
                {YEARS.map((item) => <option key={item} value={item}>Year {item}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-sm">I’m here for
            <select className="input" value={lookingFor} onChange={(e) => setLookingFor(e.target.value as LookingFor)}>
              {LOOKING_FOR_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm">Bio <span className="sr-only">(optional)</span>
            <textarea className="input !h-auto py-3" rows={3} maxLength={300} value={bio}
              onChange={(e) => setBio(e.target.value)} />
          </label>
          <fieldset>
            <legend className="text-sm">Interests <span className="text-ink-soft">· Choose 1–8</span></legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Set([...INTEREST_TAGS, ...profile.interests])].map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <button type="button" key={interest} className="chip profile-interest" aria-pressed={selected}
                    disabled={!selected && interests.length >= 8}
                    onClick={() => setInterests((items) => selected
                      ? items.filter((item) => item !== interest)
                      : [...items, interest])}>
                    {interest}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <button type="submit" className="btn-primary" disabled={saving || preparing || !interests.length}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Continue to Meet'} <ArrowRight size={16} />
          </button>
        </fieldset>
      </form>
    </main>
  );
}

