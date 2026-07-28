'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api } from '@/lib/api';

function InvitacionForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('El enlace de invitación no es válido o ha expirado.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/invitacion/aceptar', {
        token,
        password,
        confirmar_password: confirmar,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al activar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#16171e] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1b24] p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Image
            src="/estratobcl.svg"
            alt="ESTRATO"
            width={140}
            height={60}
            className="mx-auto h-10 w-auto"
            priority
          />
          <h1 className="mt-4 text-2xl font-black text-white">Activa tu cuenta</h1>
          <p className="mt-2 text-sm text-white/60">
            Define una contraseña segura para acceder a ESTRATO.
          </p>
        </div>

        {success ? (
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-4 text-center">
            <p className="font-semibold text-green-400">¡Cuenta activada correctamente!</p>
            <p className="mt-1 text-sm text-white/70">
              Serás redirigido al inicio de sesión en unos segundos...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-white/10 bg-[#0f1015] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#d73216]"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-white/80">
                Confirmar contraseña
              </label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-white/10 bg-[#0f1015] px-4 py-3 text-white placeholder-white/30 outline-none focus:border-[#d73216]"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-lg bg-[#d73216] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#b82412] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Activando...' : 'Activar cuenta'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function InvitacionPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#16171e]">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#d73216]" />
        </main>
      }
    >
      <InvitacionForm />
    </Suspense>
  );
}
