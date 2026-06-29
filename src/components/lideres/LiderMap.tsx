'use client';

import { useMemo } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiderMapProps {
  lat: number;
  lng: number;
  nombre: string;
  radioM?: number;
  color?: string;
  otros?: {
    id: string;
    nombre: string;
    lat: number;
    lng: number;
    radioM?: number;
    score?: number;
    alcance?: number;
  }[];
  height?: string;
}

const iconoLider = L.divIcon({
  className: 'custom-marker-lider',
  html: `<div style="background-color:#D73216;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export default function LiderMap({
  lat,
  lng,
  nombre,
  radioM = 500,
  color = '#D73216',
  otros = [],
  height = '300px',
}: LiderMapProps) {
  const centro: [number, number] = [lat, lng];

  const otrosUnicos = useMemo(
    () => otros.filter((o) => o.lat && o.lng && (o.lat !== lat || o.lng !== lng)),
    [otros, lat, lng]
  );

  return (
    <div style={{ height }} className="w-full overflow-hidden rounded-xl border border-secondary-200">
      <MapContainer center={centro} zoom={15} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Líder principal */}
        <Marker position={centro} icon={iconoLider}>
          <Popup>
            <div className="font-sans">
              <p className="font-bold text-secondary-900">{nombre}</p>
              <p className="text-sm text-secondary-600">Radio de influencia: {radioM} m</p>
            </div>
          </Popup>
        </Marker>
        <Circle
          center={centro}
          radius={radioM}
          pathOptions={{ color, fillColor: color, fillOpacity: 0.18, weight: 2, opacity: 0.7 }}
        />

        {/* Otros líderes cercanos */}
        {otrosUnicos.map((o) => (
          <Circle
            key={o.id}
            center={[o.lat, o.lng]}
            radius={o.radioM || 500}
            pathOptions={{
              color: '#383745',
              fillColor: '#383745',
              fillOpacity: 0.12,
              weight: 1.5,
              opacity: 0.5,
            }}
          >
            <Popup>
              <div className="font-sans">
                <p className="font-bold text-secondary-900">{o.nombre}</p>
                <p className="text-sm text-secondary-600">Alcance estimado: {o.alcance || 0} personas</p>
                {o.score !== undefined && <p className="text-sm text-secondary-600">Score: {o.score}</p>}
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
