import { useEffect, useId, useRef, type ReactNode } from 'react';
/** Native modal provides focus containment, Escape and an inert background. */
export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; body: ReactNode; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={ref} className="confirm-dialog" aria-labelledby={titleId} aria-describedby={bodyId}
    onCancel={(e) => { e.preventDefault(); onCancel(); }}
    onClick={(e) => { if (e.target === e.currentTarget) {
      const box = e.currentTarget.getBoundingClientRect();
      if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) onCancel();
    } }}>
    <h2 id={titleId}>{title}</h2>
    <div id={bodyId} className="confirm-body">{body}</div>
    <div className="confirm-actions">
      <button autoFocus className="btn-ghost" onClick={onCancel}>Cancel</button>
      <button className={danger ? 'btn-rose' : 'btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </dialog>;
}
