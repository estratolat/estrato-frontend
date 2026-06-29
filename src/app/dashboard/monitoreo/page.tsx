'use client';

import { useEffect, useState } from 'react';
import { monitoreoApi, casillasApi } from '@/lib/api';
import { Casilla, ResumenMonitoreo } from '@/types';
import { Activity, Clock, CheckCircle2, AlertTriangle, Users, RefreshCw } from 'lucide-react';

export default function MonitoreoPage() {
  const [resumen, setResumen] = useState<ResumenMonitoreo | null>(null);
  const [porSeccion, setPorSeccion] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<Casilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, secc, inc] = await Promise.all([
        monitoreoApi.getResumen(),
        monitoreoApi.getCasillas({ limit: 500 }),
        monitoreoApi.getIncidencias(),
      ]);
      // API no devuelve ResumenMonitoreo tipado exacto; adaptamos
      const data = res.data;
      setResumen({
        total_casillas: data.total_casillas,
        sin_reportar: data.sin_reportar,
        abiertas: data.abiertas,
        cerradas: data.cerradas,
        incidencias: data.incidencias,
        votantes_esperados: data.votantes_esperados,
        por_seccion: [],
      });
      // Por sección se obtiene de casillas
      const agrupado: Record<string, any> = {};
      (secc.data || []).forEach((c: Casilla) => {
        if (!agrupado[c.seccion]) {
          agrupado[c.seccion] = { seccion: c.seccion, total: 0, abiertas: 0, cerradas: 0, incidencias: 0 };
        }
        agrupado[c.seccion].total += 1;
        if (c.status === 'abierta') agrupado[c.seccion].abiertas += 1;
        if (c.status === 'cerrada') agrupado[c.seccion].cerradas += 1;
        if (c.status === 'incidencia') agrupado[c.seccion].incidencias += 1;
      });
      setPorSeccion(Object.values(agrupado));
      setIncidencias(inc.data || []);
      setLastUpdate(new Date());
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: any }) => (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-2xl font-bold text-secondary-900">{value.toLocaleString()}</p>
        <p className="text-sm text-secondary-600">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Dashboard de Monitoreo</h2>
          <p className="text-secondary-600">Voto en vivo por sección y casilla. Última actualización: {lastUpdate.toLocaleTimeString('es-MX')}</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total casillas" value={resumen?.total_casillas || 0} color="bg-primary-100 text-primary-600" icon={Activity} />
        <StatCard label="Cerradas / contadas" value={resumen?.cerradas || 0} color="bg-green-100 text-green-600" icon={CheckCircle2} />
        <StatCard label="Abiertas" value={resumen?.abiertas || 0} color="bg-blue-100 text-blue-600" icon={Clock} />
        <StatCard label="Incidencias" value={resumen?.incidencias || 0} color="bg-red-100 text-red-600" icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h3 className="mb-4 text-lg font-bold text-secondary-900">Avance por sección</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-secondary-200 bg-secondary-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-secondary-600">Sección</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-600">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-600">Cerradas</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-600">Abiertas</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-600">Incidencias</th>
                  <th className="px-4 py-3 text-left font-medium text-secondary-600">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {porSeccion.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-secondary-500">No hay casillas registradas.</td>
                  </tr>
                ) : (
                  porSeccion.map((s) => {
                    const avance = s.total ? Math.round((s.cerradas / s.total) * 100) : 0;
                    return (
                      <tr key={s.seccion}>
                        <td className="px-4 py-3 font-medium text-secondary-900">Sección {s.seccion}</td>
                        <td className="px-4 py-3 text-secondary-600">{s.total}</td>
                        <td className="px-4 py-3 text-secondary-600">{s.cerradas}</td>
                        <td className="px-4 py-3 text-secondary-600">{s.abiertas}</td>
                        <td className="px-4 py-3 text-secondary-600">{s.incidencias}</td>
                        <td className="px-4 py-3">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-100">
                            <div
                              className="h-full rounded-full bg-green-500"
                              style={{ width: `${avance}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-secondary-600">{avance}%</p>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Users size={20} className="text-primary-600" />
            <h3 className="text-lg font-bold text-secondary-900">Electores esperados</h3>
          </div>
          <p className="text-3xl font-bold text-secondary-900">{(resumen?.votantes_esperados || 0).toLocaleString()}</p>
          <p className="text-sm text-secondary-600">Personas en las casillas registradas.</p>

          {incidencias.length > 0 && (
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-bold text-red-700">Incidencias activas</h4>
              {incidencias.slice(0, 5).map((c) => (
                <div key={c.id} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                  <p className="font-bold text-secondary-900">Sección {c.seccion}</p>
                  <p className="text-red-700">{c.incidencia}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
