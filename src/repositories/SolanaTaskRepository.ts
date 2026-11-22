import {
  Connection,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  ACCOUNT_DISCRIMINATORS,
  buildCloseProjectInstruction,
  buildCloseTaskInstruction,
  buildCompleteTaskInstruction,
  buildCreateProjectInstruction,
  buildCreateTaskInstruction,
  buildStartTaskInstruction,
  decodeProjectAccount,
  decodeTaskAccount,
  findProjectPda,
  findTaskPda,
  parseSolanaError,
} from '@/src/client/prooftaskClient';
import type {
  CompleteTaskInput,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  RepositoryOperationResult,
  SolanaAddress,
  SolanaProgramConfig,
  Task,
  VerificationCheckResult,
} from '@/src/types/prooftask';
import {
  isValidBase58PubkeyFormat,
  isValidBase58SignatureFormat,
  validateEvidenceUrl,
  validateProjectDescription,
  validateProjectName,
  validateTaskDescription,
  validateTaskTitle,
} from '@/src/utils/bytes';
import type { StageChangeCallback, TaskRepository } from './TaskRepository';

export interface WalletTransactionSigner {
  publicKey: PublicKey;
  signTransaction<T extends Transaction>(tx: T): Promise<T>;
  signAndSendTransaction?: (
    tx: Transaction
  ) => Promise<{ signature: string }>;
}

export class SolanaTaskRepository implements TaskRepository {
  readonly modeLabel = 'Solana Devnet (Anchor RPC)';
  readonly isDemo = false;
  readonly network = 'devnet' as const;
  readonly programId: SolanaAddress | null;
  readonly rpcEndpoint: string;
  private connection: Connection;
  private signer: WalletTransactionSigner | null = null;

  constructor(config?: Partial<SolanaProgramConfig>) {
    this.rpcEndpoint = config?.rpcEndpoint ?? 'https://api.devnet.solana.com';
    this.programId = config?.programId ?? null;
    this.connection = new Connection(this.rpcEndpoint, 'confirmed');
  }

  public setSigner(signer: WalletTransactionSigner | null): void {
    this.signer = signer;
  }

  private getProgramPublicKey(): PublicKey {
    if (!this.programId || !isValidBase58PubkeyFormat(this.programId)) {
      throw new Error(
        'El Program ID de ProofTask en Solana Devnet no esta configurado o es invalido. Configura el Program ID desplegado.'
      );
    }
    return new PublicKey(this.programId);
  }

  private async getActiveSigner(fallbackAuthority?: string): Promise<WalletTransactionSigner> {
    if (this.signer && this.signer.publicKey) {
      return this.signer;
    }

    // Comprobar si existe una wallet inyectada en el navegador (Phantom, Solflare, etc.)
    const win = typeof window !== 'undefined' ? (window as any) : null;
    const injected = win?.solana || win?.phantom?.solana || win?.solflare;

    if (injected && injected.publicKey) {
      return {
        publicKey: new PublicKey(injected.publicKey.toString()),
        signTransaction: (tx: Transaction) => injected.signTransaction(tx),
        signAndSendTransaction: injected.signAndSendTransaction
          ? (tx: Transaction) => injected.signAndSendTransaction(tx)
          : undefined,
      };
    }

    if (fallbackAuthority && isValidBase58PubkeyFormat(fallbackAuthority)) {
      throw new Error(
        `Wallet no conectada para firmar. Conecta la wallet (${fallbackAuthority}) a través de la interfaz para autorizar la transacción en Devnet.`
      );
    }

    throw new Error(
      'No se encontró una wallet conectada. Conecta tu wallet en Devnet para firmar la transacción.'
    );
  }

