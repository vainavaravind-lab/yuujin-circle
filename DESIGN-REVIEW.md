# Design review — 14 November 2026

## Direction
- Product: dating and friendship conversations for verified SNU Chennai students.
- Character: conversational, editorial, warm.
- World: campus notes, paper and ink.
- Moments: the explanatory scrolling conversation and the actual conversation bubbles.
- Signature: the five-stage reveal meter, used consistently in the demo and app.

## Audit and changes
Repeated ornamental arches and gradient panels competed with useful content. Loading, onboarding, errors and confirmations had a different visual language. Labels were too small and widely tracked. Frequent tab changes waited for exit animations. Confirmations lacked native modal focus containment; notifications had no dismiss control. Enlarged text caused the photo chooser to overflow.

The finishing pass introduces shared paper surfaces, readable sentence-case labels, restrained cards, consistent control radii and neutral shadows. Campus headings name their context. Profile editing has a desktop introduction alongside the form, a stacked phone layout, visible interest counts and an explanation of photo/name reveal thresholds. Loading and auth failures now share the same visual language.

Native dialog supplies keyboard containment, Escape, focus restoration and an inert background. Cancel is the initial focus target for destructive actions. Sonner replaces the custom toast timers, retaining the existing toast API and providing dismissible, announced feedback. Error notifications remain visible longer.

The user-requested moving chat, glass finale, scale changes and slow sign-in navigation remain. Decorative campus headers and the repeated tab exit/entrance sequence are removed. Text movement no longer animates blur; the two meters animate scale rather than layout width. The background-wide moving light is removed. MotionConfig respects reduced-motion across React motion, alongside CSS reduced-motion and reduced-transparency fallbacks. Mobile controls use manipulation touch behavior, chat contains overscroll, and inputs stay at least 16px.

Photo and blocking authorization behavior is unchanged. No database migrations or live data writes were performed for this design pass.

## Motion decisions
- Lead: scroll-driven sample conversation, controlled by the visitor's scroll.
- Support: message and reveal changes; preserve the independent text lane.
- Static: navigation destinations, everyday page headings and ornamental chrome.
- Confirmation: 200ms opacity/8px entrance, no overshoot.
- Meter: 240ms scale update, no motion under reduced-motion.
- Rejected: animated typing controls, repeated tab entrances, extra floating panels, full-page light drift.

## Skill scope
Applied the web design, Apple interaction, choreography, motion review/removal, mobile, worst-case, library selection and Unslop guidance where relevant. Sonner was selected for accessible notifications. The final implementation was reviewed directly; no review was delegated. Swift and Expo are not applicable to this React web app and were not introduced. Animation vocabulary: scroll-linked translation, scale, parallax and refractive glass; names informed the audit rather than adding effects.

The isolated prototype is design-review.html (development only, not part of the production Vite entry). It offers Ink, Postcard and Margin chat compositions, number/arrow-key selection and Demo/Worst-case/Empty data. No alternative replaces production automatically.

## Verification
- npx tsc -b --pretty false: passed.
- npm run build: passed; existing large-bundle warning remains (approximately 661kB JS, 198kB gzip).
- Headless Chrome, mocked Supabase: Meet, Friends, League, Profile, profile editor and chat at 1440, 390 and 320px.
- Long names and unbroken messages: no horizontal page overflow.
- 200% root text sizing at 390px: all six screens passed after fixing the photo chooser wrapping.
- Confirm dialog: focus inside modal; Escape dismisses.
- Empty/blocked campus states: passed.
- Sign-in navigation: gradual travel and correct focus/destination on desktop and phone widths. A final rerun caught font/layout movement during the glide; the destination is now recalculated each animation frame. The check also passes with a deliberate 72px layout shift after clicking.
- Mock sign-in success, missing-link recovery, all three prototype variants and worst-case toggle: passed.
- No physical phone test or real-user login/send/upload performed.

GATE: ERROR — the design skill's Chrome launcher exited early, so its consistency/layout and rendered-copy checks did not run. Not retried, per the checker's instruction. The separate application browser checks above passed; this is not a gate pass.

## Deliberate exceptions
The existing serif identity, lavender accent and user-requested explanatory scroll/glass effects are retained instead of imposing a new template. The production app keeps content-driven heights rather than forcing every functional screen into fixed full-screen marketing sections.

Unslop by Damir Sokolovsky (https://heydamir.design/unslop), CC BY 4.0. Skill files are installed in the task's .agents/skills/unslop directory; they are not shipped with the application.
