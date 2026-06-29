'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  Circle,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { TileLayer as LeafletTileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet default marker images live in /leaflet-images to survive Next.js/Vercel bundling
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet-images/marker-icon-2x.png',
  iconUrl: '/leaflet-images/marker-icon.png',
  shadowUrl: '/leaflet-images/marker-shadow.png',
});
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet.heat';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { MapaData } from '@/types/mapa';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { errorToString } from '@/lib/error-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CENTRO_LEON: [number, number] = [21.125, -101.6858];
const ZOOM_INICIAL = 13;

export interface MapaLeafletRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (geometryOrBbox: any) => void;
  openPopup: (lat: number, lng: number, contenido?: HTMLElement) => void;
}

interface Props {
  data: MapaData;
  activas: Record<string, boolean>;
  onRecargar: () => void;
  personalizadas: { id: string; nombre: string; tipo: string; color: string }[];
  lideres?: Lider[];
  modoLideres?: 'pines' | 'circulos' | 'heatmap' | 'solo_puntos';
  puntoSeleccionado?: { lat: number; lng: number } | null;
  onSeleccionarCoordenada?: (lat: number, lng: number) => void;
  onAccionPunto?: (tipo: 'apoyo' | 'evento' | 'lider', lat: number, lng: number) => void;
  onCerrarPunto?: () => void;
  filtrosApoyos?: Record<string, boolean>;
  seleccion?: { geometry: any; properties?: any; tipo?: string; nombre?: string } | null;
}

export default forwardRef<MapaLeafletRef, Props>(function MapaLeaflet(
  { data, activas, onRecargar, personalizadas, lideres = [], modoLideres = 'pines', puntoSeleccionado, onSeleccionarCoordenada, onAccionPunto, onCerrarPunto, filtrosApoyos, seleccion },
  ref
) {
  return (
    <MapContainer
      center={CENTRO_LEON}
      zoom={ZOOM_INICIAL}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapaBridge ref={ref} />
      <ControlRecargar onRecargar={onRecargar} />
      {onSeleccionarCoordenada && <DetectorClicMapa onSeleccionar={onSeleccionarCoordenada} />}

      {activas.votantes && data.votantes && (
        <CapaVotantes data={data.votantes} />
      )}

      {activas.recorridos && data.recorridos && (
        <CapaRecorridos data={data.recorridos} />
      )}

      {activas.apoyos && data.apoyos && (
        <CapaApoyos data={data.apoyos} filtros={filtrosApoyos} />
      )}

      {activas.peticiones && data.peticiones && (
        <CapaPeticiones data={data.peticiones} />
      )}

      {activas.eventos && data.eventos && (
        <CapaEventos data={data.eventos} />
      )}

      {activas.lideres && <CapaLideres lideres={lideres} modo={modoLideres} />}

      {activas.custom && <CapaDibujo />}

      {personalizadas.map(capa => (
        activas[capa.id] && data[capa.id] && (
          <CapaPersonalizada key={capa.id} data={data[capa.id]!} color={capa.color} nombre={capa.nombre} />
        )
      ))}

      {puntoSeleccionado && onAccionPunto && onCerrarPunto && (
        <MarcadorPuntoSeleccionado
          lat={puntoSeleccionado.lat}
          lng={puntoSeleccionado.lng}
          onAccion={onAccionPunto}
          onCerrar={onCerrarPunto}
        />
      )}

      {seleccion?.geometry && <CapaSeleccionada seleccion={seleccion} />}
    </MapContainer>
  );
});

