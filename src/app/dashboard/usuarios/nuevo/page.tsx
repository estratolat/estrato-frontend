'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usersApi, zonasApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import UsuarioForm from '@/components/usuarios/UsuarioForm';

export default function NuevoUsuarioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'usuarios', user.rol)) {
      router.replace('/dashboard');
      return;
    }
    zonasApi.getAll().then((res) => setZonas(res.data)).catch(() => setZonas([]));
  }, [user, authLoading, router]);

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError('');
      await usersApi.create(data);
      router.push('/dashboard/usuarios');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear usuario');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard/usuarios" className="text-sm text-secondary-500 hover:text-primary-600">
          ← Volver a accesos
        </Link>
        <h2 className="mt-2 text-2xl font-bold text-secondary-800">Nuevo acceso</h2>
        <p className="text-secondary-500">Crea una cuenta y define a qué secciones puede entrar.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-secondary-200 bg-white p-6 shadow-sm">
        <UsuarioForm zonas={zonas} onSubmit={handleSubmit} onCancel={() => router.push('/dashboard/usuarios')} loading={loading} />
      </div>
    </div>
  );
}
