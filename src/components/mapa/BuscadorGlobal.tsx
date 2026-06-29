'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X, MapPin, ChevronRight } from 'lucide-react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import type { ResultadoGlobal, TipoResultadoGlobal } from '@/types/mapa';

interface Props {
  onSeleccionar: (resultado: ResultadoGlobal) => void;
}

const ETIQUETAS_TIPO: Record<TipoResultadoGlobal | string, { label: string; color: string }> = {
  capa: { label: 'Capa', color: '#D73216' },
  capa_feature: { label: 'Polígono', color: '#3B82F6' },
};

function etiquetaTipo(tipo: string) {
  return ETIQUETAS_TIPO[tipo] || { label: tipo.replace(/_/g, ' '), color: '#6B7280' };
}

const FILTROS: { key: string; label: string }[] = [
  { key: 'todos', label: 'Todas' },
  { key: 'capa', label: 'Capas' },
  { key: 'capa_feature', label: 'Polígonos' },
];

export default function BuscadorGlobal({ onSeleccionar }: Props) {
  const [q, setQ] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [resultados, setResultados] = useState<ResultadoGlobal[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    if (!q.trim() || q.trim().length < 3) {
      setResultados([]);
      return;
    }

    const t = setTimeout(async () => {
      setCargando(true);
      try {
        const res = await mapaApi.buscarGlobal(q.trim(), 20, tipoFiltro);
        const resultados = res.data?.resultados || [];
        console.log('[BuscadorGlobal] resultados:', resultados.length, resultados);
        setResultados(resultados);
        setAbierto(true);
      } catch (e: any) {
        console.error('[BuscadorGlobal] error:', e);
        setError(errorToString(e));
        setResultados([]);
      } finally {
        setCargando(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [q, tipoFiltro]);

  const seleccionar = (r: ResultadoGlobal) => {
    onSeleccionar(r);
    setAbierto(false);
    setQ(r.nombre);
  };

  const limpiar = () => {
    setQ('');
    setResultados([]);
    setAbierto(false);
    setError(null);
    refInput.current?.focus();
  };

  return (
    <div ref={refWrapper} className="relative w-full">
      <div className="relative flex items-center">
        <span className="pointer-events-none absolute left-3 flex items-center text-secondary-400">
          <Search size={18} />
        </span>
        <input
          ref={refInput}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar capa, municipio, colonia, sección..."
          className="h-10 w-full rounded-lg border border-secondary-200 bg-white pl-10 pr-9 text-sm shadow-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        {q && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center text-secondary-400 hover:text-secondary-600"
          >
            <X size={16} />
          </button>
        )}
        {cargando && (
          <div className="absolute right-9 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTipoFiltro(f.key)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              tipoFiltro === f.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-secondary-600 hover:bg-primary-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {abierto && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-secondary-200 bg-white py-2 shadow-xl">
          {cargando && resultados.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-xs text-secondary-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              Buscando...
            </div>
          )}

          {!cargando && resultados.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-secondary-500">
              {error ? (
                <span className="text-red-600">{error}</span>
              ) : q.trim().length >= 3 ? (
                <>
                  <MapPin size={20} className="mx-auto mb-2 text-secondary-300" />
                  No se encontraron resultados.
                </>
              ) : (
                <>
                  <MapPin size={20} className="mx-auto mb-2 text-secondary-300" />
                  Escribe al menos 3 caracteres para buscar.
                </>
              )}
            </div>
          )}

          {resultados.length > 0 && (
            <div className="px-2">
              {resultados.map((r) => {
                const meta = etiquetaTipo(r.tipo);
                return (
                  <button
                    key={`${r.tipo}-${r.id}`}
                    onClick={() => seleccionar(r)}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-primary-50"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase text-white"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-secondary-900">{r.nombre}</p>
                      <p className="truncate text-[10px] text-secondary-500 capitalize">
                        {meta.label}
                        {r.estado ? ` • ${r.estado}` : ''}
                        {r.municipio ? ` • ${r.municipio}` : ''}
                        {r.seccion ? ` • Sección ${r.seccion}` : ''}
                        {r.clave ? ` • Clave ${r.clave}` : ''}
                        {r.capaNombre ? ` • ${r.capaNombre}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-secondary-300" />
                  </button>
                );
              })}
              <p className="px-2 pb-1 pt-1 text-[10px] text-secondary-400">
                {resultados.length} resultado{resultados.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
