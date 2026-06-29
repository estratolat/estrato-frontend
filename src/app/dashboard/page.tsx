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
  AlertTriangle,
} from 'lucide-react';
import { Icon, IconName } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';

// Mock data - reemplazar con API real
const mockStats = {
  votantes: { total: 2847, nuevos: 156 },
  mensajes: { total: 1243, pendientes: 23 },
  eventos: { total: 12, proximos: 3 },
  apoyos: { total: 456, mes: 89 },
  llamadas: { total: 800, contestadas: 496 },
  territorio: { recorrido: '68%', secciones: 45 },
};

export default function DashboardPage() {
  const [stats, setStats] = useState(mockStats);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Resumen de Campaña</h2>
        <p className="text-gray-600">Vista general de tu operación territorial</p>
      </div>

      {/* Acceso directo a App de Brigada */}
      <a
        href="/brigada/login"
        className="mb-8 flex items-center justify-between rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white shadow-lg transition hover:shadow-xl hover:from-primary-700 hover:to-primary-800"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Icon name="app" size={24} />
          </div>
          <div>
            <p className="font-bold text-lg">App de Brigada</p>
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
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Simpatizantes"
          value={stats.votantes.total.toLocaleString()}
          change={`+${stats.votantes.nuevos} esta semana`}
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
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Llamadas Automáticas"
          value={`${stats.llamadas.contestadas}/${stats.llamadas.total}`}
          change={`${Math.round((stats.llamadas.contestadas / stats.llamadas.total) * 100)}% contestación`}
          icon={Phone}
          color="red"
        />
        <StatCard
          title="Territorio"
          value={stats.territorio.recorrido}
          change={`${stats.territorio.secciones} secciones`}
          icon={MapPin}
          color="cyan"
        />
        <StatCard
          title="Tendencia"
          value="↗ 12%"
          change="vs mes anterior"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Activity Sections */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            <ActivityItem
              type="votante"
              message="Nuevo simpatizante registrado"
              detail="Juan Pérez - Sección 1234"
              time="2 min"
            />
            <ActivityItem
              type="mensaje"
              message="Nuevo mensaje de WhatsApp"
              detail="Quiere ser voluntario"
              time="5 min"
            />
            <ActivityItem
              type="apoyo"
              message="Apoyo entregado"
              detail="Despensa - Colonia Centro"
              time="15 min"
            />
            <ActivityItem
              type="evento"
              message="Asistencia a evento"
              detail="Mitin de inicio - +45 asistentes"
              time="1 hora"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-bold mb-4">Acciones Rápidas</h3>
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
              <QuickAction icon="boletines" label="Generar Boletín" href="/dashboard/boletines/nuevo" />
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

      {/* Alertas */}
      <div className="mt-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle size={24} className="text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Alerta:</span> Hay 23 mensajes de WhatsApp
                sin responder en los últimos 30 minutos.
              </p>
            </div>
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
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{change}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({
  type,
  message,
  detail,
  time,
}: {
  type: string;
  message: string;
  detail: string;
  time: string;
}) {
  const iconMap: Record<string, { name: IconName; color: string }> = {
    votante: { name: 'user', color: 'bg-blue-50 text-blue-600' },
    mensaje: { name: 'crm', color: 'bg-green-50 text-green-600' },
    apoyo: { name: 'apoyos', color: 'bg-orange-50 text-orange-600' },
    evento: { name: 'eventos', color: 'bg-purple-50 text-purple-600' },
  };

  const config = iconMap[type] || { name: 'user', color: 'bg-secondary-100 text-secondary-600' };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary-50 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
        <Icon name={config.name} size={16} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{message}</p>
        <p className="text-secondary-500 text-xs">{detail}</p>
      </div>
      <span className="text-secondary-400 text-xs">{time}</span>
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
      className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary-50 hover:bg-primary-50 hover:text-primary-600 transition-colors text-center"
    >
      <Icon name={icon} size={24} />
      <span className="text-sm font-medium">{label}</span>
    </a>
  );
}
