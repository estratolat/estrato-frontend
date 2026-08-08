'use client';

import { useState, useMemo } from 'react';
import { Search, MapPin, ChevronRight, X, Lock } from 'lucide-react';
import { GeoJSONCollection, CapaMapa } from '@/types/mapa';

interface ElementoCapa {
  id: string;
  featureId: string;
  nombre: string;
  subtexto?: string;
  feature: any;
  capaId: string;
  capaNombre: string;
  color?: string;
  bloqueado?: boolean;
}

interface Props {
  capaId?: string;
  capaNombre?: string;
  color?: string;
  capa?: CapaMapa;
  data?: GeoJSONCollection;
  capas?: { capa: CapaMapa; data?: GeoJSONCollection }[];
  onSeleccionar: (elemento: ElementoCapa) => void;
  onCerrar: () => void;
}

function extraerIdFeature(feature: any): string {
  const p = feature?.properties || {};
  return String(
    p._feature_id || p.id || p.ID || p.OBJECTID || p.objectid || p.FID || p.fid || p.GID || p.gid || p.seccion || p.clave || p.casilla || p.nombre || 'sin-id'
  );
}

function extraerNombreFeature(feature: any, capaNombre?: string): string {
  const p = feature?.properties || {};
  return String(
    p._feature_nombre || p.NOMBRE_VER || p.NOMBRE || p.nombre || p.name || p.NAME || p.seccion || p.casilla || p.clave || p.ubicacion || p.direccion || capaNombre || 'Elemento'
  );
}

function extraerSubtextoFeature(feature: any): string | undefined {
  const p = feature?.properties || {};
  const partes: string[] = [];
  if (p.seccion && !String(p._feature_nombre || p.nombre || '').includes(String(p.seccion))) partes.push(`Sección ${p.seccion}`);
  if (p.colonia) partes.push(p.colonia);
  if (p.ubicacion && p.ubicacion !== p.nombre) partes.push(p.ubicacion);
  if (p.direccion && p.direccion !== p.nombre) partes.push(p.direccion);
  if (p.tipo) partes.push(p.tipo);
  if (p.status) partes.push(p.status);
  return partes.length > 0 ? partes.join(' • ') : undefined;
}

export default function ExploradorCapa({
  capaId,
  capaNombre,
  color,
  capa,
  data,
  capas,
  onSeleccionar,
  onCerrar,
}: Props) {
  const [busqueda, setBusqueda] = useState('');

  const elementos = useMemo(() => {
    const lista: ElementoCapa[] = [];
    const capaSingle = capa || (data && capaId ? { id: capaId, nombre: capaNombre || 'Capa', color: color || '#3B82F6', tipo: 'custom', origen: 'propia', visible: true, bloqueada: false, orden: 0 } as CapaMapa : undefined);
    const fuentes = capas || (capaSingle && data ? [{ capa: capaSingle, data }] : []);

    fuentes.forEach(({ capa, data: d }) => {
      if (!d?.features?.length) return;
      d.features.forEach((feature: any) => {
        const id = extraerIdFeature(feature);
        const nombre = extraerNombreFeature(feature, capa.nombre);
        const subtexto = extraerSubtextoFeature(feature);
        const props = feature?.properties || {};
        const estilos = (capa.estilos as Record<string, any>) || {};
        const estiloFeature = estilos[id] || {};
        const bloqueado = Boolean(capa.bloqueada) || Boolean(props._feature_bloqueado) || Boolean(estiloFeature.bloqueado);
        lista.push({
          id: `${capa.id}-${id}`,
          featureId: id,
          nombre,
          subtexto,
          feature,
          capaId: capa.id,
          capaNombre: capa.nombre,
          color: capa.color,
          bloqueado,
        });
      });
    });

    // Ordenar alfabéticamente por nombre
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }));
  }, [capaId, capaNombre, data, capas]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return elementos;
    return elementos.filter((el) =>
      el.nombre.toLowerCase().includes(q) ||
      (el.subtexto || '').toLowerCase().includes(q) ||
      (el.capaNombre || '').toLowerCase().includes(q)
    );
  }, [elementos, busqueda]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-secondary-900">Explorar elementos</p>
          <p className="text-xs text-secondary-500">{elementos.length} elemento{elementos.length !== 1 ? 's' : ''} disponible{elementos.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onCerrar}
          className="flex h-7 w-7 items-center justify-center rounded-md text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400">
          <Search size={16} />
        </span>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar dentro de la capa..."
          className="h-9 w-full rounded-lg border border-secondary-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        {busqueda && (
          <button
            onClick={() => setBusqueda('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {filtrados.length === 0 ? (
          <div className="rounded-lg border border-dashed border-secondary-300 p-6 text-center">
            <MapPin size={20} className="mx-auto mb-2 text-secondary-300" />
            <p className="text-xs text-secondary-500">
              {busqueda ? 'Ningún elemento coincide con tu búsqueda.' : 'No hay elementos para explorar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtrados.map((el) => (
              <button
                key={el.id}
                onClick={() => onSeleccionar(el)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-primary-50"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: el.color || '#3B82F6' }}
                >
                  {el.nombre.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-xs font-semibold text-secondary-900">{el.nombre}</p>
                    {el.bloqueado && (
                      <span title="Bloqueado">
                        <Lock size={12} className="text-amber-600" />
                      </span>
                    )}
                  </div>
                  {el.subtexto && (
                    <p className="truncate text-[10px] text-secondary-500">{el.subtexto}</p>
                  )}
                </div>
                <ChevronRight size={14} className="shrink-0 text-secondary-300" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type { ElementoCapa };
