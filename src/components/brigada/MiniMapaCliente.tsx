'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icon } from '@/components/ui/Icon';

const CENTRO_LEON: [number, number] = [21.125, -101.6858];

const iconoUbicacion = L.divIcon({
  className: 'custom-marker-brigada',
  html: `
    <div style="position:relative;width:28px;height:28px;transform:translate(-50%,-100%);">
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid #D73216;"></div>
      <div style="position:absolute;top:0;left:0;width:28px;height:28px;background:#D73216;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5"><circle cx="12" cy="12" r="3"/></svg>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
}

function CentroMarcador({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const map = useMap();

  useEffect(() => {
    if (lat != null && lng != null) {
      map.flyTo([lat, lng], 17, { duration: 0.8 });
    }
  }, [lat, lng, map]);

  return null;
}

function DetectorClic({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MiniMapaCliente({ lat, lng, onChange, height = '220px' }: Props) {
  const position: [number, number] =
    lat != null && lng != null ? [lat, lng] : CENTRO_LEON;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="label text-sm">Ubicación en el mapa *</label>
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => onChange(pos.coords.latitude, pos.coords.longitude),
              () => alert('No se pudo obtener la ubicación. Toca el mapa manualmente.')
            );
          }}
          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <Icon name="mapa" size={14} /> Usar mi ubicación
        </button>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-lg border border-secondary-200"
        style={{ height }}
      >
        <MapContainer
          center={position}
          zoom={lat != null && lng != null ? 17 : 13}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='© OpenStreetMap'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <DetectorClic onChange={onChange} />
          <CentroMarcador lat={lat} lng={lng} />
          {lat != null && lng != null && (
            <Marker position={[lat, lng]} icon={iconoUbicacion} />
          )}
        </MapContainer>

        {lat == null || lng == null ? (
          <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-black/5">
            <p className="rounded-full bg-white px-3 py-1 text-xs font-medium text-secondary-700 shadow">
              Toca el mapa o usa tu ubicación
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          step="any"
          value={lat ?? ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && lng != null) onChange(val, lng);
          }}
          placeholder="Latitud"
          className="input text-xs"
        />
        <input
          type="number"
          step="any"
          value={lng ?? ''}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && lat != null) onChange(lat, val);
          }}
          placeholder="Longitud"
          className="input text-xs"
        />
      </div>
    </div>
  );
}
