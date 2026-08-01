'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  MapPin,
  Calendar,
  Gift,
  Phone,
  TrendingUp,
} from 'lucide-react';
import { Icon, IconName } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import {
  votantesApi,
  crmApi,
  eventosApi,
  apoyosApi,
  llamadasApi,
  mapaApi,
} from '@/lib/api';

interface DashboardStats {
  votantes: { total: number; nuevos: number };
  mensajes: { total: number; pendientes: number };
  eventos: { total: number; proximos: number };
  apoyos: { total: number; mes: number };
  llamadas: { total: number; contestadas: number };
  territorio: { total: number };
}

const emptyStats: DashboardStats = {
  votantes: { total: 0, nuevos: 0 },
  mensajes: { total: 0, pendientes: 0 },
  eventos: { total: 0, proximos: 0 },
  apoyos: { total: 0, mes: 0 },
  llamadas: { total: 0, contestadas: 0 },
  territorio: { total: 0 },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, loading: authLoading } = useAuth();

  const tenant = user?.tenant;
  const candidatoFoto = tenant?.foto_url;
  const inicialesCandidato = (tenant?.nombre_candidato || 'C')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    // No cargar datos hasta que la sesión esté lista y haya un usuario
    if (authLoading || !user) return;

    const cargarDatos = async () => {
      setLoading(true);
      setError('');
      try {
        const [
          { data: votantesData },
          { data: crmData },
          { data: eventosData },
          { data: apoyosData },
          { data: llamadasData },
          { data: mapaData },
        ] = await Promise.all([
          votantesApi.getStats(),
          crmApi.getStats(),
          eventosApi.getProximos(),
          apoyosApi.getStats(),
          llamadasApi.getCampanas(),
          mapaApi.getEstadisticas('seccion'),
        ]);

        setStats({
          votantes: {
            total: votantesData?.total || 0,
            nuevos: votantesData?.nuevosHoy || 0,
          },
          mensajes: {
            total: crmData?.total || 0,
            pendientes: crmData?.pendientes || 0,
          },
          eventos: {
            total: eventosData?.total || 0,
            proximos: eventosData?.proximos?.length || 0,
          },
          apoyos: {
            total: apoyosData?.total || 0,
            mes: apoyosData?.mes || 0,
          },
          llamadas: {
            total: Array.isArray(llamadasData) ? llamadasData.length : 0,
            contestadas: 0,
          },
          territorio: {
            total: mapaData?.total_items || 0,
          },
        });
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el resumen de campaña');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [authLoading, user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center gap-4">
        {candidatoFoto ? (
          <img
            src={candidatoFoto}
            alt={tenant?.nombre_candidato || 'Candidato'}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-primary-200"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-lg font-bold ring-2 ring-primary-200">
            {inicialesCandidato}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{tenant?.nombre_candidato || 'Resumen de Campaña'}</h2>
          <p className="text-gray-600">
            {tenant?.cargo_busca || 'Vista general de tu operación territorial'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Acceso directo a App de Brigada */}
      <a
        href="/brigada/login"
        className="mb-8 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white shadow-lg transition hover:from-primary-700 hover:to-primary-800 hover:shadow-xl"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Icon name="app" size={24} />
          </div>
          <div>
            <p className="text-lg font-bold">App de Brigada</p>
            <p className="text-sm text-white/90">Captura votantes, líderes, apoyos y peticiones en campo</p>
          </div>
        </div>
        <div className="hidden items-center gap-2 font-medium sm:flex">
          <span>Abrir app</span>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </a>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Simpatizantes"
          value={stats.votantes.total.toLocaleString()}
          change={`+${stats.votantes.nuevos} hoy`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Mensajes"
          value={stats.mensajes.total.toLocaleString()}
          change={`${stats.mensajes.pendientes} pendientes`}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          title="Eventos"
          value={stats.eventos.total}
          change={`${stats.eventos.proximos} próximos`}
          icon={Calendar}
          color="purple"
        />
        <StatCard
          title="Apoyos"
          value={stats.apoyos.total}
          change={`+${stats.apoyos.mes} este mes`}
          icon={Gift}
          color="orange"
        />
      </div>

      {/* Second Row */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Llamadas Automáticas"
          value={stats.llamadas.total.toString()}
          change={stats.llamadas.total > 0 ? 'Campañas activas' : 'Sin campañas'}
          icon={Phone}
          color="red"
        />
        <StatCard
          title="Territorio"
          value={`${stats.territorio.total}`}
          change={stats.territorio.total > 0 ? 'secciones cargadas' : 'Sin secciones'}
          icon={MapPin}
          color="cyan"
        />
        <StatCard
          title="Tendencia"
          value="—"
          change="Próximamente"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Activity Sections */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card">
          <h3 className="mb-4 text-lg font-bold">Actividad Reciente</h3>
          <div className="rounded-lg bg-secondary-50 p-6 text-center">
            <p className="text-sm text-secondary-500">Sin actividad reciente registrada.</p>
            <p className="mt-1 text-xs text-secondary-400">
              La actividad de la brigada y el CRM se mostrará aquí próximamente.
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="mb-4 text-lg font-bold">Acciones Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            {user && puedeAcceder(user.permisos, 'app_brigada', user.rol) && (
              <QuickAction icon="app" label="App Brigada" href="/brigada/login" />
            )}
            {user && puedeAcceder(user.permisos, 'votantes', user.rol) && (
              <QuickAction icon="votantes" label="Nuevo Votante" href="/dashboard/votantes/nuevo" />
            )}
            {user && puedeAcceder(user.permisos, 'eventos', user.rol) && (
              <QuickAction icon="eventos" label="Crear Evento" href="/dashboard/eventos/nuevo" />
            )}
            {user && puedeAcceder(user.permisos, 'mapa', user.rol) && (
              <QuickAction icon="apoyos" label="Registrar Apoyo" href="/dashboard/mapa" />
            )}
            {user && puedeAcceder(user.permisos, 'boletines', user.rol) && (
              <QuickAction icon="boletines" label="Generar Boletín" href="/dashboard/boletines" />
            )}
            {user && puedeAcceder(user.permisos, 'llamadas', user.rol) && (
              <QuickAction icon="llamadas" label="Campaña de Llamadas" href="/dashboard/llamadas/nueva" />
            )}
            {user && puedeAcceder(user.permisos, 'candidato', user.rol) && (
              <QuickAction icon="user" label="Perfil Candidato" href="/dashboard/candidato" />
            )}
            {user && puedeAcceder(user.permisos, 'usuarios', user.rol) && (
              <QuickAction icon="seguridad" label="Accesos" href="/dashboard/usuarios" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Components

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change: string;
  icon: React.ElementType;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="mt-1 text-sm text-gray-500">{change}</p>
        </div>
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  href,
}: {
  icon: IconName;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 rounded-lg bg-secondary-50 p-4 text-center transition-colors hover:bg-primary-50 hover:text-primary-600"
    >
      <Icon name={icon} size={24} />
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}
