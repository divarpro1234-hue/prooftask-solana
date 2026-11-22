const utf8Encoder = new TextEncoder();

export const BYTE_LIMITS = {
  PROJECT_NAME: 64,
  PROJECT_DESCRIPTION: 180,
  TASK_TITLE: 64,
  TASK_DESCRIPTION: 240,
  EVIDENCE_URL: 160,
} as const;

export function getUtf8ByteLength(value: string): number {
  return utf8Encoder.encode(value).length;
}

export function validateProjectName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'El nombre del proyecto es obligatorio.';
  }
  const bytes = getUtf8ByteLength(trimmed);
  if (bytes > BYTE_LIMITS.PROJECT_NAME) {
    return `El nombre supera el límite de ${BYTE_LIMITS.PROJECT_NAME} bytes UTF-8 (actual: ${bytes} bytes).`;
  }
  return null;
}

export function validateProjectDescription(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return 'La descripción del proyecto es obligatoria.';
  }
  const bytes = getUtf8ByteLength(trimmed);
  if (bytes > BYTE_LIMITS.PROJECT_DESCRIPTION) {
    return `La descripción supera el límite de ${BYTE_LIMITS.PROJECT_DESCRIPTION} bytes UTF-8 (actual: ${bytes} bytes).`;
  }
  return null;
}

export function validateTaskTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) {
    return 'El título de la tarea es obligatorio.';
  }
  const bytes = getUtf8ByteLength(trimmed);
  if (bytes > BYTE_LIMITS.TASK_TITLE) {
    return `El título supera el límite de ${BYTE_LIMITS.TASK_TITLE} bytes UTF-8 (actual: ${bytes} bytes).`;
  }
  return null;
}

export function validateTaskDescription(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return 'La descripción de la tarea es obligatoria.';
  }
  const bytes = getUtf8ByteLength(trimmed);
  if (bytes > BYTE_LIMITS.TASK_DESCRIPTION) {
    return `La descripción supera el límite de ${BYTE_LIMITS.TASK_DESCRIPTION} bytes UTF-8 (actual: ${bytes} bytes).`;
  }
  return null;
}

export function validateEvidenceUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return 'La URL de evidencia HTTPS es obligatoria para completar la tarea.';
  }
  const bytes = getUtf8ByteLength(trimmed);
  if (bytes > BYTE_LIMITS.EVIDENCE_URL) {
    return `La URL supera el límite de ${BYTE_LIMITS.EVIDENCE_URL} bytes UTF-8 (actual: ${bytes} bytes).`;
  }
  if (!trimmed.startsWith('https://')) {
    return 'La URL de evidencia debe comenzar obligatoriamente con https://';
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.')) {
      return 'Introduce una URL HTTPS válida (por ejemplo, https://github.com/org/repo/pull/12).';
    }
  } catch {
    return 'El formato de la URL HTTPS no es válido.';
  }
  return null;
}

export function truncateAddress(address: string, start = 6, end = 4): string {
  if (!address) return '';
  if (address.length <= start + end + 3) {
    return address;
  }
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function formatSpanishDate(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
}

export function formatSpanishDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Comprueba si una cadena tiene el formato Base58 esperado para una firma Solana (87-88 caracteres).
 */
export function isValidBase58SignatureFormat(signature: string): boolean {
  const trimmed = signature.trim();
  return trimmed.length >= 86 && trimmed.length <= 88 && BASE58_REGEX.test(trimmed);
}

/**
 * Comprueba si una cadena tiene el formato Base58 esperado para una clave pública / Program ID Solana (32-44 caracteres).
 */
export function isValidBase58PubkeyFormat(pubkey: string): boolean {
  const trimmed = pubkey.trim();
  return trimmed.length >= 32 && trimmed.length <= 44 && BASE58_REGEX.test(trimmed);
}
