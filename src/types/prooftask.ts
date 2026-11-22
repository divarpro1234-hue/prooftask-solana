/**
 * Representa una dirección pública o dirección PDA en Solana (codificación Base58 en producción).
 * En modo demostración almacena identificadores locales claramente diferenciados.
 */
export type SolanaAddress = string;

/**
 * Representa una firma de transacción Base58 en Solana Devnet.
 */
export type TransactionSignature = string;

export type TaskStatus = 'Pending' | 'InProgress' | 'Completed';

/**
 * Semillas deterministas para derivar la cuenta PDA de un proyecto en Anchor:
 * seeds = [b"project", authority.key().as_ref(), &project_id.to_le_bytes()]
 */
export interface ProjectPdaSeeds {
  authority: SolanaAddress;
  projectId: number;
}

/**
 * Semillas deterministas para derivar la cuenta PDA de una tarea en Anchor:
 * seeds = [b"task", project_public_key.key().as_ref(), &task_id.to_le_bytes()]
 */
export interface TaskPdaSeeds {
  projectPublicKey: SolanaAddress;
  taskId: number;
}

export interface Project {
  publicKey: SolanaAddress;
  authority: SolanaAddress;
  projectId: number;
  name: string;
  description: string;
  nextTaskId: number;
  activeTasks: number;
  createdAt: number;
  /** En modo demostración, indica si la cuenta existe solo localmente */
  isSimulated?: boolean;
  /** Dirección PDA on-chain cuando el programa Solana esté desplegado */
  pdaAddress?: SolanaAddress | null;
}

export interface Task {
  publicKey: SolanaAddress;
  projectPublicKey: SolanaAddress;
  taskId: number;
  title: string;
  description: string;
  status: TaskStatus;
  evidenceUrl: string | null;
  createdAt: number;
  updatedAt: number;
  /** En modo demostración, indica si la cuenta existe solo localmente */
  isSimulated?: boolean;
  /** Dirección PDA on-chain cuando el programa Solana esté desplegado */
  pdaAddress?: SolanaAddress | null;
}

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface CreateTaskInput {
  projectPublicKey: SolanaAddress;
  title: string;
  description: string;
}

export interface CompleteTaskInput {
  taskPublicKey: SolanaAddress;
  evidenceUrl: string;
}

export type TransactionStage =
  | 'idle'
  | 'preparing'
  | 'awaiting_signature'
  | 'submitting'
  | 'confirming'
  | 'success'
  | 'error';

export interface TransactionStatusInfo {
  stage: TransactionStage;
  operationLabel: string;
  errorMessage?: string | null;
  isSimulated: boolean;
}

export interface RepositoryOperationResult<T> {
  data: T;
  isSimulated: boolean;
  note: string;
  signature?: TransactionSignature | null;
}

export type VerificationStatus =
  | 'idle'
  | 'checking'
  | 'pending_deployment'
  | 'verified'
  | 'not_found'
  | 'invalid_input'
  | 'error';

export interface VerificationCheckResult {
  status: VerificationStatus;
  programId: SolanaAddress | null;
  signature: TransactionSignature;
  isValidSignatureFormat: boolean;
  isSimulated: boolean;
  summary: string;
  details: string[];
  explorerUrl: string | null;
  checkedAt: number;
}

export type WalletProviderId = 'phantom' | 'solflare' | 'backpack';

export interface WalletProviderOption {
  id: WalletProviderId;
  name: string;
  description: string;
  address: SolanaAddress;
}

export interface WalletState {
  connected: boolean;
  connecting: boolean;
  providerId: WalletProviderId | null;
  providerName: string | null;
  publicKey: SolanaAddress | null;
  network: 'devnet';
  isDemo: boolean;
}

export interface SolanaProgramConfig {
  network: 'devnet';
  rpcEndpoint: string;
  programId: SolanaAddress | null;
}
