import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FolderKanban,
  PlayCircle,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { CreateProjectModal } from '@/src/components/CreateProjectModal';
import { EmptyState } from '@/src/components/EmptyState';
import { useTaskRepository } from '@/src/context/RepositoryContext';
import type { Project, Task } from '@/src/types/prooftask';
import { formatSpanishDate, truncateAddress } from '@/src/utils/bytes';

export function DashboardPage() {
  const repository = useTaskRepository();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [fetchedProjects, fetchedTasks] = await Promise.all([
        repository.getProjects(),
        repository.getTasks(),
      ]);
      setProjects(fetchedProjects);
      setTasks(fetchedTasks);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los datos del panel.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Todas las estadísticas se calculan directamente desde los datos existentes del repositorio
  const stats = useMemo(() => {
    const activeProjectKeys = new Set(projects.map((p) => p.publicKey));
    const activeProjectTasks = tasks.filter((t) => activeProjectKeys.has(t.projectPublicKey));

    return {
      activeProjects: projects.length,
      pendingTasks: activeProjectTasks.filter((t) => t.status === 'Pending').length,
      inProgressTasks: activeProjectTasks.filter((t) => t.status === 'InProgress').length,
      completedActiveTasks: activeProjectTasks.filter((t) => t.status === 'Completed').length,
    };
  }, [projects, tasks]);

  const recentProjects = useMemo(() => projects.slice(0, 4), [projects]);

  const statCards = [
    {
      label: 'Proyectos activos',
      hint: 'Espacios en curso',
      value: stats.activeProjects,
      icon: FolderKanban,
      valueClass: 'text-[#F8FAFC]',
      iconBoxClass: 'border-[#9945FF]/30 bg-[#9945FF]/15 text-[#C084FC]',
    },
    {
      label: 'Tareas pendientes',
      hint: 'Listas para iniciar',
      value: stats.pendingTasks,
      icon: Clock,
      valueClass: 'text-[#F8FAFC]',
      iconBoxClass: 'border-sky-400/25 bg-sky-400/12 text-sky-300',
    },
    {
      label: 'Tareas en progreso',
      hint: 'En ejecución actual',
      value: stats.inProgressTasks,
      icon: PlayCircle,
      valueClass: 'text-[#F8FAFC]',
      iconBoxClass: 'border-indigo-400/30 bg-indigo-400/15 text-indigo-300',
    },
    {
      label: 'Completadas activas',
      hint: 'Con evidencia registrada',
      value: stats.completedActiveTasks,
      icon: CheckCircle2,
      valueClass: 'text-[#14F195]',
      iconBoxClass: 'border-[#14F195]/30 bg-[#14F195]/12 text-[#14F195]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero / Welcome Section */}
      <section className="flex flex-col gap-5 border-b border-white/[0.08] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[#14F195]">
            Manage. Prove. Verify. · Modo demostración
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
            Bienvenido a ProofTask
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#94A3B8] sm:text-base">
            Organiza proyectos técnicos, registra evidencias HTTPS en cada entrega y prepara
            operaciones verificables para su firma en la red Solana Devnet.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] whitespace-nowrap shrink-0 shadow-lg shadow-[#9945FF]/20 transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1020] sm:w-auto"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Crear proyecto</span>
        </button>
      </section>

      {/* Error State */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-[#151E31] p-4 shadow-lg shadow-black/25"
        >
          <div className="flex items-center gap-3 text-sm text-rose-300">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadDashboardData()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-[#F8FAFC] transition-colors hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* 4 Visually Differentiated Stat Cards */}
      <section aria-label="Resumen operativo">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
                    <div className="h-9 w-9 animate-pulse rounded-lg bg-white/10" />
                  </div>
                  <div className="mt-4 h-8 w-16 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/10" />
                </div>
              ))
            : statCards.map(({ label, hint, value, icon: Icon, valueClass, iconBoxClass }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-colors hover:border-white/[0.16]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-sm font-medium text-[#94A3B8]">{label}</span>
                      <p
                        className={`mt-2.5 font-display text-3xl font-bold tabular-nums tracking-tight ${valueClass}`}
                      >
                        {value}
                      </p>
                    </div>
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconBoxClass}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                  </div>
                  <p className="mt-3 border-t border-white/[0.06] pt-2.5 text-xs text-[#94A3B8]">
                    {hint}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* Recent Projects Section */}
      <section aria-labelledby="recent-projects-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="recent-projects-heading"
              className="font-display text-lg font-semibold text-[#F8FAFC]"
            >
              Proyectos recientes
            </h2>
            <p className="mt-0.5 text-xs text-[#94A3B8]">
              Datos locales simulados · {repository.modeLabel}
            </p>
          </div>

          <Link
            to="/projects"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-[#C084FC] whitespace-nowrap shrink-0 transition-colors hover:text-[#14F195] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
          >
            <span>Ver todos los proyectos</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-white/[0.08] bg-[#151E31] p-5"
              >
                <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
                <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-white/10" />
                <div className="mt-5 h-4 w-32 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No hay proyectos activos en este espacio"
            description="Crea tu primer proyecto para organizar tareas verificables y registrar evidencias HTTPS en cada entrega."
            action={
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#8533EE]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Crear primer proyecto</span>
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recentProjects.map((project) => (
              <Link
                key={project.publicKey}
                to={`/projects/${project.publicKey}`}
                className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-150 hover:border-[#9945FF]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
                    <span className="font-mono tabular-nums">
                      Proyecto #{project.projectId}
                    </span>
                    <span className="tabular-nums">{formatSpanishDate(project.createdAt)}</span>
                  </div>

                  <h3 className="mt-2 font-display text-base font-semibold leading-snug text-[#F8FAFC] transition-colors group-hover:text-[#14F195]">
                    {project.name}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[#94A3B8]">
                    {project.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3.5 text-xs">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <span className="font-mono font-semibold tabular-nums text-[#14F195]">
                      {project.activeTasks}{' '}
                      {project.activeTasks === 1 ? 'tarea activa' : 'tareas activas'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="hidden font-mono tabular-nums sm:inline">
                      {truncateAddress(project.authority, 4, 4)}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-medium text-[#F8FAFC] transition-colors group-hover:text-[#14F195]">
                    <span>Abrir</span>
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(created) => {
          void loadDashboardData();
          navigate(`/projects/${created.publicKey}`);
        }}
      />
    </div>
  );
}
