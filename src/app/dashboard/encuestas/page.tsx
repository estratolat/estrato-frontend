'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { encuestasApi } from '@/lib/api';
import { Encuesta } from '@/types';
import { ClipboardList, Eye, Trash2, Play, Square, FileText } from 'lucide-react';

export default function EncuestasPage() {
  const router = useRouter();
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEncuestas();
  }, []);

  const loadEncuestas = async () => {
    try {
      setLoading(true);
      const { data } = await encuestasApi.getAll({ limit: 200 });
      setEncuestas(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar encuestas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta encuesta y todas sus respuestas?')) return;
    try {
      await encuestasApi.delete(id);
      loadEncuestas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'borrador' ? 'activa' : current === 'activa' ? 'cerrada' : 'borrador';
    try {
      await encuestasApi.updateStatus(id, next);
      loadEncuestas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar estatus');
    }
  };

  const filtered = encuestas.filter((e) =>
    e.titulo.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabels: Record<string, string> = {
    borrador: 'Borrador',
    activa: 'Activa',
    cerrada: 'Cerrada',
  };

  const statusColors: Record<string, string> = {
    borrador: 'bg-gray-100 text-gray-700',
    activa: 'bg-green-100 text-green-700',
    cerrada: 'bg-blue-100 text-blue-700',
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Encuestas de Opinión</h2>
          <p className="text-secondary-600">Crea encuestas ciudadanas y consulta resultados</p>
        </div>
        <Link href="/dashboard/encuestas/nueva" className="btn-primary flex items-center gap-2">
          <ClipboardList size={18} /> Nueva encuesta
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar encuesta..."
          className="input"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Título</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Estatus</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Preguntas</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Respuestas</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-secondary-500">
                    {search ? 'No se encontraron encuestas.' : 'No hay encuestas registradas.'}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-medium text-secondary-900">{e.titulo}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[e.status]}`}>
                        {statusLabels[e.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-600">{e.preguntas?.length || 0}</td>
                    <td className="px-4 py-3 text-secondary-600">{(e as any)._count?.respuestas || 0}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(e.id, e.status)}
                          title="Cambiar estatus"
                          className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                        >
                          {e.status === 'activa' ? <Square size={16} /> : <Play size={16} />}
                        </button>
                        <Link
                          href={`/dashboard/encuestas/${e.id}`}
                          className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                          title="Ver / Editar"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/dashboard/encuestas/${e.id}/respuestas`}
                          className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                          title="Respuestas"
                        >
                          <FileText size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(e.id)}
                          title="Eliminar"
                          className="rounded-md p-1.5 text-secondary-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
