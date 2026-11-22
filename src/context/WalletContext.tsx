import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {
  WalletProviderId,
  WalletProviderOption,
  WalletState,
} from '@/src/types/prooftask';

const WALLET_STORAGE_KEY = 'prooftask_wallet_session_v2';

const DEMO_WALLET_PROVIDERS: WalletProviderOption[] = [
  {
    id: 'phantom',
    name: 'Phantom',
    description: 'Billetera Solana para navegador y móviles (Devnet)',
    address: 'DemoWallet7kQ9xLm3nP8rT2vW5yZ1aB4cD6eF9jK2',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    description: 'Billetera web3 compatible con transacciones Anchor en Devnet',
    address: 'DemoSolflr4mN7pQ2sT8vX1zA5cE9gH3jL6nP8rU4',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    description: 'Billetera orientada a estándares abiertos y xNFTs',
    address: 'DemoBackpk9wR3tY6uI2oP5aS8dF1gH4jK7lZ3xC6',
  },
];

interface WalletContextValue {
  wallet: WalletState;
  availableProviders: WalletProviderOption[];
  isModalOpen: boolean;
  openConnectModal: () => void;
  closeConnectModal: () => void;
  connectWallet: (providerId: WalletProviderId) => Promise<void>;
  disconnectWallet: () => void;
}

const DISCONNECTED_STATE: WalletState = {
  connected: false,
  connecting: false,
  providerId: null,
  providerName: null,
  publicKey: null,
  network: 'devnet',
  isDemo: true,
};

const WalletContext = createContext<WalletContextValue | null>(null);

function getInjectedProvider(id: WalletProviderId): any {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  if (id === 'phantom') {
    return win.phantom?.solana || (win.solana?.isPhantom ? win.solana : null);
  }
  if (id === 'solflare') {
    return win.solflare;
  }
  if (id === 'backpack') {
    return win.backpack;
  }
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(() => {
    try {
      const saved = sessionStorage.getItem(WALLET_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as WalletState;
        return parsed;
      }
    } catch {
      // Ignore
    }
    return DISCONNECTED_STATE;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const openConnectModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeConnectModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const connectWallet = useCallback(async (providerId: WalletProviderId) => {
    const providerConfig = DEMO_WALLET_PROVIDERS.find((p) => p.id === providerId);
    if (!providerConfig) return;

    setWallet((prev) => ({ ...prev, connecting: true }));

    const injected = getInjectedProvider(providerId);

    if (injected) {
      try {
        const res = await injected.connect();
        const pubkey =
          res?.publicKey?.toString() || injected.publicKey?.toString();

        if (pubkey) {
          const realState: WalletState = {
            connected: true,
            connecting: false,
            providerId,
            providerName: providerConfig.name,
            publicKey: pubkey,
            network: 'devnet',
            isDemo: false,
          };
          setWallet(realState);
          sessionStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(realState));
          setIsModalOpen(false);
          return;
        }
      } catch (err: any) {
        setWallet((prev) => ({ ...prev, connecting: false }));
        throw new Error(
          err?.message || 'El usuario rechazó la conexión con la wallet.'
        );
      }
    }

    // Si la extensión no está instalada en el navegador, fallback transparente a demo
    await new Promise((resolve) => setTimeout(resolve, 300));
    const demoState: WalletState = {
      connected: true,
      connecting: false,
      providerId: providerConfig.id,
      providerName: providerConfig.name,
      publicKey: providerConfig.address,
      network: 'devnet',
      isDemo: true,
    };

    setWallet(demoState);
    sessionStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(demoState));
    setIsModalOpen(false);
  }, []);

  const disconnectWallet = useCallback(() => {
    const injected = wallet.providerId ? getInjectedProvider(wallet.providerId) : null;
    if (injected?.disconnect) {
      try {
        injected.disconnect();
      } catch {
        // Ignore
      }
    }
    setWallet(DISCONNECTED_STATE);
    try {
      sessionStorage.removeItem(WALLET_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, [wallet.providerId]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  // Manejar desconexiones emitidas por la extensión
  useEffect(() => {
    if (!wallet.connected || wallet.isDemo || !wallet.providerId) return;

    const injected = getInjectedProvider(wallet.providerId);
    if (!injected) return;

    const handleAccountChanged = (newPubkey: any) => {
      if (!newPubkey) {
        disconnectWallet();
      } else {
        setWallet((prev) => ({
          ...prev,
          publicKey: newPubkey.toString(),
        }));
      }
    };

    injected.on?.('disconnect', disconnectWallet);
    injected.on?.('accountChanged', handleAccountChanged);

    return () => {
      injected.off?.('disconnect', disconnectWallet);
      injected.off?.('accountChanged', handleAccountChanged);
    };
  }, [wallet.connected, wallet.isDemo, wallet.providerId, disconnectWallet]);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        availableProviders: DEMO_WALLET_PROVIDERS,
        isModalOpen,
        openConnectModal,
        closeConnectModal,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet debe utilizarse dentro de WalletProvider.');
  }
  return ctx;
}
