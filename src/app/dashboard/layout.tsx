'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Icon, IconName } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';

const MENU_ITEMS: { href: string; icon: IconName; label: string; color: string; permiso: string }[] = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard', color: '#D73216', permiso: 'dashboard' },
  { href: '/dashboard/votantes', icon: 'votantes', label: 'Votantes', color: '#3B82F6', permiso: 'votantes' },
  { href: '/dashboard/crm', icon: 'crm', label: 'CRM', color: '#25D366', permiso: 'crm' },
  { href: '/dashboard/eventos', icon: 'eventos', label: 'Eventos', color: '#F59E0B', permiso: 'eventos' },
  { href: '/dashboard/mapa', icon: 'mapa', label: 'Mapa Territorial', color: '#8B5CF6', permiso: 'mapa' },
  { href: '/dashboard/encuestas', icon: 'crm', label: 'Encuestas', color: '#10B981', permiso: 'encuestas' },
  { href: '/dashboard/casillas', icon: 'mapa', label: 'Casillas', color: '#6366F1', permiso: 'casillas' },
  { href: '/dashboard/monitoreo', icon: 'dashboard', label: 'Monitoreo', color: '#F43F5E', permiso: 'monitoreo' },
  { href: '/dashboard/proyeccion', icon: 'historico', label: 'Proyección', color: '#8B5CF6', permiso: 'proyeccion' },
  { href: '/dashboard/ficha-seccional', icon: 'votantes', label: 'Ficha Seccional', color: '#06B6D4', permiso: 'ficha_seccional' },
  { href: '/dashboard/boletines', icon: 'boletines', label: 'Boletines IA', color: '#06B6D4', permiso: 'boletines' },
  { href: '/dashboard/historico-electoral', icon: 'historico', label: 'Histórico Electoral', color: '#F59E0B', permiso: 'historico_electoral' },
  { href: '/dashboard/inteligencia-electoral', icon: 'ia', label: 'Inteligencia Electoral', color: '#7C3AED', permiso: 'inteligencia_electoral' },
  { href: '/dashboard/llamadas', icon: 'llamadas', label: 'Llamadas', color: '#EC4899', permiso: 'llamadas' },
  { href: '/dashboard/candidato', icon: 'user', label: 'Candidato', color: '#D73216', permiso: 'candidato' },
  { href: '/dashboard/usuarios', icon: 'seguridad', label: 'Accesos', color: '#64748B', permiso: 'usuarios' },
  { href: '/dashboard/admin', icon: 'seguridad', label: 'Admin', color: '#7C3AED', permiso: 'admin' },
  { href: '/brigada/login', icon: 'app', label: 'App Brigada', color: '#D73216', permiso: 'app_brigada' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const visibleMenu = MENU_ITEMS.filter((item) =>
    user ? puedeAcceder(user.permisos, item.permiso, user.rol) : false
  );

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary-100">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-secondary-100">
        <p className="text-secondary-600">No hay sesión activa.</p>
        <Link href="/login" className="btn-primary px-6 py-2">Iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-100">
      {/* Top Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 h-16 bg-white shadow-md">
        <div className="relative flex h-full items-center justify-between px-4">
          {/* Logo a la izquierda */}
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/estrato.svg"
              alt="ESTRATO"
              width={120}
              height={48}
              priority
              className="h-9 w-auto"
            />
          </Link>

          {/* Menú centrado absolutamente - solo iconos */}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
            {visibleMenu.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <NavIcon
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  active={isActive}
                />
              );
            })}
          </div>

          {/* User-menu a la derecha */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium leading-tight text-secondary-800">{user.nombre || 'Usuario'}</p>
              <p className="text-xs leading-tight text-secondary-500">{user.rol}</p>
            </div>
            <button
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-100 text-secondary-600 transition hover:bg-red-50 hover:text-red-600"
              title="Cerrar sesión"
            >
              <Icon name="salir" size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}

function NavIcon({
  href,
  icon,
  label,
  color,
  active,
}: {
  href: string;
  icon: IconName;
  label: string;
  color: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
        active ? 'bg-secondary-100' : 'hover:bg-secondary-50'
      }`}
      title={label}
    >
      <Icon
        name={icon}
        size={22}
        style={{ color }}
        className="transition-transform duration-200 group-hover:scale-110"
      />

      {/* Tooltip */}
      <span
        className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-secondary-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ zIndex: 60 }}
      >
        {label}
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-secondary-900" />
      </span>
    </Link>
  );
}