  private async sendAndConfirm(
    tx: Transaction,
    signer: WalletTransactionSigner,
    onStageChange?: StageChangeCallback
  ): Promise<string> {
    try {
      onStageChange?.('preparing');
      const { blockhash, lastValidBlockHeight } =
        await this.connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;
      tx.feePayer = signer.publicKey;

      onStageChange?.('awaiting_signature');
      let signature: string;

      if (signer.signAndSendTransaction) {
        const result = await signer.signAndSendTransaction(tx);
        signature = typeof result === 'string' ? result : result.signature;
      } else {
        const signedTx = await signer.signTransaction(tx);
        onStageChange?.('submitting');
        signature = await this.connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
      }

      onStageChange?.('confirming');
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash,
          lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Error en la confirmación: ${JSON.stringify(confirmation.value.err)}`);
      }

      onStageChange?.('success');
      return signature;
    } catch (err) {
      onStageChange?.('error');
      const friendly = parseSolanaError(err);
      throw new Error(friendly);
    }
  }

  async getProjects(): Promise<Project[]> {
    if (!this.programId || !isValidBase58PubkeyFormat(this.programId)) {
      return [];
    }

    const programKey = this.getProgramPublicKey();
    const discriminatorBase58 = bs58.encode(ACCOUNT_DISCRIMINATORS.Project);

    try {
      const accounts = await this.connection.getProgramAccounts(programKey, {
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: discriminatorBase58,
            },
          },
        ],
      });

      const projects = accounts.map((acc) =>
        decodeProjectAccount(acc.pubkey, acc.account.data as Buffer)
      );

      return projects.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.warn('Error al obtener proyectos on-chain:', err);
      return [];
    }
  }

  async getProjectById(projectPublicKey: SolanaAddress): Promise<Project | null> {
    if (!isValidBase58PubkeyFormat(projectPublicKey)) {
      return null;
    }

    try {
      const pubkey = new PublicKey(projectPublicKey);
      const accInfo = await this.connection.getAccountInfo(pubkey);
      if (!accInfo || !accInfo.data) return null;

      return decodeProjectAccount(pubkey, accInfo.data as Buffer);
    } catch {
      return null;
    }
  }

  async getTasks(projectPublicKey?: SolanaAddress): Promise<Task[]> {
    if (!this.programId || !isValidBase58PubkeyFormat(this.programId)) {
      return [];
    }

    const programKey = this.getProgramPublicKey();
    const discriminatorBase58 = bs58.encode(ACCOUNT_DISCRIMINATORS.Task);

    try {
      const filters: any[] = [
        {
          memcmp: {
            offset: 0,
            bytes: discriminatorBase58,
          },
        },
      ];

      if (projectPublicKey && isValidBase58PubkeyFormat(projectPublicKey)) {
        filters.push({
          memcmp: {
            offset: 8,
            bytes: projectPublicKey,
          },
        });
      }

      const accounts = await this.connection.getProgramAccounts(programKey, {
        filters,
      });

      const tasks = accounts.map((acc) =>
        decodeTaskAccount(acc.pubkey, acc.account.data as Buffer)
      );

      return tasks.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.warn('Error al obtener tareas on-chain:', err);
      return [];
    }
  }

  async createProject(
    input: CreateProjectInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Project>> {
    const nameErr = validateProjectName(input.name);
    if (nameErr) {
      onStageChange?.('error');
      throw new Error(nameErr);
    }
    const descErr = validateProjectDescription(input.description);
    if (descErr) {
      onStageChange?.('error');
      throw new Error(descErr);
    }

    const programKey = this.getProgramPublicKey();
    const signer = await this.getActiveSigner(authority);

    // Determinar siguiente ID secuencial para esta autoridad
    const existing = await this.getProjects();
    const myProjects = existing.filter((p) => p.authority === signer.publicKey.toBase58());
    const nextProjectId =
      myProjects.reduce((max, p) => Math.max(max, p.projectId), 0) + 1;

    const ix = buildCreateProjectInstruction(
      programKey,
      signer.publicKey,
      nextProjectId,
      input.name.trim(),
      input.description.trim()
    );

    const tx = new Transaction().add(ix);
    const signature = await this.sendAndConfirm(tx, signer, onStageChange);

    const [projectPda] = findProjectPda(signer.publicKey, nextProjectId, programKey);
    const now = Date.now();

    const createdProject: Project = {
      publicKey: projectPda.toBase58(),
      authority: signer.publicKey.toBase58(),
      projectId: nextProjectId,
      name: input.name.trim(),
      description: input.description.trim(),
      nextTaskId: 0,
      activeTasks: 0,
      createdAt: now,
      isSimulated: false,
      pdaAddress: projectPda.toBase58(),
    };

    return {
      data: createdProject,
      isSimulated: false,
      note: 'Proyecto creado en Solana Devnet mediante instrucción Anchor create_project.',
      signature,
    };
  }

  async closeProject(
    projectPublicKey: SolanaAddress,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<void>> {
    const programKey = this.getProgramPublicKey();
    const signer = await this.getActiveSigner(authority);
    const projectPubkey = new PublicKey(projectPublicKey);

    const ix = buildCloseProjectInstruction(programKey, signer.publicKey, projectPubkey);
    const tx = new Transaction().add(ix);
    const signature = await this.sendAndConfirm(tx, signer, onStageChange);

    return {
      data: undefined,
      isSimulated: false,
      note: 'Cuenta de proyecto cerrada en Solana Devnet y renta SOL devuelta a la autoridad.',
      signature,
    };
  }

  async createTask(
    input: CreateTaskInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>> {
    const titleErr = validateTaskTitle(input.title);
    if (titleErr) {
      onStageChange?.('error');
      throw new Error(titleErr);
    }
    const descErr = validateTaskDescription(input.description);
    if (descErr) {
      onStageChange?.('error');
      throw new Error(descErr);
    }

    const programKey = this.getProgramPublicKey();
    const signer = await this.getActiveSigner(authority);
    const project = await this.getProjectById(input.projectPublicKey);

    if (!project) {
      onStageChange?.('error');
      throw new Error('No se encontró el proyecto en la red Devnet para crear la tarea.');
    }

    const projectPubkey = new PublicKey(input.projectPublicKey);
    const ix = buildCreateTaskInstruction(
      programKey,
      signer.publicKey,
      projectPubkey,
      project.nextTaskId,
      input.title.trim(),
      input.description.trim()
    );

    const tx = new Transaction().add(ix);
    const signature = await this.sendAndConfirm(tx, signer, onStageChange);

    const now = Date.now();
    const [taskPda] = findTaskPda(projectPubkey, project.nextTaskId, programKey);
    const createdTask: Task = {
      publicKey: taskPda.toBase58(),
      projectPublicKey: input.projectPublicKey,
      taskId: project.nextTaskId,
      title: input.title.trim(),
      description: input.description.trim(),
      status: 'Pending',
      evidenceUrl: null,
      createdAt: now,
      updatedAt: now,
      isSimulated: false,
      pdaAddress: taskPda.toBase58(),
    };

    return {
      data: createdTask,
      isSimulated: false,
      note: 'Tarea creada en Solana Devnet mediante instrucción Anchor create_task.',
      signature,
    };
  }

  async startTask(
    taskPublicKey: SolanaAddress,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>> {
    const programKey = this.getProgramPublicKey();
    const signer = await this.getActiveSigner(authority);
    const taskPubkey = new PublicKey(taskPublicKey);

    const taskInfo = await this.connection.getAccountInfo(taskPubkey);
    if (!taskInfo || !taskInfo.data) {
      onStageChange?.('error');
      throw new Error('No se encontró la cuenta de la tarea on-chain.');
    }

    const decoded = decodeTaskAccount(taskPubkey, taskInfo.data as Buffer);
    const projectPubkey = new PublicKey(decoded.projectPublicKey);

    const ix = buildStartTaskInstruction(
      programKey,
      signer.publicKey,
      projectPubkey,
      taskPubkey
    );

    const tx = new Transaction().add(ix);
    const signature = await this.sendAndConfirm(tx, signer, onStageChange);

    const updatedTask: Task = {
      ...decoded,
      status: 'InProgress',
      updatedAt: Date.now(),
    };

    return {
      data: updatedTask,
      isSimulated: false,
      note: 'Tarea iniciada en Solana Devnet (Pending -> InProgress).',
      signature,
    };
  }

  async completeTask(
    input: CompleteTaskInput,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<Task>> {
    const urlErr = validateEvidenceUrl(input.evidenceUrl);
    if (urlErr) {
      onStageChange?.('error');
      throw new Error(urlErr);
    }

    const programKey = this.getProgramPublicKey();
    const signer = await this.getActiveSigner(authority);
    const taskPubkey = new PublicKey(input.taskPublicKey);

    const taskInfo = await this.connection.getAccountInfo(taskPubkey);
    if (!taskInfo || !taskInfo.data) {
      onStageChange?.('error');
      throw new Error('No se encontró la cuenta de la tarea on-chain.');
    }

    const decoded = decodeTaskAccount(taskPubkey, taskInfo.data as Buffer);
    const projectPubkey = new PublicKey(decoded.projectPublicKey);

    const ix = buildCompleteTaskInstruction(
      programKey,
      signer.publicKey,
      projectPubkey,
      taskPubkey,
      input.evidenceUrl.trim()
    );

    const tx = new Transaction().add(ix);
    const signature = await this.sendAndConfirm(tx, signer, onStageChange);

    const updatedTask: Task = {
      ...decoded,
      status: 'Completed',
      evidenceUrl: input.evidenceUrl.trim(),
      updatedAt: Date.now(),
    };

    return {
      data: updatedTask,
      isSimulated: false,
      note: 'Tarea completada con evidencia HTTPS en Solana Devnet.',
      signature,
    };
  }

  async closeTask(
    taskPublicKey: SolanaAddress,
    authority: SolanaAddress,
    onStageChange?: StageChangeCallback
  ): Promise<RepositoryOperationResult<void>> {
    const programKey = this.getProgramPublicKey();
    const signer = await this.getActiveSigner(authority);
    const taskPubkey = new PublicKey(taskPublicKey);

    const taskInfo = await this.connection.getAccountInfo(taskPubkey);
    if (!taskInfo || !taskInfo.data) {
      onStageChange?.('error');
      throw new Error('No se encontró la cuenta de la tarea on-chain.');
    }

    const decoded = decodeTaskAccount(taskPubkey, taskInfo.data as Buffer);
    const projectPubkey = new PublicKey(decoded.projectPublicKey);

    const ix = buildCloseTaskInstruction(
      programKey,
      signer.publicKey,
      projectPubkey,
      taskPubkey
    );

    const tx = new Transaction().add(ix);
    const signature = await this.sendAndConfirm(tx, signer, onStageChange);

    return {
      data: undefined,
      isSimulated: false,
      note: 'Cuenta de tarea cerrada en Solana Devnet y renta SOL devuelta a la autoridad.',
      signature,
    };
  }

  async verifyTransaction(
    programId: string,
    signature: string
  ): Promise<VerificationCheckResult> {
    const trimmedSig = signature.trim();
    const trimmedProgram = programId.trim();
    const now = Date.now();

    if (!trimmedSig) {
      return {
        status: 'invalid_input',
        programId: trimmedProgram || null,
        signature: '',
        isValidSignatureFormat: false,
        isSimulated: false,
        summary: 'Introduce una firma de transacción de Solana Devnet para verificar.',
        details: [
          'La firma de transacción no puede estar vacía.',
          'Introduce una firma Base58 válida de una transacción confirmada en Devnet.',
        ],
        explorerUrl: null,
        checkedAt: now,
      };
    }

    const validSigFormat = isValidBase58SignatureFormat(trimmedSig);
    const hasCustomProgram =
      trimmedProgram.length > 0 && trimmedProgram !== 'Pendiente de despliegue';
    const validProgramFormat = !hasCustomProgram || isValidBase58PubkeyFormat(trimmedProgram);

    if (!validProgramFormat) {
      return {
        status: 'invalid_input',
        programId: trimmedProgram,
        signature: trimmedSig,
        isValidSignatureFormat: validSigFormat,
        isSimulated: false,
        summary: 'El formato del Program ID introducido no es una clave pública Base58 válida.',
        details: [
          'Un Program ID de Solana debe tener entre 32 y 44 caracteres en Base58.',
        ],
        explorerUrl: validSigFormat
          ? `https://explorer.solana.com/tx/${encodeURIComponent(trimmedSig)}?cluster=devnet`
          : null,
        checkedAt: now,
      };
    }

