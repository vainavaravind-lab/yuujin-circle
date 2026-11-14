import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { Toaster, toast as notify } from 'sonner';
type ToastKind = 'success' | 'error' | 'info';
interface ToastContextValue { toast: (message: string, kind?: ToastKind) => void }
const ToastContext = createContext<ToastContextValue | undefined>(undefined);
export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    notify[kind](message, { duration: kind === 'error' ? 7000 : 4000 });
  }, []);
  return <ToastContext.Provider value={{ toast }}>
    {children}
    <Toaster position="top-center" closeButton theme="light" visibleToasts={3}
      offset="max(20px, env(safe-area-inset-top))" mobileOffset="max(16px, env(safe-area-inset-top))"
      toastOptions={{ className: 'campus-toast' }} />
  </ToastContext.Provider>;
}
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
