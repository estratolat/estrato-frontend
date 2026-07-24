'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { encuestasApi } from '@/lib/api';
import { Encuesta, RespuestaEncuesta } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PreguntaResumen {
  id: string;
  texto: string;
  tipo: string;
  opciones?: string[];
  total: number;
  respondieron: number;
  distribucion: { valor: string; cantidad: number; porcentaje: number }[];
  conteo: Record<string, number>;
}

export default function RespuestasEncuestaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [respuestas, setRespuestas] = useState<RespuestaEncuesta[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [encRes, respRes, resumenRes] = await Promise.all([
        encuestasApi.getOne(id as string),
        encuestasApi.getRespuestas(id as string, { limit: 500 }),
        encuestasApi.getResumen(id as string),
      ]);
      setEncuesta(encRes.data);
      setRespuestas(respRes.data || []);
      setResumen(resumenRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!encuesta) return null;

  const preguntas: PreguntaResumen[] = resumen?.resumen || [];
  const colors = ['#D73216', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#06B6D4'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Respuestas: {encuesta.titulo}</h2>
          <p className="text-secondary-600">{respuestas.length} respuestas registradas</p>
        </div>
        <button onClick={() => router.push(`/dashboard/encuestas/${id}`)} className="btn-secondary text-sm">
          Volver a encuesta
        </button>
      </div>

      {preguntas.map((pregunta) => {
        const data = pregunta.distribucion?.length
          ? pregunta.distribucion
          : Object.entries(pregunta.conteo || {}).map(([valor, cantidad]) => ({
              valor,
              cantidad,
              porcentaje: pregunta.total > 0 ? Math.round((cantidad / pregunta.total) * 1000) / 10 : 0,
            }));
        return (
          <div key={pregunta.id} className="card space-y-4">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">{pregunta.texto}</h3>
              <p className="text-xs text-secondary-500">
                {pregunta.respondieron || 0} de {pregunta.total || respuestas.length} respondieron • {pregunta.tipo}
              </p>
            </div>
            <div className="h-64">
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
                    <XAxis dataKey="valor" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value: any, name: any, props: any) => {
                        const item = props?.payload;
                        return [`${item.cantidad} (${item.porcentaje}%)`, 'Respuestas'];
                      }}
                    />
                    <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-secondary-500">Sin datos para mostrar.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {data.map((item, i) => (
                <div key={item.valor} className="rounded-lg border border-secondary-100 p-3">
                  <p className="truncate text-xs text-secondary-500" title={item.valor}>
                    {item.valor}
                  </p>
                  <p className="text-lg font-bold text-secondary-900">
                    {item.cantidad}{' '}
                    <span className="text-xs font-normal text-secondary-500">({item.porcentaje}%)</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="card overflow-hidden">
        <h3 className="mb-4 text-lg font-bold text-secondary-900">Últimas respuestas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Fecha</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Correo</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Votante</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Respuestas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {respuestas.slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-secondary-600">{new Date(r.created_at).toLocaleString('es-MX')}</td>
                  <td className="px-4 py-3 text-secondary-900">{r.email || '-'}</td>
                  <td className="px-4 py-3 text-secondary-900">{r.votante_nombre || r.votante?.nombre || 'Anónimo'}</td>
                  <td className="px-4 py-3 text-secondary-600">
                    {r.respuestas.map((x, i) => (
                      <span key={i} className="mr-2 inline-block rounded bg-secondary-100 px-2 py-0.5 text-xs">
                        {x.valores.join(', ')}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
