'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { casillasApi } from '@/lib/api';
import { Casilla } from '@/types';
import { MapPin, Plus, Trash2, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const statusLabels: Record<string, string> = {
  sin_reportar: 'Sin reportar',
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  incidencia: 'Incidencia',
};

const statusColors: Record<string, string> = {
  sin_reportar: 'bg-gray-100 text-gray-700',
  abierta: 'bg-blue-100 text-blue-700',
  cerrada: 'bg-green-100 text-green-700',
  incidencia: 'bg-red-100 text-red-700',
};

const statusIcons: Record<string, any> = {
  sin_reportar: Clock,
  abierta: Clock,
  cerrada: CheckCircle2,
  incidencia: AlertTriangle,
};

export default function CasillasPage() {
  const [casillas, setCasillas] = useState<Casilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadCasillas();
  }, []);

  const loadCasillas = async () => {
    try {
      setLoading(true);
      const { data } = await casillasApi.getAll({ limit: 500 });
      setCasillas(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar casillas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta casilla?')) return;
    try {
      await casillasApi.delete(id);
      loadCasillas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      await casillasApi.updateStatus(id, status);
      loadCasillas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al actualizar');
    }
  };

  const filtered = casillas.filter((c) => {
    const term = search.toLowerCase();
    const matchesSearch =
      c.seccion.toLowerCase().includes(term) ||
      c.ubicacion?.toLowerCase().includes(term) ||
      c.direccion?.toLowerCase().includes(term);
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

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
          <h2 className="text-2xl font-bold text-secondary-900">Localizador de Casillas</h2>
          <p className="text-secondary-600">Administra puestos de votación y sus responsables</p>
        </div>
        <Link href="/dashboard/casillas/nueva" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nueva casilla
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="card flex flex-col gap-4 sm:flex-row">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por sección, ubicación o dirección..."
          className="input flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input sm:w-48"
        >
          <option value="">Todos los estatus</option>
          {Object.keys(statusLabels).map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed border-secondary-300 p-8 text-center text-secondary-500">
            {search || statusFilter ? 'No se encontraron casillas.' : 'No hay casillas registradas.'}
          </div>
        ) : (
          filtered.map((c) => {
            const Icon = statusIcons[c.status] || Clock;
            return (
              <div key={c.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-secondary-900">Sección {c.seccion}</p>
                      <p className="text-xs text-secondary-500 capitalize">{c.tipo}{c.numero ? ` • ${c.numero}` : ''}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[c.status]}`}>
                    <Icon size={12} className="inline mr-1" />{statusLabels[c.status]}
                  </span>
                </div>

                <div className="text-sm text-secondary-600">
                  {c.ubicacion && <p className="font-medium">{c.ubicacion}</p>}
                  {c.direccion && <p>{c.direccion}</p>}
                  {c.referencia && <p className="text-xs text-secondary-500">Ref: {c.referencia}</p>}
                  {c.electores_esperados && <p className="text-xs">Electores esperados: {c.electores_esperados}</p>}
                  {c.responsable && <p className="text-xs">Responsable: {c.responsable.nombre || 'Sin nombre'}</p>}
                  {c.incidencia && c.status === 'incidencia' && (
                    <p className="text-xs font-medium text-red-600">Incidencia: {c.incidencia}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <select
                    value={c.status}
                    onChange={(e) => handleStatus(c.id, e.target.value)}
                    className="input flex-1 text-xs py-1.5"
                  >
                    {Object.keys(statusLabels).map((s) => (
                      <option key={s} value={s}>{statusLabels[s]}</option>
                    ))}
                  </select>
                  <Link href={`/dashboard/casillas/${c.id}`} className="btn-secondary text-xs px-3 py-1.5">Editar</Link>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="rounded-md p-2 text-secondary-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
