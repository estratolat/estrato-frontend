'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet-images/marker-icon-2x.png',
  iconUrl: '/leaflet-images/marker-icon.png',
  shadowUrl: '/leaflet-images/marker-shadow.png',
});

interface AnioData {
  votos_bloque: number;
  votos_ganador: number;
  gano_bloque: boolean;
  pct_bloque: number;
  total_votos: number;
  votos_validos: number;
  ganador?: string;
}

interface SeccionCruce {
  seccion: string;
  clasificacion: string;
  veces_gana: number;
  total_anios: number;
  tendencia: number;
  anios: Record<string, AnioData>;
}

interface Props {
  seccionesINE: any[];
  cruce: SeccionCruce[];
  bloque?: string[];
  cargando?: boolean;
}

const COLOR_POR_CLASIFICACION: Record<string, string> = {
  BASTION: '#16a34a',
  VOLATIL_GANA: '#84cc16',
  VOLATIL_PIERDE: '#f97316',
  RIVAL: '#dc2626',
};

const LABEL_CLASIFICACION: Record<string, string> = {
  BASTION: 'Bastión',
  VOLATIL_GANA: 'Volátil - gana',
  VOLATIL_PIERDE: 'Volátil - pierde',
  RIVAL: 'Territorio rival',
};

export default function MapaCruceHistorico({ seccionesINE, cruce, bloque, cargando }: Props) {
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);

  const geojson = useMemo(() => {
    if (!seccionesINE?.length) return null;
    const cruceMap = new Map(cruce.map((s) => [s.seccion.padStart(4, '0'), s]));

    const features = seccionesINE
      .filter((s) => s.coordenadas)
      .map((s) => {
        const seccionKey = String(s.seccion).padStart(4, '0');
        const datos = cruceMap.get(seccionKey);
        const clasificacion = datos?.clasificacion || 'SIN_DATOS';
        const color = COLOR_POR_CLASIFICACION[clasificacion] || '#9CA3AF';
        return {
          type: 'Feature' as const,
          geometry: s.coordenadas,
          properties: {
            seccion: s.seccion,
            seccion_formateada: seccionKey,
            clasificacion,
            label_clasificacion: LABEL_CLASIFICACION[clasificacion] || 'Sin datos',
            color,
            datos: datos?.anios || {},
            veces_gana: datos?.veces_gana ?? 0,
            total_anios: datos?.total_anios ?? 0,
            tendencia: datos?.tendencia ?? 0,
            bloque: bloque || [],
          },
        };
      });

    return { type: 'FeatureCollection' as const, features };
  }, [seccionesINE, cruce, bloque]);

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
    const p = feature?.properties || {};
    const esBastion = p.clasificacion === 'BASTION';
    return {
      fillColor: p.color || '#9CA3AF',
      color: '#FFFFFF',
      weight: 1,
      opacity: 1,
      fillOpacity: esBastion ? 0.7 : 0.55,
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const p = feature.properties || {};
    const anios = Object.keys(p.datos || {}).sort((a, b) => Number(b) - Number(a));
    const filas = anios
      .map((anio) => {
        const d = p.datos[anio];
        const ganador = d.gano_bloque ? '✅ Nosotros' : `⚠️ ${d.ganador || 'Otro'}`;
        return `
          <tr>
            <td class="px-2 py-1">${anio}</td>
            <td class="px-2 py-1 text-right">${d.votos_bloque.toLocaleString()}</td>
            <td class="px-2 py-1 text-right">${d.pct_bloque}%</td>
            <td class="px-2 py-1">${ganador}</td>
          </tr>
        `;
      })
      .join('');

    const popup = `
      <div class="font-sans text-sm min-w-[240px]">
        <p class="font-bold text-base mb-1">Sección ${p.seccion}</p>
        <p class="mb-2">
          <span class="inline-block rounded px-2 py-0.5 text-white text-xs font-semibold" style="background:${p.color}">
            ${p.label_clasificacion}
          </span>
          <span class="ml-2 text-secondary-500">${p.veces_gana}/${p.total_anios} ganadas</span>
        </p>
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr class="text-left text-secondary-500">
              <th class="px-2 py-1">Año</th>
              <th class="px-2 py-1 text-right">Bloque</th>
              <th class="px-2 py-1 text-right">%</th>
              <th class="px-2 py-1">Ganador</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
        <p class="mt-2 text-xs text-secondary-500">Tendencia (último vs primero): <strong>${(p.tendencia > 0 ? '+' : '') + p.tendencia.toLocaleString()} votos</strong></p>
        ${p.bloque?.length ? `<p class="text-xs text-secondary-400">Bloque: ${p.bloque.join(', ')}</p>` : ''}
      </div>
    `;
    layer.bindPopup(popup);
  };

  if (cargando) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-secondary-50">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!geojson?.features?.length) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-lg bg-secondary-50 text-secondary-500">
        No hay polígonos de secciones disponibles. Carga la capa de secciones en el Mapa Territorial.
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
      <GeoJSON data={geojson} style={styleFeature} onEachFeature={onEachFeature} />
    </MapContainer>
  );
}
