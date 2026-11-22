import { AlertTriangle } from 'lucide-react';
import type { TransactionStage } from '@/src/types/prooftask';
import { Modal } from './Modal';
import { TransactionStatus } from './TransactionStatus';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  txStage?: TransactionStage;
  txError?: string | null;
  operationLabel?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  isSubmitting = false,
  txStage = 'idle',
  txError = null,
  operationLabel = 'Confirmando operación',
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidthClass="max-w-md"
      disableClose={isSubmitting}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-sm leading-relaxed text-amber-100">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <p>{message}</p>
        </div>

        <TransactionStatus
          stage={txStage}
          operationLabel={operationLabel}
          errorMessage={txError}
          isSimulated
        />

        <div className="flex flex-col-reverse gap-2.5 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg border border-white/10 px-4 text-sm font-medium text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-40 sm:w-auto"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg bg-rose-600 px-4 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
