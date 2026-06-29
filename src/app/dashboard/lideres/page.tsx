'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { lideresApi } from '@/lib/api';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';

export default function LideresPage() {
  const router = useRouter();
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [stats, setStats] = useState({ total: 0, con_coordenadas: 0, sin_zona: 0, cobertura_pct: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lideresRes, statsRes] = await Promise.all([
        lideresApi.getAll(),
        lideresApi.getStats(),
      ]);
      setLideres(lideresRes.data || []);
      setStats(statsRes.data || { total: 0, con_coordenadas: 0, sin_zona: 0, cobertura_pct: 0 });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar líderes');
    } finally {
      setLoading(false);
    }
  };

  const filtered = lideres.filter((l) => {
    const term = search.toLowerCase();
    const nombre = l.votante?.nombre?.toLowerCase() || '';
    const seccion = l.votante?.seccion_electoral?.toLowerCase() || '';
    const colonia = l.votante?.colonia?.toLowerCase() || '';
    return nombre.includes(term) || seccion.includes(term) || colonia.includes(term);
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary-900">
            <Icon name="lideres" size={28} className="text-primary-600" />
            Líderes Territoriales
          </h1>
          <p className="text-sm text-secondary-500">Red de influencia conectada al mapa</p>
        </div>
        <Link href="/dashboard/lideres/nuevo" className="btn-primary">
          + Nuevo líder
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Total líderes</p>
          <p className="text-2xl font-bold text-secondary-900">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Con ubicación</p>
          <p className="text-2xl font-bold text-green-600">{stats.con_coordenadas}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Sin zona asignada</p>
          <p className="text-2xl font-bold text-red-600">{stats.sin_zona}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Cobertura geográfica</p>
          <p className="text-2xl font-bold text-primary-600">{stats.cobertura_pct}%</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="card">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, sección o colonia..."
          className="input"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-secondary-300 bg-secondary-50 p-8 text-center">
            <Icon name="lideres" size={40} className="mx-auto mb-3 text-secondary-400" />
            <p className="text-secondary-700">{search ? 'No hay líderes con esa búsqueda' : 'Aún no hay líderes registrados'}</p>
          </div>
        ) : (
          filtered.map((lider) => (
            <Link
              key={lider.id}
              href={`/dashboard/lideres/${lider.id}`}
              className="card group transition-all hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                    <Icon name="lideres" size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-secondary-900">
                      {lider.votante?.nombre || 'Sin nombre'}
                    </p>
                    <p className="text-sm text-secondary-500">
                      {lider.votante?.telefono || 'Sin teléfono'}
                    </p>
                  </div>
                </div>
                {lider.votante?.coordenadas ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    Ubicado
                  </span>
                ) : (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Sin ubicación
                  </span>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-secondary-100 pt-4">
                <div className="text-center">
                  <p className="text-xs text-secondary-500">Score</p>
                  <p className="font-bold text-secondary-900">{lider.score}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-secondary-500">Alcance</p>
                  <p className="font-bold text-secondary-900">{lider.alcance_estimado || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-secondary-500">Hijos</p>
                  <p className="font-bold text-secondary-900">{(lider as any).lideres_hijos_count || lider.lideresHijos?.length || 0}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {lider.votante?.seccion_electoral && (
                  <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs text-secondary-700">
                    Sección {lider.votante.seccion_electoral}
                  </span>
                )}
                {lider.votante?.colonia && (
                  <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs text-secondary-700">
                    {lider.votante.colonia}
                  </span>
                )}
                {(lider as any).zonas?.length > 0 && (
                  <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                    {(lider as any).zonas.length} zona{(lider as any).zonas.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
