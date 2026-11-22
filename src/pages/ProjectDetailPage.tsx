import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  Link2,
  MoreVertical,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '@/src/components/ConfirmModal';
import { CreateTaskModal } from '@/src/components/CreateTaskModal';
import { EmptyState } from '@/src/components/EmptyState';
import { TaskDetailDrawer } from '@/src/components/TaskDetailDrawer';
import { TaskStatusLabel } from '@/src/components/TaskStatusLabel';
import { useTaskRepository } from '@/src/context/RepositoryContext';
import { useToast } from '@/src/context/ToastContext';
import { useWallet } from '@/src/context/WalletContext';
import type { Project, Task, TaskStatus, TransactionStage } from '@/src/types/prooftask';
import { formatSpanishDate, truncateAddress } from '@/src/utils/bytes';

const KANBAN_COLUMNS: {
  status: TaskStatus;
  title: string;
  emptyTitle: string;
  emptyHint: string;
  Icon: typeof Clock;
  iconClass: string;
}[] = [
  {
    status: 'Pending',
    title: 'Pendiente',
    emptyTitle: 'Sin tareas pendientes',
    emptyHint: 'Crea una nueva tarea para iniciar el flujo verificable.',
    Icon: Clock,
    iconClass: 'text-sky-300',
  },
  {
    status: 'InProgress',
    title: 'En progreso',
    emptyTitle: 'Ninguna en ejecución',
    emptyHint: 'Inicia una tarea desde la columna Pendiente para avanzar.',
    Icon: PlayCircle,
    iconClass: 'text-[#C084FC]',
  },
  {
    status: 'Completed',
    title: 'Completada',
    emptyTitle: 'Sin entregas completadas',
    emptyHint: 'Adjunta una URL HTTPS de evidencia para completar una tarea.',
    Icon: CheckCircle2,
    iconClass: 'text-[#14F195]',
  },
];

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const repository = useTaskRepository();
  const { wallet, openConnectModal } = useWallet();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close task confirmation state
  const [taskPendingClose, setTaskPendingClose] = useState<Task | null>(null);
  const [closeTaskStage, setCloseTaskStage] = useState<TransactionStage>('idle');
  const [closeTaskError, setCloseTaskError] = useState<string | null>(null);
  const [isClosingTask, setIsClosingTask] = useState(false);

  // Close project confirmation state
  const [isCloseProjectOpen, setIsCloseProjectOpen] = useState(false);
  const [closeProjectStage, setCloseProjectStage] = useState<TransactionStage>('idle');
  const [closeProjectError, setCloseProjectError] = useState<string | null>(null);
  const [isClosingProject, setIsClosingProject] = useState(false);

  const loadProjectAndTasks = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [foundProject, projectTasks] = await Promise.all([
        repository.getProjectById(id),
        repository.getTasks(id),
      ]);
      setProject(foundProject);
      setTasks(projectTasks);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la información del proyecto.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, repository]);

  useEffect(() => {
    void loadProjectAndTasks();
  }, [loadProjectAndTasks]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const tasksByColumn = useMemo(() => {
    return {
      Pending: tasks.filter((t) => t.status === 'Pending'),
      InProgress: tasks.filter((t) => t.status === 'InProgress'),
      Completed: tasks.filter((t) => t.status === 'Completed'),
    };
  }, [tasks]);

  const handleConfirmCloseTask = async () => {
    if (!taskPendingClose) return;
    if (!wallet.connected || !wallet.publicKey) {
      setCloseTaskStage('error');
      setCloseTaskError('Conecta una wallet de demostración antes de cerrar la tarea.');
      showToast({
        title: 'Wallet requerida',
        description: 'Conecta una wallet en modo demostración para cerrar la tarea.',
        variant: 'warning',
      });
      return;
    }

    setCloseTaskError(null);
    setIsClosingTask(true);

    try {
      await repository.closeTask(
        taskPendingClose.publicKey,
        wallet.publicKey,
        (stage) => setCloseTaskStage(stage)
      );
      showToast({
        title: 'Tarea cerrada (Demostración)',
        description: `"${taskPendingClose.title}" fue cerrada y removida de tareas activas.`,
        variant: 'success',
      });
      setTaskPendingClose(null);
      setSelectedTask(null);
      await loadProjectAndTasks();
    } catch (error) {
      setCloseTaskStage('error');
      setCloseTaskError(
        error instanceof Error ? error.message : 'No se pudo cerrar la tarea.'
      );
    } finally {
      setIsClosingTask(false);
    }
  };

  const handleConfirmCloseProject = async () => {
    if (!project) return;
    if (!wallet.connected || !wallet.publicKey) {
      setCloseProjectStage('error');
      setCloseProjectError('Conecta una wallet de demostración antes de cerrar el proyecto.');
      showToast({
        title: 'Wallet requerida',
        description: 'Conecta una wallet en modo demostración para cerrar el proyecto.',
        variant: 'warning',
      });
      return;
    }

    setCloseProjectError(null);
    setIsClosingProject(true);

    try {
      await repository.closeProject(
        project.publicKey,
        wallet.publicKey,
        (stage) => setCloseProjectStage(stage)
      );
      showToast({
        title: 'Proyecto cerrado (Demostración)',
        description: `"${project.name}" ha sido cerrado correctamente.`,
        variant: 'success',
      });
      setIsCloseProjectOpen(false);
      navigate('/projects');
    } catch (error) {
      setCloseProjectStage('error');
      setCloseProjectError(
        error instanceof Error ? error.message : 'No se pudo cerrar el proyecto.'
      );
    } finally {
      setIsClosingProject(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-52 animate-pulse rounded bg-white/10" />
        <div className="h-9 w-80 animate-pulse rounded bg-white/10" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-80 animate-pulse rounded-xl border border-white/[0.08] bg-[#151E31]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-[#151E31] p-6 shadow-lg shadow-black/25"
      >
        <div className="flex items-center gap-3 text-sm text-rose-300">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{loadError}</span>
        </div>
        <button
          type="button"
          onClick={() => void loadProjectAndTasks()}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-[#F8FAFC] hover:bg-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reintentar</span>
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Proyecto no encontrado"
        description="El proyecto solicitado no existe o su cuenta fue cerrada en este entorno de demostración."
        action={
          <Link
            to="/projects"
            className="inline-flex h-10 items-center rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#8533EE]"
          >
            Volver a Mis proyectos
          </Link>
        }
      />
    );
  }

  const canCloseProject = tasks.length === 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <header className="space-y-4 border-b border-white/[0.08] pb-6">
        <nav
          aria-label="Ruta de navegación"
          className="flex items-center gap-1.5 text-xs text-[#94A3B8]"
        >
          <Link to="/projects" className="transition-colors hover:text-[#F8FAFC]">
            Mis proyectos
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate font-medium text-[#F8FAFC]">{project.name}</span>
        </nav>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#94A3B8]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[#14F195]">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Solana Devnet</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>Modo demostración</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Propietario {truncateAddress(project.authority, 5, 4)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#F8FAFC]">
                {tasks.length} {tasks.length === 1 ? 'tarea activa' : 'tareas activas'}
              </span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
              {project.name}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
              {project.description}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateTaskOpen(true)}
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] whitespace-nowrap shadow-lg shadow-[#9945FF]/20 transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] sm:flex-initial"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Nueva tarea</span>
            </button>

            <div className="relative" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                aria-label="Acciones del proyecto"
                aria-expanded={actionsMenuOpen}
                aria-haspopup="menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#151E31] text-[#F8FAFC] transition-colors hover:border-white/25 hover:bg-[#1A253B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {actionsMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-white/10 bg-[#151E31] p-2 shadow-2xl shadow-black/70"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      if (!canCloseProject) {
                        showToast({
                          title: 'El proyecto aún tiene tareas activas',
                          description:
                            'Completa y cierra todas las tareas antes de cerrar el proyecto.',
                          variant: 'warning',
                        });
                        return;
                      }
                      if (!wallet.connected) {
                        openConnectModal();
                        showToast({
                          title: 'Wallet requerida',
                          description:
                            'Conecta una wallet de demostración para cerrar el proyecto.',
                          variant: 'warning',
                        });
                        return;
                      }
                      setCloseProjectStage('idle');
                      setCloseProjectError(null);
                      setIsCloseProjectOpen(true);
                    }}
                    className={`flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors ${
                      canCloseProject
                        ? 'text-rose-300 hover:bg-rose-500/10'
                        : 'text-[#94A3B8] hover:bg-white/5'
                    }`}
                  >
                    <Trash2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <div>
                      <span className="block text-sm font-medium">Cerrar proyecto</span>
                      <span className="mt-0.5 block text-xs text-[#94A3B8]">
                        {canCloseProject
                          ? 'Sin tareas activas. Disponible para cierre.'
                          : `Requiere 0 tareas activas (actualmente ${tasks.length}).`}
                      </span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Workflow explanation strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#151E31]/70 px-4 py-3 text-xs text-[#94A3B8]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-[#F8FAFC]">Flujo de estado estricto:</span>
          <span>Pendiente</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#9945FF]" aria-hidden="true" />
          <span>En progreso</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#9945FF]" aria-hidden="true" />
          <span>Completada</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#14F195]" aria-hidden="true" />
          <span>Cierre</span>
        </div>
        <span>
          Cada transición se firma desde el panel lateral de detalles de la tarea.
        </span>
      </div>

      {/* 3-Column Kanban Board (Sin Drag & Drop por diseño Web3) */}
      <section aria-label="Tablero Kanban de tareas" className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {KANBAN_COLUMNS.map((column) => {
          const columnTasks = tasksByColumn[column.status];
          const ColumnIcon = column.Icon;

          return (
            <div
              key={column.status}
              className="flex flex-col rounded-xl border border-white/[0.08] bg-[#151E31]/45 p-4"
            >
              <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center gap-2">
                  <ColumnIcon className={`h-4 w-4 shrink-0 ${column.iconClass}`} aria-hidden="true" />
                  <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
                    {column.title}
                  </h2>
                </div>
                <span className="font-mono text-xs font-semibold tabular-nums text-[#94A3B8]">
                  {columnTasks.length}
                </span>
              </div>

              <div className="mt-4 flex flex-1 flex-col gap-3">
                {columnTasks.length === 0 ? (
                  <EmptyState
                    compact
                    icon={column.Icon}
                    title={column.emptyTitle}
                    description={column.emptyHint}
                    action={
                      column.status === 'Pending' ? (
                        <button
                          type="button"
                          onClick={() => setIsCreateTaskOpen(true)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#9945FF]/40 bg-[#9945FF]/12 px-3 text-xs font-semibold text-[#F8FAFC] transition-colors hover:bg-[#9945FF]"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Nueva tarea</span>
                        </button>
                      ) : undefined
                    }
                  />
                ) : (
                  columnTasks.map((task) => (
                    <article
                      key={task.publicKey}
                      className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#151E31] p-4 shadow-md shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-150 hover:border-[#9945FF]/50"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
                          <span className="font-mono tabular-nums">#{task.taskId}</span>
                          <TaskStatusLabel status={task.status} />
                        </div>

                        <h3 className="mt-2 font-display text-sm font-semibold leading-snug text-[#F8FAFC]">
                          {task.title}
                        </h3>

                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#94A3B8]">
                          {task.description}
                        </p>

                        {task.evidenceUrl && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-[#14F195]">
                            <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">Evidencia HTTPS verificable</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
                        <span className="text-xs tabular-nums text-[#94A3B8]">
                          {formatSpanishDate(task.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedTask(task)}
                          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-[#C084FC] transition-colors hover:bg-[#9945FF]/15 hover:text-[#14F195] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
                        >
                          <span>Ver detalles</span>
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        projectPublicKey={project.publicKey}
        projectName={project.name}
        onClose={() => setIsCreateTaskOpen(false)}
        onCreated={() => {
          void loadProjectAndTasks();
        }}
      />

      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={(updated) => {
          setSelectedTask(updated);
          void loadProjectAndTasks();
        }}
        onRequestCloseTask={(taskToClose) => {
          setCloseTaskStage('idle');
          setCloseTaskError(null);
          setTaskPendingClose(taskToClose);
        }}
      />

      <ConfirmModal
        isOpen={Boolean(taskPendingClose)}
        onClose={() => setTaskPendingClose(null)}
        onConfirm={() => void handleConfirmCloseTask()}
        title="Confirmar cierre de tarea completada"
        message={
          taskPendingClose
            ? `¿Deseas cerrar la tarea "${taskPendingClose.title}"? Al cerrarla dejará de figurar como tarea activa del proyecto (operación simulada en modo demostración).`
            : ''
        }
        confirmLabel="Confirmar cierre"
        isSubmitting={isClosingTask}
        txStage={closeTaskStage}
        txError={closeTaskError}
        operationLabel="Cerrando cuenta de tarea"
      />

      <ConfirmModal
        isOpen={isCloseProjectOpen}
        onClose={() => setIsCloseProjectOpen(false)}
        onConfirm={() => void handleConfirmCloseProject()}
        title="Confirmar cierre de proyecto"
        message={`¿Deseas cerrar el proyecto "${project.name}"? Esta acción cerrará la cuenta del proyecto sin tareas activas (simulada en modo demostración).`}
        confirmLabel="Cerrar proyecto"
        isSubmitting={isClosingProject}
        txStage={closeProjectStage}
        txError={closeProjectError}
        operationLabel="Cerrando cuenta de proyecto"
      />
    </div>
  );
}
