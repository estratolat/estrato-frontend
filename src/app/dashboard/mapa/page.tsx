import { Metadata } from 'next';
import MapaClient from './MapaClient';

export const metadata: Metadata = {
  title: 'Mapa Territorial | ESTRATO',
  description: 'Visualización territorial de campaña con secciones electorales, simpatizantes, apoyos, eventos y líderes.',
};

export default function MapaPage() {
  return (
    <div className="h-full w-full">
      <MapaClient />
    </div>
  );
}
