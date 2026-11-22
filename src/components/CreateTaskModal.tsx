import { useEffect, useState, type FormEvent } from 'react';
import { Wallet } from 'lucide-react';
import { useTaskRepository } from '@/src/context/RepositoryContext';
import { useToast } from '@/src/context/ToastContext';
import { useWallet } from '@/src/context/WalletContext';
import type { Task, TransactionStage } from '@/src/types/prooftask';
import {
  BYTE_LIMITS,
  getUtf8ByteLength,
  validateTaskDescription,
  validateTaskTitle,
} from '@/src/utils/bytes';
import { Modal } from './Modal';
import { TransactionStatus } from './TransactionStatus';

interface CreateTaskModalProps {
  isOpen: boolean;
  projectPublicKey: string;
  projectName: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}

export function CreateTaskModal({
  isOpen,
  projectPublicKey,
  projectName,
  onClose,
  onCreated,
}: CreateTaskModalProps) {
  const repository = useTaskRepository();
  const { wallet, openConnectModal } = useWallet();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string | null; description?: string | null }>({});
  const [txStage, setTxStage] = useState<TransactionStage>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setErrors({});
      setTxStage('idle');
      setTxError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const titleBytes = getUtf8ByteLength(title.trim());
  const descBytes = getUtf8ByteLength(description.trim());
  const titlePct = Math.min(100, (titleBytes / BYTE_LIMITS.TASK_TITLE) * 100);
  const descPct = Math.min(100, (descBytes / BYTE_LIMITS.TASK_DESCRIPTION) * 100);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!wallet.connected || !wallet.publicKey) {
      setTxStage('error');
      setTxError('Conecta una wallet de demostración antes de crear una tarea.');
      showToast({
        title: 'Wallet requerida',
        description: 'Conecta una wallet en modo demostración para crear tareas.',
        variant: 'warning',
      });
      return;
    }

    const titleError = validateTaskTitle(title);
    const descError = validateTaskDescription(description);
    if (titleError || descError) {
      setErrors({ title: titleError, description: descError });
      return;
    }

    setErrors({});
    setTxError(null);
    setIsSubmitting(true);

    try {
      const result = await repository.createTask(
        { projectPublicKey, title, description },
        wallet.publicKey,
        (stage) => setTxStage(stage)
      );
      showToast({
        title: 'Tarea creada (Demostración)',
        description: `Añadida a "${projectName}" en estado Pendiente.`,
        variant: 'success',
      });
      onCreated(result.data);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo crear la tarea.';
      setTxStage('error');
      setTxError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva tarea"
      description={`Se registrará en estado Pendiente dentro de "${projectName}".`}
      disableClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!wallet.connected && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-100">
            <span>Conecta una wallet de demostración para crear la tarea.</span>
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

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="task-title" className="text-sm font-medium text-[#F8FAFC]">
              Título de la tarea
            </label>
            <span
              className={`font-mono text-xs tabular-nums ${
                titleBytes > BYTE_LIMITS.TASK_TITLE
                  ? 'text-rose-400'
                  : titleBytes > BYTE_LIMITS.TASK_TITLE * 0.85
                    ? 'text-amber-300'
                    : 'text-[#94A3B8]'
              }`}
            >
              {titleBytes} / {BYTE_LIMITS.TASK_TITLE} bytes
            </span>
          </div>
          <input
            id="task-title"
            type="text"
            value={title}
            disabled={isSubmitting}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) {
                setErrors((prev) => ({ ...prev, title: validateTaskTitle(e.target.value) }));
              }
            }}
            placeholder="Ej. Implementar instrucción complete_task"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30 disabled:opacity-50"
          />
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full transition-all duration-150 ${
                titleBytes > BYTE_LIMITS.TASK_TITLE
                  ? 'bg-rose-500'
                  : titleBytes > BYTE_LIMITS.TASK_TITLE * 0.85
                    ? 'bg-amber-400'
                    : 'bg-[#9945FF]'
              }`}
              style={{ width: `${titlePct}%` }}
            />
          </div>
          {errors.title && <p className="mt-1.5 text-xs text-rose-400">{errors.title}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="task-description" className="text-sm font-medium text-[#F8FAFC]">
              Descripción
            </label>
            <span
              className={`font-mono text-xs tabular-nums ${
                descBytes > BYTE_LIMITS.TASK_DESCRIPTION
                  ? 'text-rose-400'
                  : descBytes > BYTE_LIMITS.TASK_DESCRIPTION * 0.85
                    ? 'text-amber-300'
                    : 'text-[#94A3B8]'
              }`}
            >
              {descBytes} / {BYTE_LIMITS.TASK_DESCRIPTION} bytes
            </span>
          </div>
          <textarea
            id="task-description"
            rows={4}
            value={description}
            disabled={isSubmitting}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => ({
                  ...prev,
                  description: validateTaskDescription(e.target.value),
                }));
              }
            }}
            placeholder="Detalla los criterios de aceptación y qué evidencia se requerirá al completar."
            className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30 disabled:opacity-50"
          />
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full transition-all duration-150 ${
                descBytes > BYTE_LIMITS.TASK_DESCRIPTION
                  ? 'bg-rose-500'
                  : descBytes > BYTE_LIMITS.TASK_DESCRIPTION * 0.85
                    ? 'bg-amber-400'
                    : 'bg-[#9945FF]'
              }`}
              style={{ width: `${descPct}%` }}
            />
          </div>
          {errors.description && (
            <p className="mt-1.5 text-xs text-rose-400">{errors.description}</p>
          )}
        </div>

        <TransactionStatus
          stage={txStage}
          operationLabel="Creando cuenta de tarea"
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 w-full rounded-lg bg-[#9945FF] px-5 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting ? 'Creando...' : 'Crear tarea'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
