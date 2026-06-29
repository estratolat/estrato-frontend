'use client';

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}

const MiniMapaCliente = dynamic(() => import('./MiniMapaCliente'), {
  ssr: false,
  loading: () => (
    <div
      className="flex w-full items-center justify-center rounded-lg border border-secondary-200 bg-secondary-100"
      style={{ height: '220px' }}
    >
      <span className="text-sm text-secondary-500">Cargando mapa...</span>
    </div>
  ),
});

export default function MiniMapa(props: Props) {
  return <MiniMapaCliente {...props} />;
}
