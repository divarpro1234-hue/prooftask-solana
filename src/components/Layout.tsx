import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ChevronRight,
  FolderKanban,
  Globe,
  Layers,
  LayoutDashboard,
  Menu,
  Radio,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useRepositoryConfig } from '@/src/context/RepositoryContext';
import { ConnectWalletButton } from './ConnectWalletButton';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Mis proyectos', icon: FolderKanban },
  { to: '/verify', label: 'Verificar', icon: ShieldCheck },
] as const;

export function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { mode, setMode, programId } = useRepositoryConfig();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between px-4 py-5">
      <div>
        <NavLink
          to="/dashboard"
          onClick={() => setMobileMenuOpen(false)}
          className="group flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#9945FF]/35 bg-gradient-to-br from-[#9945FF]/25 via-[#9945FF]/10 to-[#14F195]/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-[#14F195] transition-transform duration-150 group-hover:scale-105"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="block font-display text-lg font-bold tracking-tight text-[#F8FAFC]">
              ProofTask
            </span>
            <span className="block text-[11px] font-medium tracking-wide text-[#94A3B8]">
              Manage. Prove. Verify.
            </span>
          </div>
        </NavLink>

        <div className="mt-7 px-2.5">
          <p className="text-xs font-medium text-[#94A3B8]/80">Espacio de trabajo</p>
        </div>

        <nav aria-label="Navegación principal" className="mt-2.5 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF] ${
                  isActive
                    ? 'border border-[#9945FF]/35 bg-[#9945FF]/15 text-[#F8FAFC] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                    : 'border border-transparent text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                        isActive
                          ? 'bg-[#9945FF]/20 text-[#14F195]'
                          : 'bg-white/[0.03] text-[#94A3B8] group-hover:bg-white/[0.06] group-hover:text-[#F8FAFC]'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate">{label}</span>
                  </span>
                  {isActive && (
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 text-[#9945FF]"
                      aria-hidden="true"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#151E31]/70 p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F8FAFC]">
            {mode === 'solana' ? (
              <Radio className="h-4 w-4 shrink-0 text-[#14F195] animate-pulse" aria-hidden="true" />
            ) : (
              <Layers className="h-4 w-4 shrink-0 text-[#9945FF]" aria-hidden="true" />
            )}
            <span>{mode === 'solana' ? 'Solana Devnet' : 'Modo demostración'}</span>
          </div>
          <button
            type="button"
            onClick={() => setMode(mode === 'solana' ? 'mock' : 'solana')}
            className="text-[11px] font-medium text-[#C084FC] hover:text-[#14F195] transition-colors"
          >
            {mode === 'solana' ? 'Cambiar a Demo' : 'Cambiar a Devnet'}
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#94A3B8]">
          {mode === 'solana'
            ? `Conectado al RPC de Solana Devnet. Programa: ${programId ? `${programId.slice(0, 4)}...${programId.slice(-4)}` : 'Pendiente'}`
            : 'Almacenamiento local activo para diseño y pruebas sin fondos.'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-[#F8FAFC]">
      {/* Desktop Fixed Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-white/[0.08] bg-[#0B1020]/95 backdrop-blur-md lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-[#050814]/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-[#0B1020] shadow-2xl shadow-black/70">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Cerrar menú lateral"
              className="absolute right-3 top-4 flex h-10 w-10 items-center justify-center rounded-lg text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9945FF]"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0B1020]/90 px-4 backdrop-blur-md sm:h-16 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#151E31] text-[#F8FAFC] transition-colors hover:border-white/20 hover:bg-[#1A253B] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-2 text-xs text-[#94A3B8]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#14F195]/10 text-[#14F195]">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="font-medium text-[#F8FAFC] whitespace-nowrap">Solana Devnet</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden truncate sm:inline">
                {mode === 'solana' ? 'On-Chain RPC' : 'Modo demostración'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ConnectWalletButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
