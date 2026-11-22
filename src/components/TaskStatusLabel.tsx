import { CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import type { TaskStatus } from '@/src/types/prooftask';

interface TaskStatusLabelProps {
  status: TaskStatus;
}

const STATUS_META: Record<
  TaskStatus,
  { label: string; colorClass: string; Icon: typeof Clock }
> = {
  Pending: {
    label: 'Pendiente',
    colorClass: 'text-sky-300',
    Icon: Clock,
  },
  InProgress: {
    label: 'En progreso',
    colorClass: 'text-[#C084FC]',
    Icon: PlayCircle,
  },
  Completed: {
    label: 'Completada',
    colorClass: 'text-[#14F195]',
    Icon: CheckCircle2,
  },
};

export function TaskStatusLabel({ status }: TaskStatusLabelProps) {
  const { label, colorClass, Icon } = STATUS_META[status];

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
