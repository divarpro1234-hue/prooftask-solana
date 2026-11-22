import type { SolanaProgramConfig } from '@/src/types/prooftask';
import { MockTaskRepository } from './MockTaskRepository';
import { SolanaTaskRepository } from './SolanaTaskRepository';
import type { TaskRepository } from './TaskRepository';

export type RepositoryMode = 'mock' | 'solana';

export function createTaskRepository(
  mode: RepositoryMode = 'mock',
  solanaConfig?: Partial<SolanaProgramConfig>
): TaskRepository {
  if (mode === 'solana') {
    return new SolanaTaskRepository(solanaConfig);
  }
  return new MockTaskRepository();
}

export { MockTaskRepository, SolanaTaskRepository };
export type { StageChangeCallback, TaskRepository } from './TaskRepository';
