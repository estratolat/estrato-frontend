'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder, esSoloAppBrigada } from '@/lib/permisos';
import {
  Squares2X2Icon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  MapPinIcon,
  EyeIcon,
  MapIcon,
  ChartBarSquareIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  DocumentTextIcon,
  UserIcon,
  KeyIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  PhoneIcon,
} from '@heroicons/react/24/solid';

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

type MenuItem = { href: string; icon: IconComponent; label: string; color: string; permiso: string; externo?: boolean; grupo: string };

// Flag para activar módulos avanzados/poco usados. Cambiar a true si se retoman.
const HABILITAR_MODULOS_AVANZADOS = false;

const MENU_ITEMS: MenuItem[] = [
  // Operación diaria
  { href: '/dashboard', icon: Squares2X2Icon, label: 'Dashboard', color: '#B91C1C', permiso: 'dashboard', grupo: 'operacion' },
  { href: '/dashboard/votantes', icon: UsersIcon, label: 'Votantes', color: '#2563EB', permiso: 'votantes', grupo: 'operacion' },
  { href: '/dashboard/crm', icon: ChatBubbleLeftRightIcon, label: 'CRM', color: '#16A34A', permiso: 'crm', grupo: 'operacion' },
  { href: '/dashboard/llamadas', icon: PhoneIcon, label: 'Llamadas', color: '#9F1239', permiso: 'llamadas', grupo: 'operacion' },
  { href: '/dashboard/peticiones', icon: ClipboardDocumentCheckIcon, label: 'Operaciones', color: '#06B6D4', permiso: 'peticiones', grupo: 'operacion' },
  { href: '/dashboard/eventos', icon: CalendarDaysIcon, label: 'Eventos', color: '#7C3AED', permiso: 'eventos', grupo: 'operacion' },
  { href: '/dashboard/encuestas', icon: ClipboardDocumentListIcon, label: 'Encuestas', color: '#D97706', permiso: 'encuestas', grupo: 'operacion' },
  { href: '/dashboard/casillas', icon: MapPinIcon, label: 'Casillas', color: '#DB2777', permiso: 'casillas', grupo: 'operacion' },
  { href: '/dashboard/informes-ine', icon: ClipboardDocumentCheckIcon, label: 'Informes INE', color: '#7C2D12', permiso: 'informes_ine', grupo: 'operacion' },
  { href: '/dashboard/monitoreo', icon: EyeIcon, label: 'Monitoreo', color: '#0891B2', permiso: 'monitoreo', grupo: 'operacion' },

  // Territorio e inteligencia
  { href: '/dashboard/mapa', icon: MapIcon, label: 'Mapa Territorial', color: '#EA580C', permiso: 'mapa', grupo: 'inteligencia' },
  { href: '/dashboard/historico-electoral', icon: ChartBarSquareIcon, label: 'Histórico Electoral', color: '#4338CA', permiso: 'historico_electoral', grupo: 'inteligencia' },
  { href: '/dashboard/inteligencia-electoral', icon: SparklesIcon, label: 'Inteligencia Electoral', color: '#9333EA', permiso: 'inteligencia_electoral', grupo: 'inteligencia' },
  { href: '/dashboard/proyeccion', icon: ArrowTrendingUpIcon, label: 'Proyección', color: '#0F766E', permiso: 'proyeccion', grupo: 'inteligencia' },
  { href: '/dashboard/ficha-seccional', icon: DocumentTextIcon, label: 'Ficha Seccional', color: '#C2410C', permiso: 'ficha_seccional', grupo: 'inteligencia' },
  { href: '/dashboard/opositores', icon: UserGroupIcon, label: 'Opositores', color: '#DC2626', permiso: 'opositores', grupo: 'inteligencia' },
  { href: '/dashboard/boletines', icon: DocumentTextIcon, label: 'Boletines IA', color: '#0369A1', permiso: 'boletines', grupo: 'inteligencia' },
  { href: '/dashboard/data', icon: ChartBarSquareIcon, label: 'Data', color: '#0891B2', permiso: 'data', grupo: 'inteligencia' },

  // Configuración del proyecto
  { href: '/dashboard/candidato', icon: UserIcon, label: 'Candidato', color: '#BE185D', permiso: 'candidato', grupo: 'configuracion' },
  { href: '/dashboard/usuarios', icon: KeyIcon, label: 'Accesos', color: '#475569', permiso: 'usuarios', grupo: 'configuracion' },
  { href: '/dashboard/admin', icon: ShieldCheckIcon, label: 'Admin', color: '#1E40AF', permiso: 'admin', grupo: 'configuracion' },

  // Módulos avanzados desactivados por defecto
  ...(HABILITAR_MODULOS_AVANZADOS
    ? [
        // Aquí se pueden agregar módulos experimentales sin mostrarlos aún en producción
      ]
    : []),

  // App brigada (link externo)
  { href: '/brigada/login', icon: DevicePhoneMobileIcon, label: 'App Brigada', color: '#000000', permiso: 'app_brigada', externo: true, grupo: 'brigada' },
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
    if (loading || typeof window === 'undefined') return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Los usuarios de solo app brigada no tienen nada que hacer en el dashboard
    if (esSoloAppBrigada(user.permisos, user.rol)) {
      router.replace('/brigada');
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
    // Redirigir limpiamente; mientras tanto mostrar spinner para evitar parpadeo
    return (
      <div className="flex h-screen items-center justify-center bg-secondary-100">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
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
            {visibleMenu.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const cambioGrupo = index > 0 && item.grupo !== visibleMenu[index - 1].grupo;
              return (
                <>
                  {cambioGrupo && (
                    <span key={`sep-${item.grupo}`} className="mx-1 h-6 w-px bg-secondary-200" />
                  )}
                  <NavIcon
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    color={item.color}
                    active={isActive}
                    externo={item.externo}
                  />
                </>
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
        {pathname === '/dashboard/mapa' ? (
          <div className="fixed inset-x-0 top-16 h-[calc(100vh-4rem)] overflow-hidden">{children}</div>
        ) : (
          <div className="p-4 md:p-6">{children}</div>
        )}
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
  externo,
}: {
  href: string;
  icon: IconComponent;
  label: string;
  color: string;
  active: boolean;
  externo?: boolean;
}) {
  const IconComp = icon;
  const classes = `group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${
    active ? 'bg-secondary-100' : 'hover:bg-secondary-50'
  }`;
  const content = (
    <>
      <IconComp
        className="h-6 w-6 transition-transform duration-200 group-hover:scale-110"
        style={{ color }}
      />

      {/* Tooltip único (sin title nativo duplicado) */}
      <span
        className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-secondary-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100"
        style={{ zIndex: 60 }}
      >
        {label}
        <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-secondary-900" />
      </span>
    </>
  );

  if (externo) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {content}
    </Link>
  );
}
