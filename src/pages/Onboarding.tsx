import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { qotdForDate, todayISO } from '../lib/gamification';

const STEPS = [
  {
    n: '01',
    title: 'Pick interests',
    body: 'Select three interests that represent you. This helps match you with classmates who share something in common.',
  },
  {
    n: '02',
    title: 'Add photos',
    body: 'Add up to 4 real photos, or skip this step. Photos help people recognize you in chat.',
  },
  {
    n: '03',
    title: 'Start chatting',
    body: 'Each message moves the meter: interests at three, name at sixteen, course at twenty-six.',
  },
];

export default function Onboarding() {
  const { profile, setProfile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [photos, setPhotos] = useState<string[]>(profile?.photos ?? []);

  const handleNext = () => {
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    setStep((s) => s - 1);
  };

  const handleUpload = (newPhotos: string[]) => {
    setPhotos(newPhotos);
    if (profile) {
      refreshProfile();
    }
    toast('Photos updated', 'success');
  };

  if (step > 3) {
    navigate('/meet');
    return null;
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-cream p-8">
      <h2 className="display-2 mb-6 text-ink">{STEPS[step - 1].title}</h2>
      <p className="mb-8 text-[15px] leading-relaxed text-ink-soft">
        {STEPS[step - 1].body}
      </p>

      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        {step > 1 && (
          <button
            onClick={handlePrev}
            className="px-4 py-2 text-[14px] text-teal-deem rounded border border-teal-mist hover:bg-teal-mist/10 transition"
          >
            Previous
          </button>
        )}

        <button
          onClick={handleNext}
          className="px-6 py-2.5 text-[14px] font-medium text-cream rounded bg-teal-deep hover:bg-teal-brand/10 transition"
        >
          {step === 3 ? 'Continue to Meet' : 'Next step'}
        </button>
      </div>
    </div>
  );
}
