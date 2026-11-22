import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import prooftaskIdl from '@/src/idl/prooftask.json';
import type {
  Project,
  SolanaAddress,
  Task,
  TaskStatus,
} from '@/src/types/prooftask';

export const PROJECT_SEED_PREFIX = Buffer.from('project');
export const TASK_SEED_PREFIX = Buffer.from('task');

// Discriminadores calculados via sha256("global:<name>")[0..8]
export const IX_DISCRIMINATORS = {
  create_project: Buffer.from([148, 219, 181, 42, 221, 114, 145, 190]),
  create_task: Buffer.from([194, 80, 6, 180, 232, 127, 48, 171]),
  start_task: Buffer.from([188, 33, 243, 39, 149, 232, 14, 168]),
  complete_task: Buffer.from([109, 167, 192, 41, 129, 108, 220, 196]),
  close_task: Buffer.from([55, 234, 77, 69, 245, 208, 54, 167]),
  close_project: Buffer.from([117, 209, 53, 106, 93, 55, 112, 49]),
};

// Discriminadores de cuentas: sha256("account:<Name>")[0..8]
export const ACCOUNT_DISCRIMINATORS = {
  Project: Buffer.from([205, 168, 189, 202, 181, 247, 142, 19]),
  Task: Buffer.from([79, 34, 229, 55, 88, 90, 55, 84]),
};

export const ERROR_MESSAGES: Record<number, string> = {
  6000: 'No autorizado: solo el propietario del proyecto puede ejecutar esta acción.',
  6001: 'Disparidad de proyecto: la tarea indicada no pertenece al proyecto.',
  6002: 'El nombre del proyecto no puede estar vacío.',
  6003: 'El nombre supera el límite máximo de 64 bytes UTF-8.',
  6004: 'La descripción del proyecto no puede estar vacía.',
  6005: 'La descripción supera el límite máximo en bytes UTF-8.',
  6006: 'El título de la tarea no puede estar vacío.',
  6007: 'El título supera el límite máximo de 64 bytes UTF-8.',
  6008: 'Transición de estado inválida: verifica el flujo (Pendiente -> En progreso -> Completada).',
  6009: 'La URL de evidencia HTTPS no puede estar vacía para completar la tarea.',
  6010: 'La URL de evidencia supera el límite de 160 bytes UTF-8.',
  6011: 'La URL de evidencia debe comenzar obligatoriamente con https://',
  6012: 'Solo se pueden cerrar tareas que ya se encuentren en estado Completada.',
  6013: 'No se puede cerrar un proyecto que aún contiene tareas activas.',
  6014: 'Desbordamiento aritmético en la operación.',
  6015: 'Subdesbordamiento aritmético en la operación.',
};

/**
 * Deriva la dirección PDA de un proyecto:
 * seeds = [b"project", authority.toBuffer(), &project_id.to_le_bytes()]
 */
export function findProjectPda(
  authority: PublicKey,
  projectId: number | bigint,
  programId: PublicKey
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(projectId));
  return PublicKey.findProgramAddressSync(
    [PROJECT_SEED_PREFIX, authority.toBuffer(), idBuffer],
    programId
  );
}

/**
 * Deriva la dirección PDA de una tarea:
 * seeds = [b"task", project_pubkey.toBuffer(), &task_id.to_le_bytes()]
 */
export function findTaskPda(
  projectPublicKey: PublicKey,
  taskId: number | bigint,
  programId: PublicKey
): [PublicKey, number] {
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(taskId));
  return PublicKey.findProgramAddressSync(
    [TASK_SEED_PREFIX, projectPublicKey.toBuffer(), idBuffer],
    programId
  );
}

/**
 * Codifica una cadena UTF-8 en formato Borsh (4 bytes longitud u32 LE + bytes UTF-8)
 */
function encodeBorshString(value: string): Buffer {
  const strBuf = Buffer.from(value, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length);
  return Buffer.concat([lenBuf, strBuf]);
}

/**
 * Construye la instrucción Anchor para create_project
 */
export function buildCreateProjectInstruction(
  programId: PublicKey,
  authority: PublicKey,
  projectId: number | bigint,
  name: string,
  description: string
): TransactionInstruction {
  const [projectPda] = findProjectPda(authority, projectId, programId);

  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(projectId));

  const data = Buffer.concat([
    IX_DISCRIMINATORS.create_project,
    idBuffer,
    encodeBorshString(name),
    encodeBorshString(description),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: projectPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Construye la instrucción Anchor para create_task
 */
export function buildCreateTaskInstruction(
  programId: PublicKey,
  authority: PublicKey,
  projectPublicKey: PublicKey,
  nextTaskId: number | bigint,
  title: string,
  description: string
): TransactionInstruction {
  const [taskPda] = findTaskPda(projectPublicKey, nextTaskId, programId);

  const data = Buffer.concat([
    IX_DISCRIMINATORS.create_task,
    encodeBorshString(title),
    encodeBorshString(description),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: projectPublicKey, isSigner: false, isWritable: true },
      { pubkey: taskPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Construye la instrucción Anchor para start_task
 */
export function buildStartTaskInstruction(
  programId: PublicKey,
  authority: PublicKey,
  projectPublicKey: PublicKey,
  taskPublicKey: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: projectPublicKey, isSigner: false, isWritable: false },
      { pubkey: taskPublicKey, isSigner: false, isWritable: true },
    ],
    data: IX_DISCRIMINATORS.start_task,
  });
}

/**
 * Construye la instrucción Anchor para complete_task
 */
export function buildCompleteTaskInstruction(
  programId: PublicKey,
  authority: PublicKey,
  projectPublicKey: PublicKey,
  taskPublicKey: PublicKey,
  evidenceUrl: string
): TransactionInstruction {
  const data = Buffer.concat([
    IX_DISCRIMINATORS.complete_task,
    encodeBorshString(evidenceUrl),
  ]);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: projectPublicKey, isSigner: false, isWritable: false },
      { pubkey: taskPublicKey, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/**
 * Construye la instrucción Anchor para close_task
 */
export function buildCloseTaskInstruction(
  programId: PublicKey,
  authority: PublicKey,
  projectPublicKey: PublicKey,
  taskPublicKey: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: projectPublicKey, isSigner: false, isWritable: true },
      { pubkey: taskPublicKey, isSigner: false, isWritable: true },
    ],
    data: IX_DISCRIMINATORS.close_task,
  });
}

