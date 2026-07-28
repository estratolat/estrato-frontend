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
  const [brigadaCreada, setBrigadaCreada] = useState<any>(null);

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
      const res = await usersApi.create(data);
      const usuario = res.data;

      // Si el backend generó un PIN para brigada, mostrarlo antes de redirigir
      if (usuario?.pin_generado && usuario?.telefono) {
        setBrigadaCreada({
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: usuario.telefono,
          pin: usuario.pin_generado,
        });
        setLoading(false);
        return;
      }

      router.push('/dashboard/usuarios');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear usuario');
      setLoading(false);
    }
  };

  const handleCloseBrigadaModal = () => {
    setBrigadaCreada(null);
    router.push('/dashboard/usuarios');
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

      {brigadaCreada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-secondary-200 bg-white p-6 shadow-xl">
            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-secondary-800">Brigadista creado</h3>
              <p className="text-sm text-secondary-500">
                Comparte estos datos de acceso con <strong className="text-secondary-700">{brigadaCreada.nombre}</strong>.
              </p>
            </div>

            <div className="mb-4 space-y-3 rounded-xl bg-secondary-50 p-4 text-center">
              <div>
                <p className="text-xs text-secondary-500">Teléfono</p>
                <p className="text-lg font-bold tracking-wider text-secondary-800">{brigadaCreada.telefono}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500">PIN</p>
                <p className="text-3xl font-black tracking-widest text-primary-600">{brigadaCreada.pin}</p>
              </div>
            </div>

            <p className="mb-6 text-center text-xs text-secondary-500">
              También se envió un correo a <strong>{brigadaCreada.email}</strong> con estos datos.
            </p>

            <button
              onClick={handleCloseBrigadaModal}
              className="w-full rounded-lg bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
            >
              Entendido, volver al listado
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
