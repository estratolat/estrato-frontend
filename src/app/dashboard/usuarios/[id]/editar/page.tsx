'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { usersApi, zonasApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import UsuarioForm from '@/components/usuarios/UsuarioForm';

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user, loading: authLoading, refresh } = useAuth();
  const [initial, setInitial] = useState<any | null>(null);
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'usuarios', user.rol)) {
      router.replace('/dashboard');
      return;
    }
    if (!id) return;

    Promise.all([usersApi.getOne(id), zonasApi.getAll()])
      .then(([userRes, zonasRes]) => {
        setInitial(userRes.data);
        setZonas(zonasRes.data);
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || 'Error al cargar usuario');
      });
  }, [id, user, authLoading, router]);

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError('');
      await usersApi.update(id, data);
      // Si el usuario editó sus propios permisos, refrescar sesión para actualizar menú
      if (user && id === user.id) {
        await refresh();
      }
      router.push('/dashboard/usuarios');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar usuario');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/usuarios" className="text-sm text-secondary-500 hover:text-primary-600">
          ← Volver a accesos
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-secondary-800">Editar acceso</h2>
        <p className="text-secondary-500">Modifica datos, rol, zona y permisos por sección.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
        {initial ? (
          <UsuarioForm
            initial={initial}
            zonas={zonas}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/dashboard/usuarios')}
            loading={loading}
          />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}
