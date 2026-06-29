'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setCookie = (name: string, value: string, days: number) => {
    if (typeof window === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
  };

  const removeCookie = (name: string) => {
    if (typeof window === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await authApi.login(email, password);

      // Limpiar cualquier sesión anterior para evitar duplicados/conflictos
      removeCookie('token');

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('tenantId', data.user.tenant_id);
      localStorage.setItem('tenantSlug', data.user.tenant_slug);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('permisos', JSON.stringify(data.user.permisos || []));

      // Cookie para que el middleware de Next.js pueda proteger rutas
      setCookie('token', data.access_token, 7);

      router.push('/dashboard');
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message || err.message || 'Error de red';
      const details = status ? `(${status}) ${msg}` : msg;
      setError(details);
      console.error('[LOGIN ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Fondo del cerebro */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-batalla.jpg"
          alt=""
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#15161d]/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#15161d]/95 via-[#15161d]/80 to-[#15161d]/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15161d] via-transparent to-[#15161d]/60" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#16171e]/90 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <Image
            src="/estratobcl.svg"
            alt="ESTRATO"
            width={180}
            height={77}
            className="mx-auto"
            priority
          />
          <p className="mt-4 text-sm text-white/60">Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-[0.1em] text-white/50">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#d73216] focus:outline-none"
              placeholder="owner@demo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-[0.1em] text-white/50">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#d73216] focus:outline-none"
              placeholder="demo123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#d73216] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#b82412] disabled:opacity-60"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
          <p className="mb-2 font-medium text-white/70">Cuentas de demo:</p>
          <ul className="space-y-1">
            <li>owner@demo.com / demo123</li>
            <li>candidato@demo.com / demo123</li>
            <li>coord@demo.com / demo123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
