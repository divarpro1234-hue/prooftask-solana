import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createTaskRepository, SolanaTaskRepository, type TaskRepository } from '@/src/repositories';
import type { SolanaAddress } from '@/src/types/prooftask';
import { useWallet } from './WalletContext';

export type RepositoryMode = 'mock' | 'solana';

const REPO_MODE_KEY = 'prooftask_repository_mode_v1';
const PROGRAM_ID_KEY = 'prooftask_program_id_v1';
const DEFAULT_PROGRAM_ID =
  (import.meta as any).env?.VITE_PROGRAM_ID || 'PTask11111111111111111111111111111111111111';

interface RepositoryContextValue {
  repository: TaskRepository;
  mode: RepositoryMode;
  programId: SolanaAddress;
  setMode: (mode: RepositoryMode) => void;
  setProgramId: (programId: SolanaAddress) => void;
}

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<RepositoryMode>(() => {
    const saved = localStorage.getItem(REPO_MODE_KEY);
    return saved === 'mock' ? 'mock' : 'solana';
  });

  const [programId, setProgramIdState] = useState<SolanaAddress>(() => {
    return localStorage.getItem(PROGRAM_ID_KEY) || DEFAULT_PROGRAM_ID;
  });

  const setMode = useCallback((nextMode: RepositoryMode) => {
    setModeState(nextMode);
    localStorage.setItem(REPO_MODE_KEY, nextMode);
  }, []);

  const setProgramId = useCallback((nextId: SolanaAddress) => {
    setProgramIdState(nextId);
    localStorage.setItem(PROGRAM_ID_KEY, nextId);
  }, []);

  const repository = useMemo<TaskRepository>(() => {
    return createTaskRepository(mode, {
      programId: mode === 'solana' ? programId : null,
      rpcEndpoint: 'https://api.devnet.solana.com',
    });
  }, [mode, programId]);

  return (
    <RepositoryContext.Provider
      value={{
        repository,
        mode,
        programId,
        setMode,
        setProgramId,
      }}
    >
      <RepositorySignerSync repository={repository} />
      {children}
    </RepositoryContext.Provider>
  );
}

/**
 * Componente interno que sincroniza el signer de la wallet activa con SolanaTaskRepository
 */
function RepositorySignerSync({ repository }: { repository: TaskRepository }) {
  const { wallet } = useWallet();

  useEffect(() => {
    if (repository instanceof SolanaTaskRepository) {
      if (wallet.connected && !wallet.isDemo && wallet.publicKey) {
        const win = typeof window !== 'undefined' ? (window as any) : null;
        const injected = win?.solana || win?.phantom?.solana || win?.solflare;
        if (injected) {
          repository.setSigner({
            publicKey: (injected as any).publicKey,
            signTransaction: (tx) => injected.signTransaction(tx),
            signAndSendTransaction: injected.signAndSendTransaction
              ? (tx) => injected.signAndSendTransaction(tx)
              : undefined,
          });
          return;
        }
      }
      repository.setSigner(null);
    }
  }, [repository, wallet]);

  return null;
}

export function useTaskRepository(): TaskRepository {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error('useTaskRepository debe utilizarse dentro de RepositoryProvider.');
  }
  return ctx.repository;
}

export function useRepositoryConfig(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error('useRepositoryConfig debe utilizarse dentro de RepositoryProvider.');
  }
  return ctx;
}
