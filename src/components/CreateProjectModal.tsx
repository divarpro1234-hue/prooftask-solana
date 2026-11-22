import { useEffect, useState, type FormEvent } from 'react';
import { Wallet } from 'lucide-react';
import { useTaskRepository } from '@/src/context/RepositoryContext';
import { useToast } from '@/src/context/ToastContext';
import { useWallet } from '@/src/context/WalletContext';
import type { Project, TransactionStage } from '@/src/types/prooftask';
import {
  BYTE_LIMITS,
  getUtf8ByteLength,
  validateProjectDescription,
  validateProjectName,
} from '@/src/utils/bytes';
import { Modal } from './Modal';
import { TransactionStatus } from './TransactionStatus';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectModal({ isOpen, onClose, onCreated }: CreateProjectModalProps) {
  const repository = useTaskRepository();
  const { wallet, openConnectModal } = useWallet();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string | null; description?: string | null }>({});
  const [txStage, setTxStage] = useState<TransactionStage>('idle');
  const [txError, setTxError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setErrors({});
      setTxStage('idle');
      setTxError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const nameBytes = getUtf8ByteLength(name.trim());
  const descBytes = getUtf8ByteLength(description.trim());
  const namePct = Math.min(100, (nameBytes / BYTE_LIMITS.PROJECT_NAME) * 100);
  const descPct = Math.min(100, (descBytes / BYTE_LIMITS.PROJECT_DESCRIPTION) * 100);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!wallet.connected || !wallet.publicKey) {
      setTxStage('error');
      setTxError('Conecta una wallet de demostración antes de crear un proyecto.');
      showToast({
        title: 'Wallet requerida',
        description: 'Conecta una wallet en modo demostración para continuar.',
        variant: 'warning',
      });
      return;
    }

    const nameError = validateProjectName(name);
    const descError = validateProjectDescription(description);
    if (nameError || descError) {
      setErrors({ name: nameError, description: descError });
      return;
    }

    setErrors({});
    setTxError(null);
    setIsSubmitting(true);

    try {
      const result = await repository.createProject(
        { name, description },
        wallet.publicKey,
        (stage) => setTxStage(stage)
      );
      showToast({
        title: 'Proyecto creado (Demostración)',
        description: `"${result.data.name}" listo para gestionar tareas.`,
        variant: 'success',
      });
      onCreated(result.data);
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error inesperado al crear el proyecto.';
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
      title="Crear nuevo proyecto"
      description="Define el nombre y alcance del proyecto respetando los límites de almacenamiento en bytes UTF-8."
      disableClose={isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {!wallet.connected && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3.5 text-xs text-amber-100">
            <span>Conecta una wallet en modo demostración para firmar la creación.</span>
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
            <label htmlFor="project-name" className="text-sm font-medium text-[#F8FAFC]">
              Nombre del proyecto
            </label>
            <span
              className={`font-mono text-xs tabular-nums ${
                nameBytes > BYTE_LIMITS.PROJECT_NAME
                  ? 'text-rose-400'
                  : nameBytes > BYTE_LIMITS.PROJECT_NAME * 0.85
                    ? 'text-amber-300'
                    : 'text-[#94A3B8]'
              }`}
            >
              {nameBytes} / {BYTE_LIMITS.PROJECT_NAME} bytes
            </span>
          </div>
          <input
            id="project-name"
            type="text"
            value={name}
            disabled={isSubmitting}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: validateProjectName(e.target.value) }));
              }
            }}
            placeholder="Ej. Auditoría de contratos Solana"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30 disabled:opacity-50"
          />
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full transition-all duration-150 ${
                nameBytes > BYTE_LIMITS.PROJECT_NAME
                  ? 'bg-rose-500'
                  : nameBytes > BYTE_LIMITS.PROJECT_NAME * 0.85
                    ? 'bg-amber-400'
                    : 'bg-[#9945FF]'
              }`}
              style={{ width: `${namePct}%` }}
            />
          </div>
          {errors.name && <p className="mt-1.5 text-xs text-rose-400">{errors.name}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="project-desc" className="text-sm font-medium text-[#F8FAFC]">
              Descripción
            </label>
            <span
              className={`font-mono text-xs tabular-nums ${
                descBytes > BYTE_LIMITS.PROJECT_DESCRIPTION
                  ? 'text-rose-400'
                  : descBytes > BYTE_LIMITS.PROJECT_DESCRIPTION * 0.85
                    ? 'text-amber-300'
                    : 'text-[#94A3B8]'
              }`}
            >
              {descBytes} / {BYTE_LIMITS.PROJECT_DESCRIPTION} bytes
            </span>
          </div>
          <textarea
            id="project-desc"
            rows={3}
            value={description}
            disabled={isSubmitting}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) {
                setErrors((prev) => ({
                  ...prev,
                  description: validateProjectDescription(e.target.value),
                }));
              }
            }}
            placeholder="Describe el objetivo y los entregables verificables del proyecto."
            className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30 disabled:opacity-50"
          />
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full transition-all duration-150 ${
                descBytes > BYTE_LIMITS.PROJECT_DESCRIPTION
                  ? 'bg-rose-500'
                  : descBytes > BYTE_LIMITS.PROJECT_DESCRIPTION * 0.85
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
          operationLabel="Creando cuenta de proyecto"
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
            {isSubmitting ? 'Creando...' : 'Crear proyecto'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
