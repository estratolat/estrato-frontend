'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder, esSoloAppBrigada } from '@/lib/permisos';

const MapaTerritorial = dynamic(() => import('@/components/mapa/MapaTerritorial'), {
  ssr: false,
});

export default function MapaClient() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    if (esSoloAppBrigada(user.permisos, user.rol)) {
      router.replace('/brigada');
      return;
    }

    if (!puedeAcceder(user.permisos, 'mapa', user.rol)) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (esSoloAppBrigada(user.permisos, user.rol) || !puedeAcceder(user.permisos, 'mapa', user.rol)) {
    return null;
  }

  return <MapaTerritorial />;
}
