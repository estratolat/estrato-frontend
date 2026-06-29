'use client';

import { useState } from 'react';
import { X, Users, Star, Package, CalendarDays, MessageSquare, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DetalleTerritorial, ItemTerritorial, TipoResultadoGlobal } from '@/types/mapa';

interface Props {
  detalle: DetalleTerritorial;
  onCerrar: () => void;
}

type TabKey = 'votantes' | 'lideres' | 'apoyos' | 'eventos' | 'peticiones';

const ETIQUETAS_TIPO: Record<TipoResultadoGlobal | string, { label: string; color: string; icon: any }> = {
  capa: { label: 'Capa', color: '#D73216', icon: MapPin },
};

const TABS: { key: TabKey; label: string; color: string; icon: any }[] = [
  { key: 'votantes', label: 'Votantes', color: '#EF4444', icon: Users },
  { key: 'lideres', label: 'Líderes', color: '#383745', icon: Star },
  { key: 'apoyos', label: 'Apoyos', color: '#F59E0B', icon: Package },
  { key: 'eventos', label: 'Eventos', color: '#D73216', icon: CalendarDays },
  { key: 'peticiones', label: 'Peticiones', color: '#06B6D4', icon: MessageSquare },
];

function formatearFecha(fecha?: string) {
  if (!fecha) return '';
  try {
    return format(new Date(fecha), "d 'de' MMM, h:mm a", { locale: es });
  } catch {
    return fecha;
  }
}

function formatearValor(v: any) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return String(v);
}

