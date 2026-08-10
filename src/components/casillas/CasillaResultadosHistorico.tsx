'use client';

import { useEffect, useState } from 'react';
import { casillasApi } from '@/lib/api';
import {
  normalizarDesglose,
  type DesglosePartidosInput,
} from '@/lib/historico-electoral';
import { Trophy, Vote, Users, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  casillaId: string;
}

interface ResultadoItem {
  casilla: string;
  tipo_casilla: string;
  tipo_casilla_label: string;
  ext_contigua: string | null;
  lista_nominal: number | null;
  total_votos: number | null;
  votos_validos: number | null;
  votos_nulos: number | null;
  votos_no_reg: number | null;
  participacion_pct: number | null;
  partido_ganador: string | null;
  votos_ganador: number | null;
  desglose_partidos: DesglosePartidosInput;
}

interface Eleccion {
  anio: number;
  tipo_eleccion: string;
  casillas: ResultadoItem[];
  totales: {
    lista_nominal: number;
    total_votos: number;
    votos_validos: number;
    votos_nulos: number;
    votos_no_reg: number;
  };
  ganador: { partido: string; votos: number; tipo: string } | null;
}

const labelsTipoEleccion: Record<string, string> = {
  ayuntamiento: 'Ayuntamiento',
  diputado_local: 'Diputado Local',
  diputado_federal: 'Diputado Federal',
  senador: 'Senador',
  gobernador: 'Gobernador',
  presidente_republica: 'Presidente de la República',
};

function fmt(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('es-MX');
}

function pct(n?: number | null) {
  if (n === null || n === undefined) return '—';
  return `${n.toFixed(2)}%`;
}

export default function CasillaResultadosHistorico({ casillaId }: Props) {
  const [data, setData] = useState<{ elecciones: Eleccion[]; total_resultados: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    casillasApi.getResultadosHistoricos(casillaId)
      .then(({ data }) => {
        if (cancelled) return;
        setData(data);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Error al cargar histórico');
      })
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, [casillaId]);

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!data || data.elecciones.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-8 text-center text-secondary-600">
        <ScrollText size={32} className="text-secondary-400" />
        <p className="text-sm">No hay resultados históricos cargados para la sección de esta casilla.</p>
      </div>
    );
  }

  const toggle = (key: string) => setAbiertas((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-secondary-900">Histórico electoral</h3>
        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700">
          {data.total_resultados} resultados
        </span>
      </div>

      {data.elecciones.map((elec) => {
        const key = `${elec.anio}-${elec.tipo_eleccion}`;
        const abierta = abiertas[key] ?? true;
        const label = labelsTipoEleccion[elec.tipo_eleccion] || elec.tipo_eleccion;

        return (
          <div key={key} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary-50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  <Vote size={20} />
                </div>
                <div>
                  <p className="font-bold text-secondary-900">{elec.anio} • {label}</p>
                  <p className="text-xs text-secondary-500">{elec.casillas.length} casillas históricas en la sección</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {elec.ganador && (
                  <div className="hidden items-center gap-1.5 text-xs font-medium text-secondary-700 sm:flex">
                    <Trophy size={14} className="text-amber-500" />
                    {elec.ganador.partido}: {fmt(elec.ganador.votos)}
                  </div>
                )}
                {abierta ? <ChevronUp size={18} className="text-secondary-400" /> : <ChevronDown size={18} className="text-secondary-400" />}
              </div>
            </button>

            {abierta && (
              <div className="border-t border-secondary-100">
                <div className="grid gap-3 bg-secondary-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users size={16} className="text-secondary-400" />
                    <div>
                      <p className="text-xs text-secondary-500">Lista nominal</p>
                      <p className="font-semibold text-secondary-900">{fmt(elec.totales.lista_nominal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Vote size={16} className="text-secondary-400" />
                    <div>
                      <p className="text-xs text-secondary-500">Votos totales</p>
                      <p className="font-semibold text-secondary-900">{fmt(elec.totales.total_votos)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ScrollText size={16} className="text-secondary-400" />
                    <div>
                      <p className="text-xs text-secondary-500">Votos nulos</p>
                      <p className="font-semibold text-secondary-900">{fmt(elec.totales.votos_nulos)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy size={16} className="text-amber-500" />
                    <div>
                      <p className="text-xs text-secondary-500">Ganador en la sección</p>
                      <p className="font-semibold text-secondary-900">
                        {elec.ganador ? `${elec.ganador.partido} (${fmt(elec.ganador.votos)})` : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary-50 text-xs font-semibold uppercase text-secondary-600">
                      <tr>
                        <th className="px-4 py-2">Casilla hist.</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Lista nominal</th>
                        <th className="px-4 py-2">Total votos</th>
                        <th className="px-4 py-2">Participación</th>
                        <th className="px-4 py-2">Ganador</th>
                        <th className="px-4 py-2">Desglose partidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {elec.casillas.map((c, idx) => (
                        <tr key={idx} className="hover:bg-secondary-50/50">
                          <td className="px-4 py-2 font-medium text-secondary-900">{c.casilla}</td>
                          <td className="px-4 py-2 text-secondary-700">{c.tipo_casilla_label} {c.ext_contigua && c.ext_contigua !== '00' ? `(ext ${c.ext_contigua})` : ''}</td>
                          <td className="px-4 py-2 text-secondary-700">{fmt(c.lista_nominal)}</td>
                          <td className="px-4 py-2 text-secondary-700">{fmt(c.total_votos)}</td>
                          <td className="px-4 py-2 text-secondary-700">{pct(c.participacion_pct)}</td>
                          <td className="px-4 py-2">
                            {c.partido_ganador ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <Trophy size={12} /> {c.partido_ganador} {c.votos_ganador !== null && c.votos_ganador !== undefined ? `(${fmt(c.votos_ganador)})` : ''}
                              </span>
                            ) : (
                              <span className="text-secondary-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                const desglose = normalizarDesglose(c.desglose_partidos);
                                return (
                                  <>
                                    {desglose.slice(0, 4).map((d, i) => (
                                      <span key={i} className="inline-block rounded-md bg-secondary-100 px-1.5 py-0.5 text-xs text-secondary-700">
                                        {d.partido}: {fmt(d.votos)}
                                      </span>
                                    ))}
                                    {desglose.length > 4 && (
                                      <span className="inline-block rounded-md bg-secondary-100 px-1.5 py-0.5 text-xs text-secondary-500">
                                        +{desglose.length - 4}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
