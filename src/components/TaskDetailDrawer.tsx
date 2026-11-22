import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Play,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useTaskRepository } from '@/src/context/RepositoryContext';
import { useToast } from '@/src/context/ToastContext';
import { useWallet } from '@/src/context/WalletContext';
import type { Task, TaskStatus, TransactionStage } from '@/src/types/prooftask';
import {
  BYTE_LIMITS,
  formatSpanishDateTime,
  getUtf8ByteLength,
  validateEvidenceUrl,
} from '@/src/utils/bytes';
import { TaskStatusLabel } from './TaskStatusLabel';
import { TransactionStatus } from './TransactionStatus';

interface TaskDetailDrawerProps {
  task: Task | null;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
  onRequestCloseTask: (task: Task) => void;
}

const WORKFLOW_STEPS: { key: TaskStatus | 'Close'; label: string }[] = [
  { key: 'Pending', label: 'Pendiente' },
  { key: 'InProgress', label: 'En progreso' },
  { key: 'Completed', label: 'Completada' },
  { key: 'Close', label: 'Cierre' },
];

const STATUS_INDEX: Record<TaskStatus, number> = {
  Pending: 0,
  InProgress: 1,
  Completed: 2,
};

export function TaskDetailDrawer({
  task,
  onClose,
  onTaskUpdated,
  onRequestCloseTask,
}: TaskDetailDrawerProps) {
  const repository = useTaskRepository();
  const { wallet, openConnectModal } = useWallet();
  const { showToast } = useToast();

  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [txStage, setTxStage] = useState<TransactionStage>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [txLabel, setTxLabel] = useState('Operación de tarea');
  const [isOperating, setIsOperating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (task) {
      setEvidenceUrl('');
      setEvidenceError(null);
      setTxStage('idle');
      setTxError(null);
      setIsOperating(false);
      setCopiedId(false);
    }
  }, [task?.publicKey, task?.status]);

  useEffect(() => {
    if (!task) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isOperating) {
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
  }, [task, isOperating, onClose]);

  if (!task) return null;

  const evidenceBytes = getUtf8ByteLength(evidenceUrl.trim());
  const evidencePct = Math.min(100, (evidenceBytes / BYTE_LIMITS.EVIDENCE_URL) * 100);
  const currentStepIndex = STATUS_INDEX[task.status];

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(task.publicKey);
      setCopiedId(true);
      showToast({
        title: 'Identificador copiado',
        description: task.publicKey,
        variant: 'info',
      });
      setTimeout(() => setCopiedId(false), 1800);
    } catch {
      showToast({
        title: 'No se pudo copiar el identificador',
        variant: 'error',
      });
    }
  };

  const handleStartTask = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setTxLabel('Iniciar tarea');
      setTxStage('error');
      setTxError('Conecta una wallet de demostración antes de iniciar esta tarea.');
      showToast({
        title: 'Wallet requerida',
        description: 'Conecta una wallet de demostración para iniciar la tarea.',
        variant: 'warning',
      });
      return;
    }

    setTxLabel('Iniciando tarea (Pendiente → En progreso)');
    setTxError(null);
    setIsOperating(true);

    try {
      const result = await repository.startTask(
        task.publicKey,
        wallet.publicKey,
        (stage) => setTxStage(stage)
      );
      showToast({
        title: 'Tarea iniciada (Demostración)',
        description: `"${result.data.title}" pasó a En progreso.`,
        variant: 'success',
      });
      onTaskUpdated(result.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo iniciar la tarea.';
      setTxStage('error');
      setTxError(message);
    } finally {
      setIsOperating(false);
    }
  };

  const handleCompleteTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!wallet.connected || !wallet.publicKey) {
      setTxLabel('Completar tarea');
      setTxStage('error');
      setTxError('Conecta una wallet de demostración antes de completar esta tarea.');
      showToast({
        title: 'Wallet requerida',
        description: 'Conecta una wallet de demostración para completar la tarea.',
        variant: 'warning',
      });
      return;
    }

    const urlValidation = validateEvidenceUrl(evidenceUrl);
    if (urlValidation) {
      setEvidenceError(urlValidation);
      return;
    }

    setEvidenceError(null);
    setTxLabel('Completando tarea (En progreso → Completada)');
    setTxError(null);
    setIsOperating(true);

    try {
      const result = await repository.completeTask(
        { taskPublicKey: task.publicKey, evidenceUrl },
        wallet.publicKey,
        (stage) => setTxStage(stage)
      );
      showToast({
        title: 'Tarea completada con evidencia (Demostración)',
        description: `"${result.data.title}" quedó registrada como Completada.`,
        variant: 'success',
      });
      onTaskUpdated(result.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo completar la tarea.';
      setTxStage('error');
      setTxError(message);
    } finally {
      setIsOperating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div
        className="fixed inset-0 bg-[#050814]/80 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isOperating) onClose();
        }}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex h-full w-full max-w-full flex-col border-l border-white/10 bg-[#151E31] shadow-2xl shadow-black/80 sm:max-w-lg">
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
              <span className="font-mono tabular-nums font-medium text-[#F8FAFC]">
                Tarea #{task.taskId}
              </span>
              <span aria-hidden="true">·</span>
              <TaskStatusLabel status={task.status} />
            </div>
            <h2 className="mt-1.5 font-display text-lg font-semibold leading-snug text-[#F8FAFC]">
              {task.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isOperating}
            aria-label="Cerrar panel de detalles"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/[0.06] hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
          {/* Lifecycle Stepper */}
          <section aria-label="Progreso del ciclo de vida">
            <div className="grid grid-cols-4 gap-2">
              {WORKFLOW_STEPS.map((step, index) => {
                const isDone = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.key} className="space-y-1.5">
                    <div
                      className={`h-1.5 w-full rounded-full ${
                        isDone
                          ? 'bg-[#14F195]'
                          : isCurrent
                            ? step.key === 'Completed'
                              ? 'bg-[#14F195]'
                              : 'bg-[#9945FF]'
                            : 'bg-white/10'
                      }`}
                    />
                    <span
                      className={`block truncate text-[11px] font-medium ${
                        isDone
                          ? 'text-[#14F195]'
                          : isCurrent
                            ? 'text-[#F8FAFC]'
                            : 'text-[#94A3B8]/65'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border-t border-white/[0.07] pt-5">
            <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">Descripción</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#F8FAFC]">{task.description}</p>
          </section>

          <section className="space-y-3 border-t border-white/[0.07] pt-5">
            <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
              Metadatos de cuenta
            </h3>

            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-[#94A3B8]">Identificador local</dt>
                <dd className="flex items-center justify-end gap-2 text-right">
                  <span className="font-mono text-xs text-[#F8FAFC] break-all">
                    {task.publicKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyId()}
                    aria-label="Copiar identificador"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#94A3B8] transition-colors hover:bg-white/[0.05] hover:text-[#F8FAFC]"
                  >
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 text-[#14F195]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-[#94A3B8]">Dirección PDA</dt>
                <dd className="font-mono text-xs text-right text-[#F8FAFC]">
                  {task.pdaAddress ? (
                    <span className="break-all">{task.pdaAddress}</span>
                  ) : (
                    <span className="text-[#94A3B8]">Pendiente de despliegue</span>
                  )}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#94A3B8]">Creada</dt>
                <dd className="font-mono text-xs tabular-nums text-[#F8FAFC]">
                  {formatSpanishDateTime(task.createdAt)}
                </dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="text-[#94A3B8]">Última actualización</dt>
                <dd className="font-mono text-xs tabular-nums text-[#F8FAFC]">
                  {formatSpanishDateTime(task.updatedAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-2.5 border-t border-white/[0.07] pt-5">
            <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
              Referencia de evidencia
            </h3>

            {task.evidenceUrl ? (
              <a
                href={task.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#14F195]/30 bg-[#14F195]/[0.06] p-3.5 text-sm text-[#14F195] transition-colors hover:bg-[#14F195]/10"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate font-mono text-xs">{task.evidenceUrl}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-sm text-[#94A3B8]">
                Sin evidencia registrada. Se requerirá una URL HTTPS al completar la tarea.
              </p>
            )}
          </section>

          {/* Workflow Actions */}
          <section className="space-y-4 border-t border-white/[0.07] pt-5">
            <h3 className="text-xs font-semibold tracking-wide text-[#94A3B8]">
              Operación disponible
            </h3>

            {!wallet.connected && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-100">
                <span>Conecta una wallet de demostración para ejecutar transiciones.</span>
                <button
                  type="button"
                  onClick={openConnectModal}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#9945FF] px-3 font-semibold text-[#F8FAFC] transition-colors hover:bg-[#8533EE]"
                >
                  <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Conectar wallet</span>
                </button>
              </div>
            )}

            {task.status === 'Pending' && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-[#94A3B8]">
                  Inicia esta tarea para trasladarla a{' '}
                  <strong className="text-[#F8FAFC]">En progreso</strong>.
                </p>
                <button
                  type="button"
                  onClick={handleStartTask}
                  disabled={isOperating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-50"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>{isOperating ? 'Iniciando tarea...' : 'Iniciar tarea'}</span>
                </button>
              </div>
            )}

            {task.status === 'InProgress' && (
              <form onSubmit={handleCompleteTask} className="space-y-3.5" noValidate>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="evidence-url-input"
                      className="text-sm font-medium text-[#F8FAFC]"
                    >
                      URL HTTPS de evidencia
                    </label>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        evidenceBytes > BYTE_LIMITS.EVIDENCE_URL
                          ? 'text-rose-400'
                          : evidenceBytes > BYTE_LIMITS.EVIDENCE_URL * 0.85
                            ? 'text-amber-300'
                            : 'text-[#94A3B8]'
                      }`}
                    >
                      {evidenceBytes} / {BYTE_LIMITS.EVIDENCE_URL} bytes
                    </span>
                  </div>
                  <input
                    id="evidence-url-input"
                    type="url"
                    value={evidenceUrl}
                    disabled={isOperating}
                    onChange={(e) => {
                      setEvidenceUrl(e.target.value);
                      if (evidenceError) {
                        setEvidenceError(validateEvidenceUrl(e.target.value));
                      }
                    }}
                    placeholder="https://github.com/organizacion/repo/pull/42"
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#14F195] focus:outline-none focus:ring-2 focus:ring-[#14F195]/25 disabled:opacity-50"
                  />
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full transition-all duration-150 ${
                        evidenceBytes > BYTE_LIMITS.EVIDENCE_URL
                          ? 'bg-rose-500'
                          : evidenceBytes > BYTE_LIMITS.EVIDENCE_URL * 0.85
                            ? 'bg-amber-400'
                            : 'bg-[#14F195]'
                      }`}
                      style={{ width: `${evidencePct}%` }}
                    />
                  </div>
                  {evidenceError && (
                    <p className="mt-1.5 text-xs text-rose-400">{evidenceError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isOperating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#14F195] px-4 text-sm font-semibold text-[#0B1020] transition-colors hover:bg-[#10D884] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14F195] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>{isOperating ? 'Completando...' : 'Completar tarea'}</span>
                </button>
              </form>
            )}

            {task.status === 'Completed' && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-[#94A3B8]">
                  La tarea cuenta con evidencia verificable. Puedes cerrar esta cuenta de tarea
                  para concluir su ciclo activo.
                </p>
                <button
                  type="button"
                  onClick={() => onRequestCloseTask(task)}
                  disabled={isOperating}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  <span>Cerrar tarea completada</span>
                </button>
              </div>
            )}

            <TransactionStatus
              stage={txStage}
              operationLabel={txLabel}
              errorMessage={txError}
              isSimulated
            />
          </section>
        </div>
      </aside>
    </div>
  );
}
