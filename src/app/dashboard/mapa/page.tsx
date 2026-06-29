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
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary-900">
            <Icon name="mapa" size={28} className="text-primary-600" />
            Mapa Territorial
          </h1>
          <p className="text-sm text-secondary-500">
            Visualiza secciones, simpatizantes, apoyos, eventos y territorio asignado
          </p>
        </div>
      </div>

      <MapaTerritorial />
    </div>
  );
}
