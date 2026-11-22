import { AlertTriangle, Check, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react';
import type { TransactionStage } from '@/src/types/prooftask';

interface TransactionStatusProps {
  stage: TransactionStage;
  operationLabel?: string;
  errorMessage?: string | null;
  isSimulated?: boolean;
}

interface StageStep {
  key: Exclude<TransactionStage, 'idle' | 'error'>;
  label: string;
}

const STAGES: StageStep[] = [
  { key: 'preparing', label: 'Preparando' },
  { key: 'awaiting_signature', label: 'Esperando firma' },
  { key: 'submitting', label: 'Enviando' },
  { key: 'confirming', label: 'Confirmando' },
  { key: 'success', label: 'Éxito' },
];

const STAGE_ORDER: Record<Exclude<TransactionStage, 'idle' | 'error'>, number> = {
  preparing: 0,
  awaiting_signature: 1,
  submitting: 2,
  confirming: 3,
  success: 4,
};

export function TransactionStatus({
  stage,
  operationLabel = 'Operación de contrato',
  errorMessage,
  isSimulated = true,
}: TransactionStatusProps) {
  if (stage === 'idle') return null;

  const isError = stage === 'error';
  const isSuccess = stage === 'success';
  const currentIndex = isError ? -1 : STAGE_ORDER[stage];

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-white/[0.1] bg-[#0B1020]/90 p-4 shadow-inner"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {isError ? (
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
          ) : isSuccess ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#14F195]" aria-hidden="true" />
          ) : (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-[#9945FF]"
              aria-hidden="true"
            />
          )}
          <span className="text-sm font-semibold text-[#F8FAFC]">{operationLabel}</span>
        </div>

        {isSimulated && (
          <span className="font-mono text-[11px] text-[#94A3B8]">
            Transición simulada · Demostración
          </span>
        )}
      </div>

      {/* Responsive steps: clean horizontal bars on sm+, structured readable list on narrow mobile */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-2.5">
        {STAGES.map((step, index) => {
          const completed = !isError && (isSuccess || index < currentIndex);
          const active = !isError && !isSuccess && index === currentIndex;
          const isFinalSuccess = step.key === 'success' && isSuccess;
          const done = completed || isFinalSuccess;

          return (
            <div key={step.key} className="flex items-center gap-2.5 sm:flex-col sm:items-stretch sm:gap-1.5">
              <div
                className={`h-1.5 w-8 shrink-0 rounded-full transition-colors duration-200 sm:w-full ${
                  isError
                    ? 'bg-rose-500/30'
                    : done
                      ? 'bg-[#14F195]'
                      : active
                        ? 'bg-[#9945FF]'
                        : 'bg-white/10'
                }`}
              />
              <div className="flex items-center gap-1.5 min-w-0">
                {done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#14F195]" aria-hidden="true" />
                ) : active ? (
                  <Loader2
                    className="h-3.5 w-3.5 shrink-0 animate-spin text-[#9945FF]"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="font-mono text-[10px] tabular-nums text-[#94A3B8]/60"
                    aria-hidden="true"
                  >
                    0{index + 1}
                  </span>
                )}
                <span
                  className={`text-xs font-medium leading-tight sm:text-[11px] ${
                    isError
                      ? 'text-[#94A3B8]'
                      : done
                        ? 'text-[#14F195]'
                        : active
                          ? 'text-[#F8FAFC]'
                          : 'text-[#94A3B8]/70'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {isError && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-relaxed text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
          <span>{errorMessage || 'No se pudo completar la operación.'}</span>
        </div>
      )}
    </div>
  );
}
