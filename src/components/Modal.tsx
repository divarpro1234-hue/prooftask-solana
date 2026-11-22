import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClass?: string;
  disableClose?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidthClass = 'max-w-lg',
  disableClose = false,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disableClose) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, disableClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="fixed inset-0 bg-[#050814]/80 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!disableClose) onClose();
        }}
        aria-hidden="true"
      />
      <div
        className={`relative z-10 max-h-[92vh] w-full overflow-y-auto ${maxWidthClass} rounded-t-2xl sm:rounded-xl border border-white/[0.12] bg-[#151E31] p-5 sm:p-6 shadow-2xl shadow-black/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] pb-4">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="font-display text-lg font-semibold tracking-tight text-[#F8FAFC]"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-[#94A3B8]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            aria-label="Cerrar ventana"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
