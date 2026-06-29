'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet-images/marker-icon-2x.png',
  iconUrl: '/leaflet-images/marker-icon.png',
  shadowUrl: '/leaflet-images/marker-shadow.png',
});

interface Props {
  geojson: any;
  cargando?: boolean;
}

export default function MapaSecciones({ geojson, cargando }: Props) {
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  useEffect(() => {
    if (!geojson?.features?.length) return;
    try {
      const layer = L.geoJSON(geojson);
      const b = layer.getBounds();
      if (b.isValid()) setBounds(b);
      layer.remove();
    } catch {
      // ignore
    }
  }, [geojson]);

  const styleFeature = (feature: any) => {
    const color = feature?.properties?._color_ganador || '#9CA3AF';
    const clasificacion = feature?.properties?._clasificacion;
    let fillOpacity = 0.5;
    if (clasificacion === 'BASTION') fillOpacity = 0.7;
    if (clasificacion === 'PRIORITARIA_RIESGO') fillOpacity = 0.6;
    return {
      fillColor: color,
      color: '#FFFFFF',
      weight: 1,
      opacity: 1,
      fillOpacity,
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const p = feature.properties || {};
    const popup = `
      <div class="font-sans text-sm">
        <p class="font-bold">Sección ${p._seccion_normalizada || p.SECCION || '—'}</p>
        <p>Ganador: <strong>${p._actor_ganador || 'Sin datos'}</strong></p>
        <p>Clasificación: <strong>${p._clasificacion || '—'}</strong></p>
        <p>Total votos: ${(p._total_votos || 0).toLocaleString()}</p>
        <p>% Nulos: ${(p._porcentaje_nulos || 0).toFixed(2)}%</p>
      </div>
    `;
    layer.bindPopup(popup);
  };

  if (cargando) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!geojson?.features?.length) {
    return (
      <div className="flex h-[500px] items-center justify-center bg-gray-50 text-secondary-500">
        No hay polígonos de secciones disponibles. Carga la capa de secciones y los resultados de una elección.
      </div>
    );
  }

  return (
    <MapContainer
      center={[23.3, -106.5]}
      zoom={8}
      scrollWheelZoom={true}
      className="h-[500px] w-full rounded-lg"
      bounds={bounds || undefined}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <GeoJSON
        data={geojson}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