/**
 * Construye la instrucción Anchor para close_project
 */
export function buildCloseProjectInstruction(
  programId: PublicKey,
  authority: PublicKey,
  projectPublicKey: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: projectPublicKey, isSigner: false, isWritable: true },
    ],
    data: IX_DISCRIMINATORS.close_project,
  });
}

/**
 * Deserializa la cuenta on-chain de un Proyecto
 */
export function decodeProjectAccount(pubkey: PublicKey, buffer: Buffer): Project {
  let offset = 8; // saltar discriminador Anchor de 8 bytes

  const authority = new PublicKey(buffer.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const projectId = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const nameLen = buffer.readUInt32LE(offset);
  offset += 4;
  const name = buffer.subarray(offset, offset + nameLen).toString('utf8');
  offset += nameLen;

  const descLen = buffer.readUInt32LE(offset);
  offset += 4;
  const description = buffer.subarray(offset, offset + descLen).toString('utf8');
  offset += descLen;

  const nextTaskId = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const activeTasks = buffer.readUInt32LE(offset);
  offset += 4;

  const createdAt = Number(buffer.readBigInt64LE(offset)) * 1000;
  offset += 8;

  return {
    publicKey: pubkey.toBase58(),
    authority,
    projectId,
    name,
    description,
    nextTaskId,
    activeTasks,
    createdAt,
    isSimulated: false,
    pdaAddress: pubkey.toBase58(),
  };
}

/**
 * Deserializa la cuenta on-chain de una Tarea
 */
export function decodeTaskAccount(pubkey: PublicKey, buffer: Buffer): Task {
  let offset = 8; // saltar discriminador

  const projectPublicKey = new PublicKey(buffer.subarray(offset, offset + 32)).toBase58();
  offset += 32;

  const taskId = Number(buffer.readBigUInt64LE(offset));
  offset += 8;

  const titleLen = buffer.readUInt32LE(offset);
  offset += 4;
  const title = buffer.subarray(offset, offset + titleLen).toString('utf8');
  offset += titleLen;

  const descLen = buffer.readUInt32LE(offset);
  offset += 4;
  const description = buffer.subarray(offset, offset + descLen).toString('utf8');
  offset += descLen;

  const statusByte = buffer.readUInt8(offset);
  offset += 1;
  const statusMap: TaskStatus[] = ['Pending', 'InProgress', 'Completed'];
  const status = statusMap[statusByte] ?? 'Pending';

  const evidenceLen = buffer.readUInt32LE(offset);
  offset += 4;
  const evidenceUrl =
    evidenceLen > 0
      ? buffer.subarray(offset, offset + evidenceLen).toString('utf8')
      : null;
  offset += evidenceLen;

  const createdAt = Number(buffer.readBigInt64LE(offset)) * 1000;
  offset += 8;

  const updatedAt = Number(buffer.readBigInt64LE(offset)) * 1000;
  offset += 8;

  return {
    publicKey: pubkey.toBase58(),
    projectPublicKey,
    taskId,
    title,
    description,
    status,
    evidenceUrl,
    createdAt,
    updatedAt,
    isSimulated: false,
    pdaAddress: pubkey.toBase58(),
  };
}

/**
 * Convierte errores devueltos por el runtime de Solana en descripciones amigables
 */
export function parseSolanaError(error: unknown): string {
  if (!error) return 'Error desconocido en la transacción.';
  const str = String(error);

  for (const [codeStr, msg] of Object.entries(ERROR_MESSAGES)) {
    const code = Number(codeStr);
    const hexCode = `0x${code.toString(16)}`;
    if (
      str.includes(`custom program error: ${hexCode}`) ||
      str.includes(`custom program error: ${code}`) ||
      str.includes(`Error Code: ${code}`) ||
      (!!prooftaskIdl.errors.find((e) => e.code === code)?.name && str.includes(prooftaskIdl.errors.find((e) => e.code === code)!.name))
    ) {
      return msg;
    }
  }

  if (str.includes('User rejected the request') || str.includes('Transaction rejected')) {
    return 'Firma rechazada por el usuario en la wallet.';
  }
  if (str.includes('Attempt to debit an account but found no record of a prior credit')) {
    return 'Fondos insuficientes: tu wallet no tiene SOL de prueba en Devnet para cubrir la renta y las tarifas de red.';
  }
  if (str.includes('Blockhash not found')) {
    return 'El bloque de la transacción caducó antes de confirmarse. Reintenta la operación.';
  }

  return error instanceof Error ? error.message : str;
}

