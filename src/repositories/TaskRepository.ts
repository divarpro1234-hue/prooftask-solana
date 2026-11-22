import type {
  CompleteTaskInput,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  RepositoryOperationResult,
  SolanaAddress,
  Task,
  TransactionStage,
  VerificationCheckResult,
} from '@/src/types/prooftask';

export type StageChangeCallback = (stage: TransactionStage) => void;

/**
 * Contrato de acceso a datos para ProofTask.
 * Mantiene la interfaz visual desacoplada de la implementación concreta
 * (MockTaskRepository en fase de prototipo o SolanaTaskRepository con Anchor).
 */
export interface TaskRepository {
  readonly modeLabel: string;
  readonly isDemo: boolean;
  readonly network: 'devnet';
  readonly programId: SolanaAddress | null;

  getProjects(): Promise<Project[]>;
  getProjectById(projectPublicKey: SolanaAddress): Promise<Project | null>;
  getTasks(projectPublicKey?: SolanaAddress): Promise<Task[]>;

  createProject(
    input: CreateProjectInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Project>>;

  closeProject(
    projectPublicKey: SolanaAddress,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<void>>;

  createTask(
    input: CreateTaskInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>>;

  startTask(
    taskPublicKey: SolanaAddress,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>>;

  completeTask(
    input: CompleteTaskInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>>;

  closeTask(
    taskPublicKey: SolanaAddress,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<void>>;

  verifyTransaction(
    programId: string,
    signature: string
  ): Promise<VerificationCheckResult>;
}
