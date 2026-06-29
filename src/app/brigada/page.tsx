'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Icon } from '@/components/ui/Icon';
import BrigadaTabs from '@/components/brigada/BrigadaTabs';
import { User } from '@/types';

export default function BrigadaPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!token || !userRaw) {
      router.replace('/brigada/login');
      return;
    }

    try {
      setUser(JSON.parse(userRaw));
    } catch {
      router.replace('/brigada/login');
      return;
    }

    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('tenantSlug');
      localStorage.removeItem('user');
    }
    router.replace('/brigada/login');
  };

  const handleExito = () => {
    setLastSync(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          <p className="text-sm text-secondary-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="fixed left-0 right-0 top-0 z-50 h-16 bg-white shadow-sm">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Image
              src="/estratobcl-dark.svg"
              alt="ESTRATO"
              width={110}
              height={47}
              priority
              className="h-8 w-auto"
            />
            <span className="hidden text-xs font-semibold text-secondary-500 sm:inline">| Brigada</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-semibold leading-tight text-secondary-800">
                {user?.nombre || 'Brigadista'}
              </p>
              {lastSync && (
                <p className="text-[10px] leading-tight text-green-600">
                  Sincronizado {lastSync}
                </p>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full p-2 text-secondary-500 transition hover:bg-secondary-100 hover:text-secondary-700"
              title="Cerrar sesión"
            >
              <Icon name="salir" size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <BrigadaTabs onExito={handleExito} />
      </main>
    </div>
  );
}