const MapaBridge = forwardRef<MapaLeafletRef, {}>(function MapaBridgeInner(_props, ref) {
  const map = useMap();
  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 16) => map.flyTo([lat, lng], zoom, { duration: 1.2 }),
    fitBounds: (geometryOrBbox) => {
      try {
        let bounds: L.LatLngBounds | null = null;
        if (Array.isArray(geometryOrBbox) && geometryOrBbox.length === 4) {
          const [minLng, minLat, maxLng, maxLat] = geometryOrBbox;
          bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        } else if (geometryOrBbox) {
          const geo = L.geoJSON(geometryOrBbox);
          bounds = geo.getBounds();
          geo.remove();
        }
        if (bounds && bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [40, 40], duration: 1.2, maxZoom: 18 });
        }
      } catch (e) {
        console.warn('fitBounds error:', e);
      }
    },
    openPopup: (lat, lng) => {
      map.flyTo([lat, lng], 16, { duration: 1.2 });
    },
  }));
  return null;
});

function DetectorClicMapa({ onSeleccionar }: { onSeleccionar: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSeleccionar(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const iconoPuntoSeleccionado = L.divIcon({
  className: 'custom-marker-punto',
  html: `
    <div style="position:relative;width:28px;height:28px;transform:translate(-50%,-50%);">
      <div style="position:absolute;inset:0;border:3px solid #D73216;border-radius:50%;background:rgba(215,50,22,0.15);"></div>
      <div style="position:absolute;inset:0;margin:auto;width:8px;height:8px;background:#D73216;border-radius:50%;"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function MarcadorPuntoSeleccionado({
  lat,
  lng,
  onAccion,
  onCerrar,
}: {
  lat: number;
  lng: number;
  onAccion: (tipo: 'apoyo' | 'evento' | 'lider', lat: number, lng: number) => void;
  onCerrar: () => void;
}) {
  return (
    <Marker
      position={[lat, lng]}
      icon={iconoPuntoSeleccionado}
      eventHandlers={{
        add: (e) => {
          e.target.openPopup();
        },
        click: (e) => {
          e.originalEvent?.stopPropagation();
        },
      }}
    >
      <Popup minWidth={220} closeButton={false}>
        <div
          className="font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-sm font-semibold text-secondary-900">¿Qué quieres agregar aquí?</p>
          <p className="mb-3 text-xs text-secondary-500">
            Lat {lat.toFixed(5)}, Lng {lng.toFixed(5)}
          </p>
          <div className="space-y-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onAccion('apoyo', lat, lng); }}
              className="flex w-full items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <Icon name="apoyos" size={14} /> Registrar apoyo
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAccion('evento', lat, lng); }}
              className="flex w-full items-center gap-2 rounded-lg bg-primary-50 px-3 py-2 text-left text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
            >
              <Icon name="eventos" size={14} /> Nuevo evento
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAccion('lider', lat, lng); }}
              className="flex w-full items-center gap-2 rounded-lg bg-secondary-100 px-3 py-2 text-left text-xs font-semibold text-secondary-700 transition hover:bg-secondary-200"
            >
              <Icon name="lideres" size={14} /> Agregar líder
            </button>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onCerrar(); }}
            className="mt-2 w-full rounded-md py-1 text-[11px] font-medium text-secondary-500 transition hover:bg-secondary-50"
          >
            Cerrar
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

function ControlRecargar({ onRecargar }: { onRecargar: () => void }) {
  const map = useMap();
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!divRef.current) return;
    const control = new (L.Control as any)({ position: 'topright' });
    control.onAdd = () => divRef.current!;
    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map]);

  return (
    <div ref={divRef} className="leaflet-bar leaflet-control">
      <button
        onClick={onRecargar}
        title="Recargar capas"
        className="flex h-9 w-9 items-center justify-center bg-white text-secondary-700 shadow-sm hover:bg-secondary-50"
      >
        <Icon name="eventos" size={18} />
      </button>
    </div>
  );
}

const COLOR_NIVEL_APOYO: Record<number, string> = {
  5: '#22C55E',
  4: '#84CC16',
  3: '#F59E0B',
  2: '#F97316',
  1: '#EF4444',
};

const LABEL_NIVEL_APOYO: Record<number, string> = {
  5: 'Muy probable',
  4: 'Probable',
  3: 'Indeciso',
  2: 'Poco probable',
  1: 'Opuesto',
};

function iconoVotante(nivel: number) {
  const color = COLOR_NIVEL_APOYO[nivel] || '#9CA3AF';
  return L.divIcon({
    className: 'custom-marker-votante',
    html: `
      <div style="position:relative;width:18px;height:18px;background-color:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function CapaVotantes({ data }: { data: any }) {
  const features = (data.features || []).filter((f: any) => f.geometry?.type === 'Point');

  return (
    <>
      {features.map((f: any) => {
        const coords = f.geometry.coordinates;
        const p = f.properties || {};
        const nivel = Number(p.nivel_apoyo) || 3;
        const color = COLOR_NIVEL_APOYO[nivel] || '#9CA3AF';
        return (
          <Marker key={p.id || Math.random()} position={[coords[1], coords[0]]} icon={iconoVotante(nivel)}>
            <Popup>
              <div className="font-sans min-w-[200px]">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="font-bold text-secondary-900">{p.nombre || 'Simpatizante'}</p>
                </div>
                {p.telefono && <p className="text-sm text-secondary-500">{p.telefono}</p>}
                {p.seccion_electoral && <p className="text-sm text-secondary-500">Sección: {p.seccion_electoral}</p>}
                {p.colonia && <p className="text-sm text-secondary-500">Colonia: {p.colonia}</p>}
                <p className="text-sm text-secondary-700">
                  Nivel de apoyo: <span className="font-semibold" style={{ color }}>{LABEL_NIVEL_APOYO[nivel] || nivel}</span>
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function CapaCalor({ data }: { data: any }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    const points = (data.features || [])
      .filter((f: any) => f.geometry?.type === 'Point')
      .map((f: any) => {
        const coords = f.geometry.coordinates;
        return [coords[1], coords[0], 0.6 + (f.properties?.nivel_apoyo || 3) * 0.1];
      });

    if (points.length === 0) return;

    const heatLayer = (L as any).heatLayer(points, {
      radius: 22,
      blur: 18,
      maxZoom: 16,
      max: 1,
      gradient: {
        0.3: '#F87171',
        0.55: '#EF4444',
        0.8: '#B91C1C',
        1: '#7F1D1D',
      },
    });

    heatLayer.addTo(map);
    layerRef.current = heatLayer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, data]);

  return null;
}

function CapaRecorridos({ data }: { data: any }) {
  return (
    <>
      {(data.features || [])
        .filter((f: any) => f.geometry?.type === 'LineString')
        .map((f: any) => {
          const positions = f.geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]);
          return (
            <Polyline
              key={f.properties?.id || Math.random()}
              positions={positions}
              pathOptions={{ color: '#D73216', weight: 3, opacity: 0.75 }}
            >
              <Popup>
                <div className="font-sans">
                  <p className="font-bold text-secondary-900">Recorrido de brigada</p>
                  <p className="text-sm text-secondary-600">{formatFecha(f.properties?.fecha)}</p>
                  {f.properties?.usuario_nombre && (
                    <p className="text-sm text-secondary-600">Por: {f.properties.usuario_nombre}</p>
                  )}
                </div>
              </Popup>
            </Polyline>
          );
        })}
    </>
  );
}

const COLOR_APOYO: Record<string, string> = {
  despensa: '#F59E0B',
  medicamento: '#3B82F6',
  lamina: '#6B7280',
  otro: '#22C55E',
};

function iconoApoyo(tipo: string) {
  const color = COLOR_APOYO[tipo] || '#9CA3AF';
  return L.divIcon({
    className: 'custom-marker-apoyo',
    html: `<div style="background-color:${color};width:16px;height:16px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function CapaApoyos({ data, filtros }: { data: any; filtros?: Record<string, boolean> }) {
  const features = (data.features || [])
    .filter((f: any) => f.geometry?.type === 'Point')
    .filter((f: any) => {
      const tipo = f.properties?.tipo_apoyo || 'otro';
      return filtros ? filtros[tipo] !== false : true;
    });

  return (
    <>
      {features.map((f: any) => {
        const coords = f.geometry.coordinates;
        const p = f.properties || {};
        const tipo = p.tipo_apoyo || 'otro';
        const color = COLOR_APOYO[tipo] || '#9CA3AF';
        return (
          <Marker key={p.id || Math.random()} position={[coords[1], coords[0]]} icon={iconoApoyo(tipo)}>
            <Popup>
              <div className="font-sans min-w-[220px]">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="font-bold text-secondary-900 capitalize">{tipo}</p>
                </div>
                {p.votante_nombre && <p className="text-sm text-secondary-700">A: {p.votante_nombre}</p>}
                <p className="text-sm text-secondary-500">{formatFecha(p.fecha_entrega)}</p>
                {p.cantidad && <p className="text-sm text-secondary-500">Cantidad: {p.cantidad}</p>}
                {p.entregado_por && <p className="text-sm text-secondary-500">Entregó: {p.entregado_por}</p>}
                {p.observaciones && <p className="text-xs text-secondary-500 mt-1">{p.observaciones}</p>}
                {p.foto_url && (
                  <img src={p.foto_url} alt="Evidencia" className="mt-2 max-w-full rounded-md object-cover" style={{ maxHeight: '160px' }} />
                )}
              </div>
              </Popup>
            </Marker>
          );
      })}
    </>
  );
}

const COLOR_PETICION: Record<string, string> = {
  bache: '#F59E0B',
  alumbrado: '#FACC15',
  agua: '#3B82F6',
  seguridad: '#EF4444',
  limpia: '#22C55E',
  salud: '#8B5CF6',
  otro: '#6B7280',
};

function iconoPeticion(categoria: string, prioridad: string) {
  const color = COLOR_PETICION[categoria] || '#6B7280';
  const size = prioridad === 'critica' ? 24 : prioridad === 'alta' ? 20 : 16;
  return L.divIcon({
    className: 'custom-marker-peticion',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;background-color:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
        <svg width="${size * 0.55}" height="${size * 0.55}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 9v4" /><circle cx="12" cy="12" r="10" /><path d="M12 17h.01" />
        </svg>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function CapaPeticiones({ data }: { data: any }) {
  const features = (data.features || [])
    .filter((f: any) => f.geometry?.type === 'Point');

  return (
    <>
      {features.map((f: any) => {
        const coords = f.geometry.coordinates;
        const p = f.properties || {};
        const categoria = p.categoria || 'otro';
        const prioridad = p.prioridad || 'media';
        const color = COLOR_PETICION[categoria] || '#6B7280';
        return (
          <Marker key={p.id || Math.random()} position={[coords[1], coords[0]]} icon={iconoPeticion(categoria, prioridad)}>
            <Popup>
              <div className="font-sans min-w-[220px]">
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <p className="font-bold text-secondary-900 capitalize">{ p.titulo || categoria }</p>
                </div>
                {p.descripcion && <p className="text-sm text-secondary-700">{p.descripcion}</p>}
                {p.votante_nombre && <p className="text-sm text-secondary-500">Reportó: {p.votante_nombre}</p>}
                <p className="text-sm text-secondary-500 capitalize">Categoría: {categoria} • Prioridad: {prioridad}</p>
                <p className="text-sm font-medium capitalize" style={{ color }} >Estatus: {p.estatus || 'reportada'}</p>
                {p.foto_url && <img src={p.foto_url} alt="Evidencia" className="mt-2 max-w-full rounded-md object-cover" style={{ maxHeight: '160px' }} />}
                <p className="mt-1 text-xs text-secondary-400">{formatFecha(p.created_at)}</p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function CapaEventos({ data }: { data: any }) {
  const icon = L.divIcon({
    className: 'custom-marker-evento',
    html: `<div style="background-color:#D73216;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

  return (
    <>
      {(data.features || [])
        .filter((f: any) => f.geometry?.type === 'Point')
        .map((f: any) => {
          const coords = f.geometry.coordinates;
          const p = f.properties || {};
          return (
            <Marker key={p.id || Math.random()} position={[coords[1], coords[0]]} icon={icon}>
              <Popup>
                <div className="font-sans min-w-[200px]">
                  <p className="font-bold text-secondary-900">{p.nombre}</p>
                  {p.direccion && <p className="text-sm text-secondary-600">{p.direccion}</p>}
                  <p className="text-sm text-secondary-500">{formatFecha(p.fecha_inicio)}</p>
                  <span className="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                    {p.status || 'programado'}
                  </span>
                </div>
              </Popup>
            </Marker>
          );
        })}
    </>
  );
}

function iconoLider() {
  return L.divIcon({
    className: 'custom-marker-lider',
    html: `
      <div style="position:relative;width:28px;height:28px;">
        <div style="position:absolute;inset:0;background-color:#D73216;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
        <svg style="position:absolute;inset:0;margin:auto;width:14px;height:14px;" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function popupLiderHTML(l: Lider) {
  const v = l.votante;
  return `
    <div class="font-sans min-w-[220px]">
      <div class="mb-2 flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
        </div>
        <div>
          <p class="font-bold text-secondary-900">${v?.nombre || 'Líder'}</p>
          ${v?.telefono ? `<p class="text-xs text-secondary-500">${v.telefono}</p>` : ''}
        </div>
      </div>
      <div class="space-y-1 text-sm text-secondary-700">
        ${v?.seccion_electoral ? `<p><span class="font-medium">Sección:</span> ${v.seccion_electoral}</p>` : ''}
        ${v?.colonia ? `<p><span class="font-medium">Colonia:</span> ${v.colonia}</p>` : ''}
        <p><span class="font-medium">Alcance estimado:</span> ${l.alcance_estimado || 0} personas</p>
        <p><span class="font-medium">Score:</span> ${l.score ?? 0} pts</p>
      </div>
      <a
        href="/dashboard/lideres/${l.id}"
        class="mt-3 block rounded-md bg-primary-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-primary-700"
      >
        Ver ficha completa
      </a>
    </div>
  `;
}

function CapaLideres({ lideres, modo }: { lideres: Lider[]; modo: 'pines' | 'circulos' | 'heatmap' | 'solo_puntos' }) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatRef = useRef<L.Layer | null>(null);
  const circlesRef = useRef<L.LayerGroup | null>(null);

  const conCoords = lideres.filter((l) => {
    const c = l.votante?.coordenadas;
    return c && typeof c.lat === 'number' && typeof c.lng === 'number';
  });

  useEffect(() => {
    function limpiarCapas() {
      if (clusterRef.current) {
        try {
          map.removeLayer(clusterRef.current);
        } catch {}
        clusterRef.current = null;
      }
      if (heatRef.current) {
        try {
          map.removeLayer(heatRef.current);
        } catch {}
        heatRef.current = null;
      }
      if (circlesRef.current) {
        try {
          map.removeLayer(circlesRef.current);
        } catch {}
        circlesRef.current = null;
      }
    }

    // Siempre limpiar primero para evitar capas fantasmas al cambiar filtros/modo
    limpiarCapas();

    if (conCoords.length === 0) {
      return limpiarCapas;
    }

    if (modo === 'heatmap') {
      const points = conCoords.map((l) => {
        const c = l.votante!.coordenadas!;
        const intensity = Math.min(1, ((l.score ?? 0) / 100) + 0.3);
        return [c.lat, c.lng, intensity];
      });

      const heatLayer = (L as any).heatLayer(points, {
        radius: 25,
        blur: 20,
        maxZoom: 16,
        max: 1,
        gradient: {
          0.3: '#FCA5A5',
          0.55: '#EF4444',
          0.8: '#B91C1C',
          1: '#7F1D1D',
        },
      });

      map.addLayer(heatLayer);
      heatRef.current = heatLayer;
      return limpiarCapas;
    }

    if (modo === 'circulos') {
      const group = L.layerGroup();
      conCoords.forEach((l) => {
        const c = l.votante!.coordenadas!;
        const radio = (l.alcance_estimado || 50) * 8;
        const circle = L.circle([c.lat, c.lng], {
          radius: radio,
          color: '#D73216',
          fillColor: '#D73216',
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.6,
          dashArray: '4 6',
        });
        circle.bindPopup(popupLiderHTML(l));
        group.addLayer(circle);
      });
      map.addLayer(group);
      circlesRef.current = group;
      return limpiarCapas;
    }

    // Pines o solo puntos: usar clustering
    const group = (L as any).markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 60,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          className: 'custom-cluster-lider',
          html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background-color:#D73216;color:white;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);font-size:12px;font-weight:700;font-family:sans-serif;">${count}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
      },
    });

    conCoords.forEach((l) => {
      const c = l.votante!.coordenadas!;
      const marker = L.marker([c.lat, c.lng], { icon: iconoLider() });
      marker.bindPopup(popupLiderHTML(l));
      group.addLayer(marker);
    });

    if (modo === 'pines') {
      const circles = L.layerGroup();
      conCoords.forEach((l) => {
        const c = l.votante!.coordenadas!;
        const radio = (l.alcance_estimado || 50) * 8;
        const circle = L.circle([c.lat, c.lng], {
          radius: radio,
          color: '#D73216',
          fillColor: '#D73216',
          fillOpacity: 0.12,
          weight: 2,
          opacity: 0.6,
          dashArray: '4 6',
        });
        circles.addLayer(circle);
      });
      map.addLayer(circles);
      circlesRef.current = circles;
    }

    map.addLayer(group);
    clusterRef.current = group as L.MarkerClusterGroup;

    return limpiarCapas;
  }, [map, conCoords, modo]);

  return null;
}

function formatearResultadoHistorico(rh: any): string {
  if (!rh) return '';
  const partes = [
    `<span class="font-medium">Último resultado histórico</span>`,
    `<span class="font-medium">Año:</span> ${rh.anio}`,
    `<span class="font-medium">Ganador:</span> ${rh.partido_ganador || 'N/D'}`,
  ];
  if (rh.votos_totales != null) partes.push(`<span class="font-medium">Votos emitidos:</span> ${Number(rh.votos_totales).toLocaleString()}`);
  if (rh.participacion_pct != null) partes.push(`<span class="font-medium">Participación:</span> ${rh.participacion_pct}%`);
  return `<div class="mt-2 rounded-md bg-secondary-50 p-2 text-xs text-secondary-700">${partes.join(' • ')}</div>`;
}

function formatearResultadoHistoricoAnio(rh: any, anio: number): string {
  if (!rh || (rh.partido_ganador == null && rh.votos_ganador == null && rh.votos_totales == null)) return '';
  const partes: string[] = [`<span class="font-bold">${anio}</span>`];
  if (rh.partido_ganador != null) partes.push(`Ganador: ${rh.partido_ganador}`);
  if (rh.votos_ganador != null) partes.push(`Votos ganador: ${Number(rh.votos_ganador).toLocaleString()}`);
  if (rh.votos_totales != null) partes.push(`Votos totales: ${Number(rh.votos_totales).toLocaleString()}`);
  if (rh.participacion_pct != null) partes.push(`Participación: ${rh.participacion_pct}%`);
  if (rh.votos_nulos != null) partes.push(`Nulos: ${Number(rh.votos_nulos).toLocaleString()}`);
  return `<div class="mt-1 rounded-md bg-secondary-50 p-2 text-xs text-secondary-700">${partes.join(' • ')}</div>`;
}

function formatearValorSimple(value: any): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }
  return String(value);
}

const CAMPOS_OCULTOS = new Set([
  'geometry', 'capa_id', 'capa_nombre', 'capa_tipo', 'capa_origen', 'color', 'id',
]);

function popupPersonalizadoHTML(nombreCapa: string, color: string, props: Record<string, any>, tipo?: string) {
  const titleKey = ['nombre', 'NOMBRE', 'name', 'NAME', 'nomgeo', 'NOMGEO', 'nom_loc', 'NOM_LOC'].find(k => props[k]);
  const title = titleKey ? props[titleKey] : nombreCapa;

  const campos = Object.entries(props)
    .filter(([k, v]) => v != null && v !== '' && !CAMPOS_OCULTOS.has(k.toLowerCase()))
    .slice(0, 12)
    .map(([k, v]) => `<p class="truncate"><span class="font-medium text-secondary-900">${k}:</span> ${formatearValorSimple(v)}</p>`)
    .join('');

  return `
    <div class="font-sans min-w-[220px] max-w-[280px]">
      <div class="mb-2 border-b-2 pb-1.5" style="border-color: ${color}">
        <p class="text-base font-bold text-secondary-900 leading-tight">${title}</p>
        ${title !== nombreCapa ? `<p class="text-xs text-secondary-500">${nombreCapa}</p>` : ''}
      </div>
      <div class="space-y-1 text-sm text-secondary-700 max-h-[240px] overflow-auto pr-1">
        ${campos || '<p class="text-secondary-500">Sin propiedades</p>'}
      </div>
    </div>
  `;
}

function CapaPersonalizada({ data, color, nombre }: { data: any; color: string; nombre: string; tipo?: string }) {
  const style = () => ({
    fillColor: color,
    color: color,
    weight: 2,
    opacity: 0.9,
    fillOpacity: 0.35,
  });

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties || {};
    layer.bindPopup(popupPersonalizadoHTML(nombre, color, props));
  };

  return <GeoJSON data={data} style={style} onEachFeature={onEachFeature} />;
}

function CapaDibujo() {
  const map = useMap();
  const drawRef = useRef<any>(null);

  useEffect(() => {
    if (!map || drawRef.current) return;

    const drawnItems = new (L as any).FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new (L as any).Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);
    drawRef.current = { drawControl, drawnItems };

    const onCreated = (e: any) => {
      drawnItems.addLayer(e.layer);
      // Aquí se podría guardar en backend
      console.log('Dibujo creado:', e.layer.toGeoJSON());
    };

    map.on((L as any).Draw.Event.CREATED, onCreated);

    return () => {
      map.off((L as any).Draw.Event.CREATED, onCreated);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
      drawRef.current = null;
    };
  }, [map]);

  return null;
}

function CapaSeleccionada({ seleccion }: { seleccion: { geometry: any; properties?: any; tipo?: string; nombre?: string } }) {
  const { geometry, properties, tipo, nombre } = seleccion;
  const key = JSON.stringify(geometry);

  const style = () => ({
    fillColor: '#D73216',
    color: '#D73216',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.15,
    dashArray: '4 6',
  });

  const pointToLayer = (_feature: any, latlng: L.LatLng) => {
    return L.circleMarker(latlng, {
      radius: 10,
      fillColor: '#D73216',
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.8,
    });
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties || properties || {};
    const title = nombre || props.nombre || props.seccion || props.NOMGEO || props.NOMBRE || 'Selección';
    layer.bindPopup(`
      <div class="font-sans min-w-[180px]">
        <p class="text-sm font-bold text-secondary-900 mb-1">${title}</p>
        <p class="text-xs text-secondary-500 capitalize">${tipo || props.tipo || 'Territorio seleccionado'}</p>
      </div>
    `);
  };

  return (
    <GeoJSON
      key={key}
      data={geometry}
      style={style}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
    />
  );
}

function formatFecha(fecha?: string) {
  if (!fecha) return '';
  try {
    return format(new Date(fecha), "d 'de' MMMM, h:mm a", { locale: es });
  } catch {
    return fecha;
  }
}
