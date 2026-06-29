'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authApi } from '@/lib/api';

export default function BrigadaLoginPage() {
  const router = useRouter();
  const [telefono, setTelefono] = useState('+521234567893');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await authApi.loginBrigada(telefono, pin);

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('tenantId', data.user.tenant_id);
      localStorage.setItem('tenantSlug', data.user.tenant_slug);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('permisos', JSON.stringify(data.user.permisos || []));

      router.push('/brigada');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Error de red';
      setError(status ? `(${status}) ${msg}` : msg);
      console.error('[LOGIN BRIGADA ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <Image
            src="/estratobcl-dark.svg"
            alt="ESTRATO"
            width={160}
            height={68}
            className="mx-auto"
            priority
          />
          <h1 className="mt-4 text-xl font-bold text-secondary-900">Acceso de Brigada</h1>
          <p className="text-sm text-secondary-500">Captura territorial en campo</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="telefono" className="label text-sm">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="input"
              placeholder="+52..."
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="label text-sm">PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="input"
              placeholder="****"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:opacity-60"
          >
            {loading ? 'Iniciando sesión...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-gray-500">
          <p className="font-medium mb-1">Demo:</p>
          <p>Teléfono: +521234567893</p>
          <p>PIN: 1234</p>
        </div>
      </div>
    </div>
  );
}
