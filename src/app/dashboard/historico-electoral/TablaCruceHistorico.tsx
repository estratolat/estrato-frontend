'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Castle, Eye, Flag, Swords, TrendingDown, TrendingUp } from 'lucide-react';

interface AnioData {
  votos_bloque: number;
  pct_bloque: number;
  gano_bloque: boolean;
  total_votos: number;
}

interface SeccionCruce {
  seccion: string;
  clasificacion: string;
  veces_gana: number;
  total_anios: number;
  siempre_gana: boolean;
  siempre_pierde: boolean;
  tendencia: number;
  anios: Record<string, AnioData>;
  ganador_historico_dominante?: string;
}

interface Props {
  cruce: SeccionCruce[];
  anios: number[];
  bloque?: string[];
}

type FiltroClasificacion = 'TODOS' | 'BASTION' | 'VOLATIL_GANA' | 'VOLATIL_PIERDE' | 'RIVAL' | 'MEJORAN' | 'EMPEORAN';

const COLOR_CLASIFICACION: Record<string, string> = {
  BASTION: 'bg-green-100 text-green-700 border-green-200',
  VOLATIL_GANA: 'bg-lime-100 text-lime-700 border-lime-200',
  VOLATIL_PIERDE: 'bg-orange-100 text-orange-700 border-orange-200',
  RIVAL: 'bg-red-100 text-red-700 border-red-200',
};

const LABEL_CLASIFICACION: Record<string, string> = {
  BASTION: 'Bastión',
  VOLATIL_GANA: 'Volátil - gana',
  VOLATIL_PIERDE: 'Volátil - pierde',
  RIVAL: 'Territorio rival',
};

const ICONO_CLASIFICACION: Record<string, React.ElementType> = {
  BASTION: Castle,
  VOLATIL_GANA: TrendingUp,
  VOLATIL_PIERDE: Swords,
  RIVAL: Flag,
};

export default function TablaCruceHistorico({ cruce, anios, bloque }: Props) {
  const [filtro, setFiltro] = useState<FiltroClasificacion>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    return cruce.filter((s) => {
      const coincideBusqueda = s.seccion.includes(busqueda.trim());
      if (!coincideBusqueda) return false;
      if (filtro === 'TODOS') return true;
      if (filtro === 'MEJORAN') return s.tendencia > 0;
      if (filtro === 'EMPEORAN') return s.tendencia < 0;
      return s.clasificacion === filtro;
    });
  }, [cruce, filtro, busqueda]);

  const aniosOrdenados = useMemo(() => [...anios].sort((a, b) => b - a), [anios]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'TODOS', label: 'Todas' },
            { key: 'BASTION', label: 'Bastiones' },
            { key: 'VOLATIL_GANA', label: 'Volátiles ganan' },
            { key: 'VOLATIL_PIERDE', label: 'Volátiles pierden' },
            { key: 'RIVAL', label: 'Rivales' },
            { key: 'MEJORAN', label: 'Mejoran' },
            { key: 'EMPEORAN', label: 'Empeoran' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key as FiltroClasificacion)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filtro === f.key
                  ? 'bg-primary-600 text-white'
                  : 'border border-secondary-200 bg-white text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar sección..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-field w-full sm:w-48 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-secondary-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary-50 text-xs font-semibold text-secondary-600">
            <tr>
              <th className="px-3 py-2">Sección</th>
              <th className="px-3 py-2">Clasificación</th>
              {aniosOrdenados.map((a) => (
                <th key={a} className="px-3 py-2 text-right">Votos {a}</th>
              ))}
              <th className="px-3 py-2 text-right">% último</th>
              <th className="px-3 py-2 text-right">Tendencia</th>
              <th className="px-3 py-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {filtrados.map((s) => {
              const ultimoAnio = aniosOrdenados[0];
              const pctUltimo = s.anios[ultimoAnio]?.pct_bloque ?? 0;
              const Icono = ICONO_CLASIFICACION[s.clasificacion] || Eye;
              return (
                <tr key={s.seccion} className="hover:bg-secondary-50">
                  <td className="px-3 py-2 font-medium text-secondary-900">{s.seccion}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${COLOR_CLASIFICACION[s.clasificacion] || 'bg-secondary-100 text-secondary-700'}`}
                    >
                      <Icono size={12} />
                      {LABEL_CLASIFICACION[s.clasificacion] || s.clasificacion}
                    </span>
                    <span className="ml-2 text-xs text-secondary-500">{s.veces_gana}/{s.total_anios}</span>
                  </td>
                  {aniosOrdenados.map((a) => {
                    const d = s.anios[a];
                    return (
                      <td key={a} className="px-3 py-2 text-right">
                        {d ? (
                          <span className={d.gano_bloque ? 'font-semibold text-green-700' : 'text-secondary-700'}>
                            {d.votos_bloque.toLocaleString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-right">
                    <span className="font-medium text-secondary-900">{pctUltimo}%</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`inline-flex items-center gap-0.5 font-medium ${
                        s.tendencia > 0 ? 'text-green-700' : s.tendencia < 0 ? 'text-red-700' : 'text-secondary-500'
                      }`}
                    >
                      {s.tendencia > 0 ? <ArrowUpRight size={14} /> : s.tendencia < 0 ? <ArrowDownRight size={14} /> : null}
                      {`${s.tendencia > 0 ? '+' : ''}${s.tendencia.toLocaleString()}`}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a
                      href={`/dashboard/ficha-seccional/${s.seccion.replace(/^0+/, '')}`}
                      className="inline-flex items-center gap-1 rounded p-1 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-900"
                      title="Ver ficha seccional"
                    >
                      <Eye size={16} />
                    </a>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5 + aniosOrdenados.length} className="px-3 py-6 text-center text-sm text-secondary-500">
                  No hay secciones que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-secondary-500">
        <span>Mostrando {filtrados.length} de {cruce.length} secciones</span>
        {bloque && bloque.length > 0 && <span>Bloque analizado: {bloque.join(', ')}</span>}
      </div>
    </div>
  );
}
