'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, MapPin, ExternalLink, ChevronRight, AlertCircle, Crosshair } from 'lucide-react';
import { casillasApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import type { Casilla } from '@/types';
import type { ResultadoGlobal } from '@/types/mapa';

interface Props {
  onSeleccionar: (resultado: ResultadoGlobal) => void;
  onUbicar?: (casilla: Casilla) => void;
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function tieneCoordenadas(c: Casilla): boolean {
  return !!c.coordenadas && typeof c.coordenadas.lat === 'number' && typeof c.coordenadas.lng === 'number';
}

export default function BuscadorCasillasInline({ onSeleccionar, onUbicar }: Props) {
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(true);
  const refInput = useRef<HTMLInputElement>(null);
  const refWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (refWrapper.current && !refWrapper.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    casillasApi
      .getAll({ limit: 10000 })
      .then((res) => {
        if (cancelado) return;
        setCasillas(res.data || []);
      })
      .catch((e) => {
        if (cancelado) return;
        console.error('[BuscadorCasillasInline] error cargando:', e);
        setError(errorToString(e));
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => { cancelado = true; };
  }, []);

  const filtradas = useMemo(() => {
    const termino = normalizar(q);
    if (!termino) return casillas;
    return casillas.filter((c) => {
      const texto = [
        c.seccion,
        c.numero,
        c.ubicacion,
        c.direccion,
        c.referencia,
        c.tipo,
      ]
        .filter(Boolean)
        .join(' ');
      return normalizar(texto).includes(termino);
    });
  }, [casillas, q]);

  const seleccionar = (c: Casilla) => {
    const coords = c.coordenadas;
    const resultado: ResultadoGlobal = {
      id: `casilla-${c.id}`,
      tipo: 'casilla',
      nombre: `Casilla ${c.tipo}${c.numero ? ` ${c.numero}` : ''} - Sección ${c.seccion}`,
      descripcion: c.ubicacion || c.direccion || 'Sin ubicación',
      seccion: c.seccion,
      color: '#DB2777',
      url: `/dashboard/casillas/${c.id}`,
      bbox: coords ? [coords.lng, coords.lat, coords.lng, coords.lat] : undefined,
      geometry: coords
        ? { type: 'Point', coordinates: [coords.lng, coords.lat] }
        : undefined,
    };
    onSeleccionar(resultado);
    setAbierto(false);
    setQ(resultado.nombre);
  };

  const limpiar = () => {
    setQ('');
    setAbierto(true);
    refInput.current?.focus();
  };

  const editar = (e: React.MouseEvent, id?: string) => {
    e.stopPropagation();
    if (!id) return;
    window.open(`/dashboard/casillas/${id}`, '_blank');
  };

  const ubicar = (e: React.MouseEvent, c: Casilla) => {
    e.stopPropagation();
    if (!onUbicar) return;
    onUbicar(c);
    setAbierto(false);
  };

  const sinCoordsCount = useMemo(() => filtradas.filter((c) => !tieneCoordenadas(c)).length, [filtradas]);

  return (
    <div ref={refWrapper} className="relative mt-2">
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-2.5 flex items-center text-secondary-400">
          <Search size={16} />
        </span>
        <input
          ref={refInput}
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
          onFocus={() => setAbierto(true)}
          placeholder="Filtrar casillas por sección, número, ubicación, dirección..."
          className="h-9 w-full rounded-lg border border-secondary-200 bg-white pl-9 pr-8 text-sm shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        {q && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-secondary-400 hover:text-secondary-600"
          >
            <X size={15} />
          </button>
        )}
        {cargando && (
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        )}
      </div>

      {abierto && (
        <div className="mt-1.5 max-h-[320px] overflow-y-auto rounded-lg border border-secondary-200 bg-white py-1.5 shadow-sm">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 text-xs text-red-600">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          {cargando && filtradas.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-secondary-500">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              Cargando casillas...
            </div>
          )}

          {!cargando && filtradas.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-secondary-500">
              <MapPin size={18} className="mx-auto mb-1.5 text-secondary-300" />
              No se encontraron casillas.
            </div>
          )}

          {filtradas.length > 0 && (
            <div className="px-1.5">
              <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-secondary-400">
                {filtradas.length} de {casillas.length} casillas
                {sinCoordsCount > 0 && (
                  <span className="ml-1 text-amber-600">({sinCoordsCount} sin ubicar)</span>
                )}
              </p>
              {filtradas.map((c) => {
                const ubicada = tieneCoordenadas(c);
                return (
                  <div
                    key={c.id}
                    className="group flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left transition hover:bg-primary-50"
                    onClick={() => seleccionar(c)}
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white ${ubicada ? 'bg-[#DB2777]' : 'bg-amber-400'}`}>
                      {ubicada ? 'CA' : '??'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-secondary-900">
                        Sección {c.seccion} • {c.tipo}{c.numero ? ` ${c.numero}` : ''}
                      </p>
                      <p className="truncate text-[10px] text-secondary-500">
                        {c.ubicacion || c.direccion || 'Sin ubicación'}
                        {!ubicada && <span className="ml-1 text-amber-600">(sin coordenadas)</span>}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Editar casilla"
                      onClick={(e) => editar(e, c.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary-400 opacity-0 transition hover:bg-secondary-100 hover:text-secondary-700 group-hover:opacity-100"
                    >
                      <ExternalLink size={14} />
                    </button>
                    {!ubicada && onUbicar && (
                      <button
                        type="button"
                        title="Ubicar en mapa"
                        onClick={(e) => ubicar(e, c)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-500 opacity-0 transition hover:bg-amber-100 hover:text-amber-700 group-hover:opacity-100"
                      >
                        <Crosshair size={14} />
                      </button>
                    )}
                    <ChevronRight size={14} className="shrink-0 text-secondary-300" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
