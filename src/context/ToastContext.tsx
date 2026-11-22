import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    Icon: typeof CheckCircle2;
    iconContainerClass: string;
    borderClass: string;
    label: string;
  }
> = {
  success: {
    Icon: CheckCircle2,
    iconContainerClass: 'bg-[#14F195]/12 text-[#14F195] border-[#14F195]/25',
    borderClass: 'border-[#14F195]/30',
    label: 'Éxito',
  },
  error: {
    Icon: AlertCircle,
    iconContainerClass: 'bg-rose-500/12 text-rose-400 border-rose-500/25',
    borderClass: 'border-rose-500/35',
    label: 'Error',
  },
  warning: {
    Icon: AlertTriangle,
    iconContainerClass: 'bg-amber-400/12 text-amber-300 border-amber-400/25',
    borderClass: 'border-amber-400/35',
    label: 'Advertencia',
  },
  info: {
    Icon: Info,
    iconContainerClass: 'bg-[#9945FF]/15 text-[#C084FC] border-[#9945FF]/30',
    borderClass: 'border-[#9945FF]/35',
    label: 'Información',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4800);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2.5 sm:bottom-5 sm:left-auto sm:right-5 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => {
          const config = VARIANT_CONFIG[toast.variant];
          const Icon = config.Icon;

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${config.borderClass} bg-[#151E31]/95 p-3.5 shadow-2xl shadow-black/60 backdrop-blur-md transition-all duration-200`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${config.iconContainerClass}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold leading-snug text-[#F8FAFC]">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label={`Cerrar notificación de ${config.label}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe utilizarse dentro de ToastProvider.');
  }
  return ctx;
}
