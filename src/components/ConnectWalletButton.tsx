import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, LogOut, ShieldCheck, Wallet } from 'lucide-react';
import { useWallet } from '@/src/context/WalletContext';
import { useToast } from '@/src/context/ToastContext';
import { truncateAddress } from '@/src/utils/bytes';
import { Modal } from './Modal';

export function ConnectWalletButton() {
  const {
    wallet,
    availableProviders,
    isModalOpen,
    openConnectModal,
    closeConnectModal,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const { showToast } = useToast();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = async () => {
    if (!wallet.publicKey) return;
    try {
      await navigator.clipboard.writeText(wallet.publicKey);
      setCopied(true);
      showToast({
        title: wallet.isDemo ? 'Dirección de demostración copiada' : 'Dirección copiada',
        description: truncateAddress(wallet.publicKey, 8, 6),
        variant: 'info',
      });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast({
        title: 'No se pudo copiar la dirección',
        variant: 'error',
      });
    }
  };

  const handleDisconnect = () => {
    setMenuOpen(false);
    disconnectWallet();
    showToast({
      title: 'Wallet desconectada',
      description: wallet.isDemo
        ? 'Sesión de demostración finalizada.'
        : 'Sesión de wallet cerrada.',
      variant: 'info',
    });
  };

  return (
    <>
      {!wallet.connected ? (
        <button
          type="button"
          onClick={openConnectModal}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] whitespace-nowrap shrink-0 transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020]"
        >
          <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Conectar wallet</span>
        </button>
      ) : (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex h-10 items-center gap-2.5 rounded-lg border border-white/10 bg-[#151E31] px-3.5 text-sm font-medium text-[#F8FAFC] whitespace-nowrap shrink-0 transition-colors hover:border-[#9945FF]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
          >
            <Wallet className="h-4 w-4 text-[#14F195] shrink-0" aria-hidden="true" />
            <span className="font-mono text-xs tabular-nums">
              {truncateAddress(wallet.publicKey ?? '', 5, 4)}
            </span>
            {wallet.isDemo && (
              <span className="hidden text-xs text-[#94A3B8] sm:inline">· Demo</span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-[#94A3B8] transition-transform duration-150 ${
                menuOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-white/10 bg-[#151E31] p-4 shadow-2xl shadow-black/60"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07]">
                <div>
                  <p className="text-xs font-medium text-[#94A3B8]">
                    {wallet.providerName}
                    {wallet.isDemo ? ' · Modo demostración' : ''}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[#F8FAFC] tabular-nums">
                    {truncateAddress(wallet.publicKey ?? '', 8, 6)}
                  </p>
                </div>
                <span className="text-xs font-medium text-[#14F195]">Devnet</span>
              </div>

              {wallet.isDemo && (
                <p className="mt-3 text-xs leading-relaxed text-[#94A3B8]">
                  Wallet simulada para pruebas de interfaz. No realiza firmas criptográficas reales.
                </p>
              )}

              <div className="mt-3 flex flex-col gap-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleCopyAddress}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-[#F8FAFC] transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[#14F195]" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" />
                  )}
                  <span>{copied ? 'Dirección copiada' : 'Copiar dirección'}</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleDisconnect}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>Desconectar wallet</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeConnectModal}
        title="Conectar wallet en Solana Devnet"
        description="Selecciona un adaptador simulado para probar las operaciones de ProofTask."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-[#9945FF]/30 bg-[#9945FF]/10 p-3 text-xs leading-relaxed text-[#F8FAFC]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#9945FF]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Modo demostración activo</p>
              <p className="mt-0.5 text-[#94A3B8]">
                Esta conexión es simulada para validar flujos de diseño. ProofTask nunca solicita
                frases semilla, claves privadas ni contraseñas.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {availableProviders.map((provider) => (
              <button
                key={provider.id}
                type="button"
                disabled={wallet.connecting}
                onClick={async () => {
                  await connectWallet(provider.id);
                  showToast({
                    title: `${provider.name} conectado (Demostración)`,
                    description: `Red Solana Devnet · ${truncateAddress(provider.address)}`,
                    variant: 'success',
                  });
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0B1020]/70 p-3.5 text-left transition-colors hover:border-[#9945FF]/60 hover:bg-[#0B1020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] disabled:opacity-50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-[#F8FAFC]">
                      {provider.name}
                    </span>
                    <span className="text-xs text-[#94A3B8]">· Simulación</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#94A3B8]">
                    {provider.description}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-[#14F195]">Devnet</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
