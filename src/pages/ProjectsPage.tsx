import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  FolderKanban,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { CreateProjectModal } from '@/src/components/CreateProjectModal';
import { EmptyState } from '@/src/components/EmptyState';
import { useTaskRepository } from '@/src/context/RepositoryContext';
import type { Project } from '@/src/types/prooftask';
import { formatSpanishDate, truncateAddress } from '@/src/utils/bytes';

export function ProjectsPage() {
  const repository = useTaskRepository();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await repository.getProjects();
      setProjects(data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar tus proyectos.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.authority.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">
            Mis proyectos
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#94A3B8]">
            Administra cuentas de proyecto, revisa tareas activas y accede al tablero Kanban
            verificable. Datos en modo demostración.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] whitespace-nowrap shrink-0 shadow-lg shadow-[#9945FF]/20 transition-colors hover:bg-[#8533EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] sm:w-auto"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Nuevo proyecto</span>
        </button>
      </section>

      {/* Search Bar */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, descripción o propietario..."
            aria-label="Buscar proyectos"
            className="h-10 w-full rounded-lg border border-white/10 bg-[#151E31] pl-10 pr-9 text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/70 focus:border-[#9945FF] focus:outline-none focus:ring-2 focus:ring-[#9945FF]/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!isLoading && (
          <p className="text-xs text-[#94A3B8] tabular-nums">
            Mostrando {filteredProjects.length} de {projects.length}{' '}
            {projects.length === 1 ? 'proyecto' : 'proyectos'}
          </p>
        )}
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
            onClick={() => void loadProjects()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-[#F8FAFC] transition-colors hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>
      )}

      {/* Grid / Loading / Empty */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/20"
            >
              <div className="h-3.5 w-24 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-5 w-44 animate-pulse rounded bg-white/10" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-white/10" />
              <div className="mt-6 h-10 w-full animate-pulse rounded-lg bg-white/10" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="Aún no tienes proyectos registrados"
          description="Crea tu primer proyecto para comenzar a gestionar tareas, evidencias HTTPS y transiciones verificables."
          action={
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#9945FF] px-4 text-sm font-semibold text-[#F8FAFC] transition-colors hover:bg-[#8533EE]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Nuevo proyecto</span>
            </button>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <EmptyState
          icon={Search}
          title={`Sin coincidencias para "${searchQuery}"`}
          description="No encontramos proyectos que coincidan con tu búsqueda. Prueba otro término o restablece el filtro."
          action={
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="inline-flex h-10 items-center rounded-lg border border-white/15 bg-[#151E31] px-4 text-sm font-medium text-[#F8FAFC] transition-colors hover:border-white/25 hover:bg-white/[0.05]"
            >
              Limpiar búsqueda
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => (
            <article
              key={project.publicKey}
              className="group flex flex-col justify-between rounded-xl border border-white/[0.08] bg-[#151E31] p-5 shadow-lg shadow-black/25 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-150 hover:border-[#9945FF]/45"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8]">
                  <span className="font-mono tabular-nums">Proyecto #{project.projectId}</span>
                  <span className="tabular-nums">{formatSpanishDate(project.createdAt)}</span>
                </div>

                <h2 className="mt-2.5 font-display text-base font-semibold leading-snug text-[#F8FAFC] transition-colors group-hover:text-[#14F195]">
                  {project.name}
                </h2>
                <p className="mt-2 line-clamp-3 min-h-[3.75rem] text-sm leading-relaxed text-[#94A3B8]">
                  {project.description}
                </p>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-3.5 text-xs">
                  <div>
                    <span className="block text-[#94A3B8]">Propietario (Demo)</span>
                    <span className="mt-0.5 block font-mono font-medium tabular-nums text-[#F8FAFC]">
                      {truncateAddress(project.authority, 5, 4)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[#94A3B8]">Tareas activas</span>
                    <span className="mt-0.5 block font-mono text-sm font-semibold tabular-nums text-[#14F195]">
                      {project.activeTasks}
                    </span>
                  </div>
                </div>

                <Link
                  to={`/projects/${project.publicKey}`}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#9945FF]/35 bg-[#9945FF]/12 px-4 text-sm font-semibold text-[#F8FAFC] transition-colors hover:border-[#9945FF] hover:bg-[#9945FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
                >
                  <span>Ver proyecto</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(created) => {
          void loadProjects();
          navigate(`/projects/${created.publicKey}`);
        }}
      />
    </div>
  );
}
