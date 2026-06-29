'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usersApi, zonasApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder, permisosPorRol, labelSeccion, SECCIONES } from '@/lib/permisos';
import { Icon } from '@/components/ui/Icon';

const ROLES_LABELS: Record<string, string> = {
  owner: 'Owner',
  candidato: 'Candidato',
  coord_general: 'Coord. General',
  coord_zona: 'Coord. Zona',
  brigadista: 'Brigadista',
  cm: 'CM',
};

const ROLES_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  candidato: 'bg-red-100 text-red-700',
  coord_general: 'bg-blue-100 text-blue-700',
  coord_zona: 'bg-cyan-100 text-cyan-700',
  brigadista: 'bg-orange-100 text-orange-700',
  cm: 'bg-pink-100 text-pink-700',
};

export default function UsuariosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [zonas, setZonas] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'usuarios', user.rol)) {
      router.replace('/dashboard');
      return;
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, zonasRes] = await Promise.all([
        usersApi.getAll(),
        zonasApi.getAll(),
      ]);
      setUsuarios(usersRes.data);
      const zonasMap: Record<string, string> = {};
      (zonasRes.data || []).forEach((z: any) => {
        zonasMap[z.id] = z.nombre;
      });
      setZonas(zonasMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (u: any) => {
    try {
      await usersApi.update(u.id, { activo: !u.activo });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Desactivar este acceso?')) return;
    try {
      await usersApi.delete(id);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al desactivar usuario');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Accesos y Permisos</h2>
          <p className="text-secondary-500">Controla quién entra a cada sección del panel.</p>
        </div>
        <Link href="/dashboard/usuarios/nuevo" className="btn-primary flex items-center gap-2">
          <Icon name="user" size={18} />
          Nuevo acceso
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary-50 text-secondary-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Usuario</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Zona</th>
                <th className="px-4 py-3 font-semibold">Secciones permitidas</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {usuarios.map((u) => {
                const perms = Array.isArray(u.permisos) ? u.permisos : permisosPorRol(u.rol);
                return (
                  <tr key={u.id} className={!u.activo ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-secondary-800">{u.nombre || 'Sin nombre'}</p>
                      <p className="text-xs text-secondary-500">{u.email}</p>
                      {u.telefono && <p className="text-xs text-secondary-400">{u.telefono}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLES_COLORS[u.rol] || 'bg-secondary-100 text-secondary-600'}`}>
                        {ROLES_LABELS[u.rol] || u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-700">{u.zona_id ? zonas[u.zona_id] || '—' : 'Todas'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {perms.slice(0, 4).map((p: string) => (
                          <span key={p} className="inline-flex items-center gap-1 rounded-md bg-secondary-100 px-2 py-0.5 text-xs text-secondary-600">
                            <Icon name={SECCIONES.find((s) => s.id === p)?.icon as any || 'seguridad'} size={12} />
                            {labelSeccion(p)}
                          </span>
                        ))}
                        {perms.length > 4 && (
                          <span className="text-xs text-secondary-500">+{perms.length - 4} más</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActivo(u)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition ${
                          u.activo ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                            u.activo ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/usuarios/${u.id}/editar`}
                          className="rounded-lg p-2 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                          title="Editar"
                        >
                          <Icon name="configuracion" size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="rounded-lg p-2 text-secondary-500 hover:bg-red-50 hover:text-red-600"
                          title="Desactivar"
                        >
                          <Icon name="ocultar" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-secondary-500">
                    No hay accesos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
