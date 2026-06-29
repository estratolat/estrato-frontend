'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { votantesApi, proyeccionApi } from '@/lib/api';
import { Votante } from '@/types';
import { Upload, Users, Target } from 'lucide-react';
import dynamic from 'next/dynamic';

const ImportModal = dynamic(() => import('./ImportModal'), { ssr: false });

export default function VotantesPage() {
  const router = useRouter();
  const [votantes, setVotantes] = useState<Votante[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [padron, setPadron] = useState<{ total?: number; capturados?: number; avance?: number } | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    loadVotantes();
    loadPadron();
  }, [router]);

  const loadVotantes = async () => {
    try {
      setLoading(true);
      const { data } = await votantesApi.getAll({ limit: 200 });
      setVotantes(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar votantes');
    } finally {
      setLoading(false);
    }
  };

  const loadPadron = async () => {
    try {
      const { data } = await proyeccionApi.getResumen();
      if (data?.meta_lista_nominal && data?.votantes_capturados != null) {
        setPadron({
          total: data.meta_lista_nominal,
          capturados: data.votantes_capturados,
          avance: data.avance_padron ?? Math.round((data.votantes_capturados / data.meta_lista_nominal) * 1000) / 10,
        });
      }
    } catch (err) {
      // No bloquear la página si falla la proyección
    }
  };

  const filteredVotantes = votantes.filter((v) => {
    const term = search.toLowerCase();
    return (
      v.nombre?.toLowerCase().includes(term) ||
      v.telefono?.toLowerCase().includes(term) ||
      v.colonia?.toLowerCase().includes(term) ||
      v.seccion_electoral?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Votantes</h2>
          <p className="text-gray-600">Gestiona tus simpatizantes y voluntarios</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload size={18} />
            Importar base
          </button>
          <Link href="/dashboard/votantes/nuevo" className="btn-primary">
            + Nuevo Votante
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {padron && padron.total ? (
        <div className="card mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avance de captura del padrón</p>
                <p className="text-xl font-bold text-gray-900">
                  {padron.capturados?.toLocaleString()} de {padron.total.toLocaleString()}{' '}
                  <span className="text-sm font-medium text-gray-500">({padron.avance}%)</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Faltan por capturar</p>
              <p className="text-xl font-bold text-red-600">
                {Math.max(0, (padron.total || 0) - (padron.capturados || 0)).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${Math.min(100, padron.avance || 0)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="card mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, teléfono, colonia o sección..."
          className="input"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Teléfono</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Colonia</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Sección</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nivel</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Origen</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredVotantes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    {search ? 'No se encontraron votantes con esa búsqueda.' : 'No hay votantes registrados aún.'}
                  </td>
                </tr>
              ) : (
                filteredVotantes.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.nombre || 'Sin nombre'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.telefono || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.colonia || '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{v.seccion_electoral || '-'}</td>
                    <td className="px-4 py-3">
                      <NivelBadge nivel={v.nivel_apoyo} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.origen_qr || '-'}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/votantes/${v.id}`}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Ver / Editar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          loadVotantes();
          setTimeout(() => setImportOpen(false), 1500);
        }}
      />
    </div>
  );
}

function NivelBadge({ nivel }: { nivel?: number }) {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-700',
    2: 'bg-orange-100 text-orange-700',
    3: 'bg-yellow-100 text-yellow-700',
    4: 'bg-blue-100 text-blue-700',
    5: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[nivel || 3] || colors[3]}`}>
      {nivel || 3}
    </span>
  );
}
