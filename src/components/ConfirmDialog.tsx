import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-cream p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="w-full max-w-sm rounded-[16px] bg-cream-100 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="display-2 text-ink mb-3">{title}</h3>
            <div className="mt-2 text-[14px] leading-[1.6] text-ink-soft">{body}</div>
            <div className="mt-6 flex gap-3">
              <button className="btn-ghost flex-1" onClick={onCancel}>
                Cancel
              </button>
              <button className={(danger ? 'btn-rose' : 'btn-primary') + ' flex-1'} onClick={onConfirm}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
