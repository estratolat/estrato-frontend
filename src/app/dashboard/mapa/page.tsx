import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/ui/Icon';

export const metadata: Metadata = {
  title: 'Mapa Territorial | ESTRATO',
  description: 'Visualización territorial de campaña con secciones electorales, simpatizantes, apoyos, eventos y líderes.',
};

const MapaTerritorial = dynamic(() => import('@/components/mapa/MapaTerritorial'), {
  ssr: false,
});

export default function MapaPage() {
  return (
    <div className="h-full w-full">
      <MapaTerritorial />
    </div>
  );
}