    if (!validSigFormat) {
      return {
        status: 'invalid_input',
        programId: hasCustomProgram ? trimmedProgram : null,
        signature: trimmedSig,
        isValidSignatureFormat: false,
        isSimulated: false,
        summary: 'Formato de firma inválido para Solana Devnet.',
        details: [
          'Las firmas en Solana deben tener entre 86 y 88 caracteres en Base58.',
        ],
        explorerUrl: null,
        checkedAt: now,
      };
    }

    const explorerUrl = `https://explorer.solana.com/tx/${encodeURIComponent(trimmedSig)}?cluster=devnet`;

    try {
      const tx = await this.connection.getParsedTransaction(trimmedSig, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        return {
          status: 'not_found',
          programId: hasCustomProgram ? trimmedProgram : null,
          signature: trimmedSig,
          isValidSignatureFormat: true,
          isSimulated: false,
          summary: 'Transacción no encontrada o aún no confirmada en Solana Devnet.',
          details: [
            'La firma tiene un formato Base58 válido, pero el RPC de Devnet no registra la transacción.',
            'Puede encontrarse en proceso de propagación o corresponder a otra red (Mainnet/Testnet).',
          ],
          explorerUrl,
          checkedAt: now,
        };
      }

      const touchesProgram = hasCustomProgram
        ? tx.transaction.message.accountKeys.some(
            (k) => k.pubkey.toBase58() === trimmedProgram
          )
        : true;

      const fee = tx.meta?.fee ? `${tx.meta.fee / 1_000_000_000} SOL` : '0 SOL';
      const slot = tx.slot;
      const blockTime = tx.blockTime
        ? new Date(tx.blockTime * 1000).toLocaleString('es-ES')
        : 'N/A';

      return {
        status: 'verified',
        programId: hasCustomProgram ? trimmedProgram : null,
        signature: trimmedSig,
        isValidSignatureFormat: true,
        isSimulated: false,
        summary: `Transacción verificada exitosamente en el bloque/slot #${slot} de Devnet.`,
        details: [
          `Tarifa de red abonada: ${fee}`,
          `Marca temporal: ${blockTime}`,
          touchesProgram
            ? `Interacción confirmada con el programa: ${trimmedProgram}`
            : 'La transacción está confirmada pero no interactuó con el Program ID indicado.',
          `Estado de ejecución: ${tx.meta?.err ? 'Fallida (' + JSON.stringify(tx.meta.err) + ')' : 'Exitosa (0 errores)'}`,
        ],
        explorerUrl,
        checkedAt: now,
      };
    } catch (err: any) {
      return {
        status: 'error',
        programId: hasCustomProgram ? trimmedProgram : null,
        signature: trimmedSig,
        isValidSignatureFormat: true,
        isSimulated: false,
        summary: 'Error al consultar el estado de la transacción en el RPC de Devnet.',
        details: [err.message || String(err)],
        explorerUrl,
        checkedAt: now,
      };
    }
  }
}
