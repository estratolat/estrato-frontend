'use client';

import { useEffect, useMemo, useState } from 'react';
import { resultadosHistoricosApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { Upload, Search, BarChart3, Table2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Resultado {
  id: number;
  seccion: string;
  anio: number;
  estado_id?: number;
  municipio_id?: number;
  partido_ganador: string;
  votos_ganador?: number;
  votos_totales?: number;
  votos_nulos?: number;
  participacion_pct?: number;
  desglose_partidos?: Record<string, number>;
}

interface Resumen {
  totalRegistros: number;
  aniosDisponibles: number[];
  porAnioPartido: Record<number, Record<string, { secciones: number; votos: number }>>;
  votosPorAnio: Record<number, number>;
  seccionesPorAnio: Record<number, number>;
}

const PARTIDO_COLORS: Record<string, string> = {
  MORENA: '#b91c1c',
  PAN: '#2563eb',
  PRI: '#16a34a',
  PRD: '#facc15',
  MC: '#f97316',
  PVEM: '#65a30d',
  PT: '#dc2626',
  PANAL: '#06b6d4',
  OTRO: '#6b7280',
};

export default function HistoricoElectoralPage() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'resultados' | 'importar'>('resultados');

  const [filtros, setFiltros] = useState({
    anio: '',
    seccion: '',
    partido: '',
  });

  const [anio1, setAnio1] = useState('');
  const [anio2, setAnio2] = useState('');

  const [importForm, setImportForm] = useState({
    anio: '',
    estado_id: '',
    municipio_id: '',
    archivo: null as File | null,
  });
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, sum] = await Promise.all([
        resultadosHistoricosApi.getAll({}),
        resultadosHistoricosApi.getResumen(),
      ]);
      setResultados(res.data || []);
      setResumen(sum.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos históricos');
    } finally {
      setLoading(false);
    }
  };

  const filtrados = useMemo(() => {
    return resultados.filter((r) => {
      if (filtros.anio && String(r.anio) !== filtros.anio) return false;
      if (filtros.seccion && !r.seccion.includes(filtros.seccion.padStart(4, '0'))) return false;
      if (filtros.partido && !r.partido_ganador.toLowerCase().includes(filtros.partido.toLowerCase())) return false;
      return true;
    });
  }, [resultados, filtros]);

  const comparativa = useMemo(() => {
    if (!anio1 || !anio2) return [];
    const map1 = new Map(resultados.filter((r) => String(r.anio) === anio1).map((r) => [r.seccion, r]));
    const map2 = new Map(resultados.filter((r) => String(r.anio) === anio2).map((r) => [r.seccion, r]));
    const secciones = new Set([...Array.from(map1.keys()), ...Array.from(map2.keys())]);

    return Array.from(secciones)
      .map((seccion) => {
        const r1 = map1.get(seccion);
        const r2 = map2.get(seccion);
        return {
          seccion,
          ganador1: r1?.partido_ganador || '-',
          ganador2: r2?.partido_ganador || '-',
          votos1: r1?.votos_totales || 0,
          votos2: r2?.votos_totales || 0,
          diferencia: (r2?.votos_totales || 0) - (r1?.votos_totales || 0),
          cambioGanador: r1?.partido_ganador !== r2?.partido_ganador,
        };
      })
      .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia));
  }, [resultados, anio1, anio2]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.archivo || !importForm.anio) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('archivo', importForm.archivo);
      formData.append('anio', importForm.anio);
      if (importForm.estado_id) formData.append('estado_id', importForm.estado_id);
      if (importForm.municipio_id) formData.append('municipio_id', importForm.municipio_id);
      const { data } = await resultadosHistoricosApi.importar(formData);
      setImportResult(data);
      cargarDatos();
    } catch (err: any) {
      setImportResult({
        error: err.response?.data?.message || 'Error al importar',
      });
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary-900">
            <Icon name="historico" size={28} className="text-primary-600" />
            Histórico Electoral
          </h1>
          <p className="text-sm text-secondary-500">
            Resultados de votaciones pasadas por sección electoral
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('resultados')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'resultados'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <Table2 size={16} /> Resultados
          </button>
          <button
            onClick={() => setActiveTab('importar')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === 'importar'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <Upload size={16} /> Importar CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'resultados' && (
        <>
          {/* Resumen */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card p-4">
              <p className="text-sm text-secondary-500">Total de registros</p>
              <p className="mt-1 text-2xl font-bold text-secondary-900">{resumen?.totalRegistros || 0}</p>
            </div>
            {(resumen?.aniosDisponibles || []).map((anio) => (
              <div key={anio} className="card p-4">
                <p className="text-sm text-secondary-500">Año {anio}</p>
                <p className="mt-1 text-2xl font-bold text-secondary-900">
                  {resumen?.seccionesPorAnio[anio] || 0}
                </p>
                <p className="text-xs text-secondary-400">secciones cargadas</p>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="card p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Año</label>
                <select
                  value={filtros.anio}
                  onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })}
                  className="input"
                >
                  <option value="">Todos</option>
                  {(resumen?.aniosDisponibles || []).map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Sección</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                  <input
                    type="text"
                    value={filtros.seccion}
                    onChange={(e) => setFiltros({ ...filtros, seccion: e.target.value })}
                    placeholder="Ej. 0123"
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="label">Partido ganador</label>
                <input
                  type="text"
                  value={filtros.partido}
                  onChange={(e) => setFiltros({ ...filtros, partido: e.target.value })}
                  placeholder="Ej. MORENA"
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Año</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Sección</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ganador</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Votos ganador</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Votos totales</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Participación</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Desglose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No hay resultados con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{r.anio}</td>
                        <td className="px-4 py-3 text-gray-600">{r.seccion}</td>
                        <td className="px-4 py-3">
                          <PartidoBadge partido={r.partido_ganador} />
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.votos_ganador?.toLocaleString() || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.votos_totales?.toLocaleString() || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {r.participacion_pct ? `${r.participacion_pct.toFixed(2)}%` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <DesglosePreview desglose={r.desglose_partidos} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comparativa */}
          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary-600" />
              <h3 className="text-lg font-bold text-secondary-900">Comparativa por sección</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={anio1}
                onChange={(e) => setAnio1(e.target.value)}
                className="input"
              >
                <option value="">Primer año</option>
                {(resumen?.aniosDisponibles || []).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select
                value={anio2}
                onChange={(e) => setAnio2(e.target.value)}
                className="input"
              >
                <option value="">Segundo año</option>
                {(resumen?.aniosDisponibles || []).map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {anio1 && anio2 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Sección</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{anio1} Ganador</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{anio2} Ganador</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Dif. votos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {comparativa.slice(0, 50).map((c) => (
                      <tr key={c.seccion} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{c.seccion}</td>
                        <td className="px-4 py-3">
                          <PartidoBadge partido={c.ganador1} />
                        </td>
                        <td className="px-4 py-3">
                          <PartidoBadge partido={c.ganador2} />
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            c.diferencia > 0 ? 'text-green-600' : c.diferencia < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}
                        >
                          {c.diferencia > 0 ? '+' : ''}
                          {c.diferencia.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'importar' && (
        <div className="card p-6">
          <h3 className="mb-4 text-lg font-bold text-secondary-900">Importar resultados históricos</h3>

          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium">Formatos soportados:</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                <strong>PREP Sinaloa final:</strong> exportación con columnas como{' '}
                <code className="rounded bg-blue-100 px-1 py-0.5">SECCION, ID_MUNICIPIO_LOCAL, MUNICIPIO_LOCAL, TIPO_CASILLA, TOTAL_VOTOS, VN, VCN, PAN, PRI, MORENA, MAG, JSLS, VMSA...</code>
                . El sistema agrupa por sección, omite casillas MESA (voto anticipado) y calcula el ganador excluyendo nulos/no registradas.
              </li>
              <li>
                <strong>Resumen por sección:</strong> una fila por sección con columnas como{' '}
                <code className="rounded bg-blue-100 px-1 py-0.5">SECCION, MUNICIPIO, LISTA_NOMINAL, TOTAL_VOTOS_ASENTADO, PARTICIPACION_PCT, PAN, PRI, MORENA, NULOS...</code>
                . El sistema calcula automáticamente el partido ganador y el desglose.
              </li>
              <li>
                <strong>Formato manual:</strong>{' '}
                <code className="rounded bg-blue-100 px-1 py-0.5">seccion, anio, partido_ganador, votos_ganador, votos_totales, votos_nulos, participacion_pct</code>
                . También puedes incluir columnas con nombres de partido para desglose.
              </li>
            </ul>
          </div>

          <form onSubmit={handleImport} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label">Año de la elección *</label>
                <input
                  type="number"
                  value={importForm.anio}
                  onChange={(e) => setImportForm({ ...importForm, anio: e.target.value })}
                  placeholder="2024"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">ID Estado (opcional)</label>
                <input
                  type="number"
                  value={importForm.estado_id}
                  onChange={(e) => setImportForm({ ...importForm, estado_id: e.target.value })}
                  placeholder="25"
                  className="input"
                />
              </div>
              <div>
                <label className="label">ID Municipio (opcional)</label>
                <input
                  type="number"
                  value={importForm.municipio_id}
                  onChange={(e) => setImportForm({ ...importForm, municipio_id: e.target.value })}
                  placeholder="6"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Archivo CSV *</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setImportForm({ ...importForm, archivo: e.target.files?.[0] || null })}
                  className="input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={importing || !importForm.archivo || !importForm.anio}
              className="btn-primary flex items-center gap-2 disabled:opacity-60"
            >
              <Upload size={18} />
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </form>

          {importResult && (
            <div className={`mt-6 rounded-lg border p-4 ${importResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-start gap-3">
                {importResult.error ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                )}
                <div className="text-sm">
                  {importResult.error ? (
                    <p className="font-medium text-red-700">{importResult.error}</p>
                  ) : (
                    <>
                      <p className="font-medium text-green-700">
                        Importación completada: {importResult.exitosos} de {importResult.totalFilas} filas.
                      </p>
                      {importResult.errores > 0 && (
                        <p className="mt-1 text-red-600">
                          Errores: {importResult.errores} filas.
                        </p>
                      )}
                      {importResult.detallesErrores?.length > 0 && (
                        <ul className="mt-2 list-inside list-disc text-red-600">
                          {importResult.detallesErrores.map((e: any, i: number) => (
                            <li key={i}>Fila {e.fila}: {e.error}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PartidoBadge({ partido }: { partido: string }) {
  const color = PARTIDO_COLORS[partido.toUpperCase()] || PARTIDO_COLORS.OTRO;
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {partido}
    </span>
  );
}

function DesglosePreview({ desglose }: { desglose?: Record<string, number> }) {
  if (!desglose || Object.keys(desglose).length === 0) return <span className="text-gray-400">-</span>;
  const entries = Object.entries(desglose).sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([partido, votos]) => (
        <span
          key={partido}
          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700"
        >
          <span className="font-semibold">{partido}</span> {votos.toLocaleString()}
        </span>
      ))}
    </div>
  );
}
