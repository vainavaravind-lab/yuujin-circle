import type { Profile } from './database.types';

export function displayName(p: Profile | null | undefined): string {
  if (!p) return 'Student';
  const n = p.full_name?.trim();
  return n && n.length > 0 ? n.split(' ')[0] : 'Student';
}

export function fullName(p: Profile | null | undefined): string {
  return p?.full_name?.trim() || 'SNUC Student';
}

export function initialsOf(p: Profile | null | undefined): string {
  const n = p?.full_name?.trim();
  if (!n) return 'S';
  const parts = n.split(/\s+/).slice(0, 2);
  return parts.map((w) => w[0]?.toUpperCase() ?? '').join('') || 'S';
}

export function deptYear(p: Profile | null | undefined): string {
  const bits: string[] = [];
  if (p?.department) bits.push(p.department);
  if (p?.year) bits.push(`Year ${p.year}`);
  return bits.join(' · ');
}

export function lookingForLabel(v: string | null | undefined): string {
  switch (v) {
    case 'dating':
      return 'Dating';
    case 'friendship':
      return 'Friendship';
    case 'both':
      return 'Open to both';
    default:
      return '';
  }
}

export function isOnboarded(p: Profile | null | undefined): boolean {
  return Boolean(p?.onboarding_complete);
}

export function primaryPhoto(p: Profile | null | undefined): string | null {
  return p?.photos?.[0] ?? null;
}