function renderItem(tab: TabKey, item: ItemTerritorial) {
  switch (tab) {
    case 'votantes':
      return (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-secondary-900">{item.nombre || 'Simpatizante'}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-secondary-500">
            {item.telefono && <span>{item.telefono}</span>}
            {item.seccion_electoral && <span>Sección {item.seccion_electoral}</span>}
            {item.colonia && <span>{item.colonia}</span>}
            {item.nivel_apoyo && (
              <span className="font-medium" style={{ color: COLOR_APOYO[Number(item.nivel_apoyo)] || '#9CA3AF' }}>
                Nivel {item.nivel_apoyo}
              </span>
            )}
          </div>
        </div>
      );
    case 'lideres':
      return (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-secondary-900">{item.votante_nombre || item.nombre || 'Líder'}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-secondary-500">
            {item.votante_telefono && <span>{item.votante_telefono}</span>}
            {item.votante_seccion && <span>Sección {item.votante_seccion}</span>}
            {item.score != null && <span className="font-medium text-primary-600">{item.score} pts</span>}
          </div>
        </div>
      );
    case 'apoyos':
      return (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-secondary-900 capitalize">{item.tipo_apoyo || 'Apoyo'}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-secondary-500">
            {item.votante_nombre && <span>A: {item.votante_nombre}</span>}
            {item.fecha_entrega && <span>{formatearFecha(item.fecha_entrega)}</span>}
            {item.cantidad && <span>Cant. {item.cantidad}</span>}
          </div>
        </div>
      );
    case 'eventos':
      return (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-secondary-900">{item.nombre || 'Evento'}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-secondary-500">
            {item.direccion && <span>{item.direccion}</span>}
            {item.fecha_inicio && <span>{formatearFecha(item.fecha_inicio)}</span>}
            {item.status && <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700 capitalize">{item.status}</span>}
          </div>
        </div>
      );
    case 'peticiones':
      return (
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-secondary-900">{item.titulo || 'Petición'}</p>
          <div className="flex flex-wrap gap-x-3 text-[11px] text-secondary-500">
            {item.votante_nombre && <span>{item.votante_nombre}</span>}
            {item.categoria && <span className="capitalize">{item.categoria}</span>}
            {item.prioridad && <span className="font-medium capitalize" style={{ color: COLOR_PETICION[item.prioridad] || '#6B7280' }}>{item.prioridad}</span>}
            {item.estatus && <span className="rounded bg-secondary-100 px-1.5 py-0.5 text-[10px] font-medium capitalize">{item.estatus}</span>}
          </div>
        </div>
      );
  }
}

const COLOR_APOYO: Record<number, string> = {
  5: '#22C55E',
  4: '#84CC16',
  3: '#F59E0B',
  2: '#F97316',
  1: '#EF4444',
};

const COLOR_PETICION: Record<string, string> = {
  baja: '#22C55E',
  media: '#F59E0B',
  alta: '#F97316',
  critica: '#EF4444',
};

export default function FichaTerritorial({ detalle, onCerrar }: Props) {
  const [tab, setTab] = useState<TabKey>('votantes');
  const meta = ETIQUETAS_TIPO[detalle.tipo] || { label: detalle.tipo, color: '#6B7280', icon: MapPin };
  const Icono = meta.icon;
  const datos = detalle.datos_oficiales || {};
  const entries = Object.entries(datos)
    .map(([k, v]) => ({ label: LABELS_OFICIAL[k] || k.replace(/_/g, ' '), value: formatearValor(v) }))
    .filter((f) => f.value != null);

  return (
    <div className="absolute bottom-4 right-4 top-24 z-[500] flex w-[92vw] max-w-md flex-col overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-2xl">
      <div className="shrink-0 border-b border-secondary-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: meta.color }}
            >
              <Icono size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-secondary-900" title={detalle.nombre}>
                {detalle.nombre}
              </p>
              <p className="text-xs font-medium uppercase tracking-wide text-secondary-500">{meta.label}</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
          >
            <X size={18} />
          </button>
        </div>

        {entries.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {entries.slice(0, 4).map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-secondary-50 px-2.5 py-1.5">
                <p className="text-[10px] font-semibold uppercase text-secondary-400">{label}</p>
                <p className="text-sm font-semibold text-secondary-900">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 border-b border-secondary-100 bg-secondary-50/60">
        <div className="flex overflow-x-auto p-2">
          {TABS.map((t) => {
            const count = detalle.resumen[t.key]?.count ?? 0;
            const activa = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                  activa ? 'bg-white text-secondary-900 shadow-sm' : 'text-secondary-500 hover:bg-white/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon size={14} style={{ color: t.color }} />
                  <span>{t.label}</span>
                </div>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    activa ? 'bg-primary-100 text-primary-700' : 'bg-secondary-200 text-secondary-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {(() => {
          const seccion = detalle.resumen[tab];
          if (!seccion || seccion.count === 0) {
            return (
              <div className="flex h-full flex-col items-center justify-center text-center text-secondary-500">
                <div className="mb-2 rounded-full bg-secondary-50 p-3">
                  {(() => {
                    const Icon = TABS.find((t) => t.key === tab)?.icon || Users;
                    return <Icon size={24} className="text-secondary-300" />;
                  })()}
                </div>
                <p className="text-sm font-medium">No hay {TABS.find((t) => t.key === tab)?.label.toLowerCase()} en este territorio</p>
              </div>
            );
          }
          return (
            <div className="space-y-2">
              {seccion.items.map((item: ItemTerritorial) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-secondary-100 bg-white p-2.5 transition hover:border-primary-200 hover:shadow-sm"
                >
                  {renderItem(tab, item)}
                </div>
              ))}
              {seccion.count > seccion.items.length && (
                <p className="py-1 text-center text-[11px] text-secondary-400">
                  +{seccion.count - seccion.items.length} más — ajusta el filtro territorial para verlos
                </p>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

const LABELS_OFICIAL: Record<string, string> = {
  padron_2024: 'Padrón 2024',
  lista_nominal_2024: 'Lista nominal',
  distrito_federal: 'Distrito federal',
  distrito_local: 'Distrito local',
  partido_ganador: 'Ganador hist.',
  votos_ganador: 'Votos ganador',
  votos_totales: 'Votos totales',
  participacion_pct: 'Participación',
};
