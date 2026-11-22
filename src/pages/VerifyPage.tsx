import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Globe,
  Info,
  Loader2,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useRepositoryConfig, useTaskRepository } from '@/src/context/RepositoryContext';
import type { VerificationCheckResult } from '@/src/types/prooftask';
import { formatSpanishDateTime, isValidBase58PubkeyFormat } from '@/src/utils/bytes';

const PENDING_PROGRAM_LABEL = 'Pendiente de despliegue';

export function VerifyPage() {
  const repository = useTaskRepository();
  const { programId: configProgramId, setProgramId: saveProgramId } = useRepositoryConfig();

  const [programId, setProgramId] = useState(
    configProgramId !== 'PTask11111111111111111111111111111111111111'
      ? configProgramId
      : PENDING_PROGRAM_LABEL
  );
  const [signature, setSignature] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<VerificationCheckResult | null>(null);

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setIsChecking(true);
    try {
      if (isValidBase58PubkeyFormat(programId)) {
        saveProgramId(programId);
      }
      const checkResult = await repository.verifyTransaction(programId, signature);
      setResult(checkResult);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="border-b border-white/[0.08] pb-6">
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#94A3B8]">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#14F195]">
            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Solana Devnet</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Modo demostración</span>
          <span aria-hidden="true">·</span>
          <span>Programa Anchor pendiente de despliegue</span>
        </div>

        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
          Verificar operación en Solana
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#94A3B8]">
          Consulta la validez de una firma de transacción asociada al programa ProofTask en Solana
          Devnet. Durante esta etapa inicial no se generan firmas simuladas ni direcciones falsas.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Verification Form & Result */}
        <section className="space-y-6 lg:col-span-7">
          <form
            onSubmit={handleVerify}
            className="space-y-5 rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-6"
            noValidate
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="verify-program-id" className="text-sm font-medium text-[#F8FAFC]">
                  Program ID (Solana Devnet)
                </label>
                {programId !== PENDING_PROGRAM_LABEL && (
                  <button
                    type="button"
                    onClick={() => setProgramId(PENDING_PROGRAM_LABEL)}
                    className="text-xs font-medium text-[#C084FC] transition-colors hover:text-[#14F195]"
                  >
                    Restablecer estado
                  </button>
                )}
              </div>
              <input
                id="verify-program-id"
                type="text"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30"
              />
              <p className="mt-1.5 text-xs text-[#94A3B8]">
                Estado actual del contrato oficial:{' '}
                <strong className="text-[#F8FAFC]">Pendiente de despliegue</strong>.
              </p>
            </div>

            <div>
              <label htmlFor="verify-signature" className="text-sm font-medium text-[#F8FAFC]">
                Firma de transacción (Signature Base58)
              </label>
              <textarea
                id="verify-signature"
                rows={3}
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Pega aquí una firma real de Solana Devnet (86-88 caracteres Base58) cuando exista."
                className="mt-1.5 w-full resize-none rounded-lg border border-white/10 bg-[#0B1020] px-3.5 py-2.5 font-mono text-xs text-[#F8FAFC] placeholder:text-[#94A3B8]/60 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30"
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-[#94A3B8]">
                Validación local de formato · Sin consultas RPC activas hasta el despliegue
              </span>
              <button
                type="submit"
                disabled={isChecking}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9945FF] px-5 text-sm font-semibold text-[#F8FAFC] whitespace-nowrap shadow-lg shadow-[#9945FF]/20 transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-50 sm:w-auto"
              >
                {isChecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
                <span>{isChecking ? 'Verificando...' : 'Verificar'}</span>
              </button>
            </div>
          </form>

          {/* Result Area */}
          <div
            aria-live="polite"
            className="rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-6"
          >
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Resultado de verificación
            </h2>

            {isChecking ? (
              <div className="mt-4 flex items-center gap-3 text-sm text-[#94A3B8]">
                <Loader2 className="h-4 w-4 animate-spin text-[#9945FF]" aria-hidden="true" />
                <span>Analizando formato y estado del programa en Devnet...</span>
              </div>
            ) : !result ? (
              <div className="mt-4 flex items-start gap-3 text-sm text-[#94A3B8]">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#C084FC]" aria-hidden="true" />
                <p>
                  Introduce una firma de transacción y pulsa{' '}
                  <strong className="text-[#F8FAFC]">Verificar</strong> para comprobar su formato y
                  estado de verificación.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] pb-3">
                  <div className="flex items-center gap-2">
                    {result.status === 'verified' ? (
                      <CheckCircle2 className="h-5 w-5 text-[#14F195]" aria-hidden="true" />
                    ) : result.status === 'pending_deployment' ? (
                      <Info className="h-5 w-5 text-[#C084FC]" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-rose-400" aria-hidden="true" />
                    )}
                    <span className="text-sm font-semibold text-[#F8FAFC]">
                      {result.status === 'verified'
                        ? 'Verificada en Solana Devnet'
                        : result.status === 'pending_deployment'
                          ? 'Programa pendiente de despliegue (Demostración)'
                          : 'Entrada inválida o incompleta'}
                    </span>
                  </div>

                  <span className="font-mono text-xs tabular-nums text-[#94A3B8]">
                    {formatSpanishDateTime(result.checkedAt)}
                  </span>
                </div>

                <p className="text-sm text-[#F8FAFC]">{result.summary}</p>

                <ul className="space-y-1.5 text-xs leading-relaxed text-[#94A3B8]">
                  {result.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#94A3B8]" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>

                {result.explorerUrl && (
                  <div className="pt-2">
                    <a
                      href={result.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#14F195]/35 bg-[#14F195]/10 px-4 text-sm font-semibold text-[#14F195] transition-colors hover:bg-[#14F195]/15 sm:w-auto"
                    >
                      <span>Abrir firma en Solana Explorer (Devnet)</span>
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Informational Panel on Operation Verifiability */}
        <aside className="space-y-5 rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:p-6 lg:col-span-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#14F195]/30 bg-[#14F195]/10 text-[#14F195]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Cómo funciona la verificabilidad
            </h2>
          </div>

          <p className="text-sm leading-relaxed text-[#94A3B8]">
            Cuando ProofTask se conecte al programa Rust y Anchor en Solana Devnet, cada transición
            de estado quedará respaldada por una transacción firmada e inmutable.
          </p>

          <div className="space-y-4 border-t border-white/[0.07] pt-4 text-sm">
            <div>
              <h3 className="flex items-center gap-2 font-medium text-[#F8FAFC]">
                <FileCheck2 className="h-4 w-4 text-[#C084FC]" aria-hidden="true" />
                <span>Cuentas PDA deterministas</span>
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                Cada proyecto y cada tarea se derivan mediante direcciones PDA vinculadas a la
                autoridad del creador, garantizando unicidad y control de acceso en cadena.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-[#F8FAFC]">Transiciones auditables</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                Las instrucciones <span className="font-mono text-[#F8FAFC]">start_task</span>,{' '}
                <span className="font-mono text-[#F8FAFC]">complete_task</span> y{' '}
                <span className="font-mono text-[#F8FAFC]">close_task</span> validan el orden
                estricto de estados e impiden saltos indebidos.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-[#F8FAFC]">Evidencia HTTPS vinculada</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#94A3B8]">
                Al completar una tarea se exige una URL HTTPS de máximo 160 bytes UTF-8 (como un
                commit, PR o informe firmado) que permanece asociada al registro.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
