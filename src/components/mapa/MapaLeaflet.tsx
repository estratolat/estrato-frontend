'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
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
import { MapaData, ResultadoGlobal, GeoJSONCollection } from '@/types/mapa';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';
import { errorToString } from '@/lib/error-utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const CENTRO_LEON: [number, number] = [21.125, -101.6858];
const ZOOM_INICIAL = 13;
const CENTRO_STORAGE_KEY = 'mapa-centro';
const RESALTAR_REINTENTOS = 40;
const RESALTAR_INTERVALO = 300;

import { shouldIgnoreMoveEnd, registerProgrammaticMove } from './mapa-move-utils';

function getCentroInicial(): { center: [number, number]; zoom: number } {
  if (typeof window === 'undefined') {
    return { center: CENTRO_LEON, zoom: ZOOM_INICIAL };
  }
  try {
    const raw = localStorage.getItem(CENTRO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed.center) &&
        parsed.center.length === 2 &&
        typeof parsed.center[0] === 'number' &&
        typeof parsed.center[1] === 'number' &&
        typeof parsed.zoom === 'number'
      ) {
        return { center: parsed.center, zoom: parsed.zoom };
      }
    }
  } catch {
    // ignore
  }
  return { center: CENTRO_LEON, zoom: ZOOM_INICIAL };
}

export interface MapaLeafletRef {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
  fitBounds: (geometryOrBbox: any) => void;
  openPopup: (lat: number, lng: number, contenido?: HTMLElement) => void;
  resaltarFeature: (capaId: string, featureId: string, geometry?: any) => void;
}

interface Props {
  data: MapaData;
  activas: Record<string, boolean>;
  onRecargar: () => void;
  personalizadas: { id: string; nombre: string; tipo: string; color: string; bloqueada?: boolean; orden?: number }[];
  lideres?: Lider[];
  modoLideres?: 'pines' | 'circulos' | 'heatmap' | 'solo_puntos';
  puntoSeleccionado?: { lat: number; lng: number } | null;
  onSeleccionarCoordenada?: (lat: number, lng: number) => void;
  onAccionPunto?: (tipo: 'apoyo' | 'evento' | 'lider', lat: number, lng: number) => void;
  onCerrarPunto?: () => void;
  onEditarLider?: (lider: Lider) => void;
  onEditarEvento?: (props: Record<string, any>) => void;
  filtrosApoyos?: Record<string, boolean>;
  seleccion?: { geometry: any; properties?: any; tipo?: string; nombre?: string } | null;
  onFeatureClick?: (capaId: string, featureId: string, props: Record<string, any>) => void;
  resultadoDestacado?: ResultadoGlobal | null;
  onBoundsChange?: (bounds: { south: number; west: number; north: number; east: number }) => void;
}

// Refs compartidos entre MapaBridge y CapaPersonalizada para resaltar features
const highlightRef: { layer: L.GeoJSON | null; timer: any } = { layer: null, timer: null };
let pendingHighlight: { capaId: string; featureId: string; intentos: number } | null = null;

export default forwardRef<MapaLeafletRef, Props>(function MapaLeaflet(
  { data, activas, onRecargar, personalizadas, lideres = [], modoLideres = 'pines', puntoSeleccionado, onSeleccionarCoordenada, onAccionPunto, onCerrarPunto, onEditarLider, onEditarEvento, filtrosApoyos, seleccion, onFeatureClick, resultadoDestacado, onBoundsChange },
  ref
) {
  const capasGeoJSONRef = useRef<Map<string, L.GeoJSON>>(new Map());
  const centroInicial = useRef(getCentroInicial()).current;

  const handleCapaRender = useCallback((capaId: string) => {
    if (pendingHighlight && pendingHighlight.capaId === capaId) {
      setTimeout(() => {
        (ref as any)?.current?.resaltarFeature?.(pendingHighlight!.capaId, pendingHighlight!.featureId);
      }, 80);
    }
  }, []);

  return (
    <MapContainer
      center={centroInicial.center}
      zoom={centroInicial.zoom}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <MapaBridge ref={ref} capasGeoJSONRef={capasGeoJSONRef} />
      <ControlRecargar onRecargar={onRecargar} />
      <GuardarCentro />
      {onBoundsChange && <ManejadorBounds onBoundsChange={onBoundsChange} />}
      {onSeleccionarCoordenada && <DetectorClicMapa onSeleccionar={onSeleccionarCoordenada} />}

      <ManejadorResultadoDestacado resultado={resultadoDestacado} capasGeoJSONRef={capasGeoJSONRef} />

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
        <CapaEventos data={data.eventos} onEditar={onEditarEvento} />
      )}

      {activas.lideres && <CapaLideres lideres={lideres} modo={modoLideres} onEditar={onEditarLider} />}

      {activas.custom && <CapaDibujo />}

      {personalizadas.map(capa => (
        activas[capa.id] && data[capa.id] && (
          <CapaPersonalizada
            key={capa.id}
            data={data[capa.id]!}
            capa={capa}
            capasGeoJSONRef={capasGeoJSONRef}
            onFeatureClick={onFeatureClick}
            onRender={() => handleCapaRender(capa.id)}
          />
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

interface MapaBridgeProps {
  capasGeoJSONRef?: React.RefObject<Map<string, L.GeoJSON>>;
}

const MapaBridge = forwardRef<MapaLeafletRef, MapaBridgeProps>(function MapaBridgeInner({ capasGeoJSONRef }, ref) {
  const map = useMap();

  useEffect(() => {
    // Pane especial para que la capa sindical STASE quede por encima de colonias/distritos
    if (!map.getPane('sindical')) {
      map.createPane('sindical');
      map.getPane('sindical')!.style.zIndex = '640';
    }
  }, [map]);

  const resaltarFeature = useCallback((capaId: string, featureId: string, geometryFallback?: any) => {
    try {
      const geoLayer = capasGeoJSONRef?.current?.get(capaId);
      if (!geoLayer) {
        console.warn('[MapaBridge] resaltarFeature: capa no encontrada', capaId, '— se reintentará');
        pendingHighlight = { capaId, featureId, intentos: 1 };
        return;
      }

      const layers = geoLayer.getLayers() as L.Layer[];
      const target = layers.find((l: any) => {
        const p = l.feature?.properties || {};
        return String(p._feature_id) === String(featureId);
      }) as L.Layer | undefined;

      if (!target) {
        console.warn('[MapaBridge] resaltarFeature: feature no encontrado', featureId, 'en capa', capaId, 'capa tiene', layers.length, 'layers');
        pendingHighlight = { capaId, featureId, intentos: 1 };
        return;
      }

      pendingHighlight = null;

      const bounds = (target as any).getBounds ? (target as any).getBounds() : null;
      if (bounds?.isValid?.()) {
        // Ajustar el mapa para que el polígono ocupe toda la vista
        registerProgrammaticMove(1200);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      } else if (geometryFallback) {
        const fallback = L.geoJSON(geometryFallback);
        const fb = fallback.getBounds();
        fallback.remove();
        if (fb?.isValid?.()) {
          registerProgrammaticMove(1200);
          map.fitBounds(fb, { padding: [60, 60], maxZoom: 16, animate: true });
        }
      } else if ((target as any).getLatLng) {
        const ll = (target as any).getLatLng();
        registerProgrammaticMove(1200);
        map.flyTo(ll, 16, { duration: 1.2 });
      }

      // highlight temporal
      if (highlightRef.layer) {
        try { map.removeLayer(highlightRef.layer); } catch {}
      }
      if (highlightRef.timer) clearTimeout(highlightRef.timer);

      const featureGeo = (target as any).feature || geometryFallback;
      if (!featureGeo) {
        console.warn('[MapaBridge] resaltarFeature: no hay geometría para resaltar', featureId);
        return;
      }
      const highlight = L.geoJSON(featureGeo, {
        style: {
          fillColor: '#D73216',
          color: '#D73216',
          weight: 4,
          opacity: 1,
          fillOpacity: 0.25,
          dashArray: '6 6',
        },
        pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
          radius: 12,
          fillColor: '#D73216',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
        }),
      });
      highlight.addTo(map);
      highlightRef.layer = highlight;
      highlightRef.timer = setTimeout(() => {
        try { map.removeLayer(highlight); } catch {}
        highlightRef.layer = null;
      }, 5000);
    } catch (e) {
      console.warn('[MapaBridge] resaltarFeature error:', e);
    }
  }, [map, capasGeoJSONRef]);

  // Reintento automático mientras haya un highlight pendiente
  useEffect(() => {
    const interval = setInterval(() => {
      if (!pendingHighlight) return;
      if (pendingHighlight.intentos >= RESALTAR_REINTENTOS) {
        console.warn('[MapaBridge] highlight pendiente abandonado tras', RESALTAR_REINTENTOS, 'intentos:', pendingHighlight);
        pendingHighlight = null;
        return;
      }
      pendingHighlight.intentos += 1;
      resaltarFeature(pendingHighlight.capaId, pendingHighlight.featureId);
    }, RESALTAR_INTERVALO);
    return () => clearInterval(interval);
  }, [resaltarFeature]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, zoom = 16) => map.flyTo([lat, lng], zoom, { duration: 1.2 }),
    fitBounds: (geometryOrBbox) => {
      try {
        console.log('[MapaBridge] fitBounds input:', geometryOrBbox);
        let bounds: L.LatLngBounds | null = null;
        if (Array.isArray(geometryOrBbox) && geometryOrBbox.length === 4) {
          const [minLng, minLat, maxLng, maxLat] = geometryOrBbox;
          bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        } else if (geometryOrBbox?.bbox) {
          const [minLng, minLat, maxLng, maxLat] = geometryOrBbox.bbox;
          bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        } else if (geometryOrBbox) {
          const geo = L.geoJSON(geometryOrBbox);
          bounds = geo.getBounds();
          geo.remove();
        }
        console.log('[MapaBridge] fitBounds computed:', bounds?.isValid?.() ? bounds.toBBoxString() : 'invalid');
        if (bounds && bounds.isValid()) {
          registerProgrammaticMove(1200);
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18, animate: true });
        } else {
          console.warn('[MapaBridge] fitBounds: bounds inválido', geometryOrBbox);
        }
      } catch (e) {
        console.warn('[MapaBridge] fitBounds error:', e);
      }
    },
    openPopup: (lat, lng) => {
      registerProgrammaticMove(1200);
      map.flyTo([lat, lng], 16, { duration: 1.2 });
    },
    resaltarFeature: (capaId, featureId, geometry) => resaltarFeature(capaId, featureId, geometry),
  }), [map, resaltarFeature]);
  return null;
});

function ManejadorResultadoDestacado({
  resultado,
  capasGeoJSONRef,
}: {
  resultado?: ResultadoGlobal | null;
  capasGeoJSONRef: React.RefObject<Map<string, L.GeoJSON>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!resultado) return;
    console.log('[ManejadorResultadoDestacado] resultado:', resultado.id, resultado.tipo, 'bbox:', resultado.bbox, 'capaId:', resultado.capaId, 'featureId:', resultado.featureId);

    // Zoom inmediato al bbox o geometría
    try {
      let bounds: L.LatLngBounds | null = null;
      if (Array.isArray(resultado.bbox) && resultado.bbox.length === 4) {
        const [minLng, minLat, maxLng, maxLat] = resultado.bbox;
        bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
      } else if (resultado.geometry) {
        const geo = L.geoJSON(resultado.geometry);
        bounds = geo.getBounds();
        geo.remove();
      }
      if (bounds && bounds.isValid()) {
        console.log('[ManejadorResultadoDestacado] haciendo fitBounds');
        registerProgrammaticMove(1200);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      } else {
        console.warn('[ManejadorResultadoDestacado] bounds inválido');
      }
    } catch (e) {
      console.warn('[ManejadorResultadoDestacado] fitBounds error:', e);
    }

    // Intentar resaltar feature dentro de la capa padre
    if (resultado.tipo === 'capa_feature' && resultado.capaId && resultado.featureId) {
      const intentarResaltar = () => {
        try {
          const geoLayer = capasGeoJSONRef.current?.get(resultado.capaId!);
          if (!geoLayer) {
            console.log('[ManejadorResultadoDestacado] capa aún no renderizada, reintentando...');
            return false;
          }
          const layers = geoLayer.getLayers() as L.Layer[];
          const target = layers.find((l: any) => {
            const p = l.feature?.properties || {};
            return String(p._feature_id) === String(resultado.featureId);
          }) as L.Layer | undefined;

          if (!target) {
            console.log('[ManejadorResultadoDestacado] feature no encontrado, reintentando...');
            return false;
          }

          // Highlight temporal
          if (highlightRef.layer) {
            try { map.removeLayer(highlightRef.layer); } catch {}
          }
          if (highlightRef.timer) clearTimeout(highlightRef.timer);

          const featureGeo = (target as any).feature || resultado.geometry;
          const highlight = L.geoJSON(featureGeo, {
            style: {
              fillColor: '#D73216',
              color: '#D73216',
              weight: 4,
              opacity: 1,
              fillOpacity: 0.25,
              dashArray: '6 6',
            },
            pointToLayer: (_f, latlng) => L.circleMarker(latlng, {
              radius: 12,
              fillColor: '#D73216',
              color: '#fff',
              weight: 3,
              opacity: 1,
              fillOpacity: 0.8,
            }),
          });
          highlight.addTo(map);
          highlightRef.layer = highlight;
          highlightRef.timer = setTimeout(() => {
            try { map.removeLayer(highlight); } catch {}
            highlightRef.layer = null;
          }, 5000);
          return true;
        } catch (e) {
          console.warn('[ManejadorResultadoDestacado] resaltar error:', e);
          return false;
        }
      };

      // Reintentos progresivos
      if (!intentarResaltar()) {
        let intentos = 0;
        const interval = setInterval(() => {
          intentos += 1;
          if (intentarResaltar() || intentos >= 20) {
            clearInterval(interval);
            if (intentos >= 20) {
              console.warn('[ManejadorResultadoDestacado] abandonado tras 20 intentos');
            }
          }
        }, 250);
      }
    }
  }, [resultado, map, capasGeoJSONRef]);

  return null;
}

function GuardarCentro() {
  const map = useMap();
  useMapEvents({
    moveend: () => {
      if (typeof window === 'undefined') return;
      const center = map.getCenter();
      const zoom = map.getZoom();
      try {
        localStorage.setItem(
          CENTRO_STORAGE_KEY,
          JSON.stringify({ center: [center.lat, center.lng], zoom })
        );
      } catch {
        // ignore
      }
    },
  });
  return null;
}

function DetectorClicMapa({ onSeleccionar }: { onSeleccionar: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSeleccionar(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function ManejadorBounds({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: { south: number; west: number; north: number; east: number }) => void;
}) {
  const map = useMap();
  const notificar = useCallback(() => {
    if (shouldIgnoreMoveEnd()) return;
    const b = map.getBounds();
    onBoundsChange({
      south: b.getSouth(),
      west: b.getWest(),
      north: b.getNorth(),
      east: b.getEast(),
    });
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (shouldIgnoreMoveEnd()) return;
    notificar();
  }, [notificar]);

  useMapEvents({
    moveend: notificar,
    zoomend: notificar,
  });

  return null;
}

function ControlRecargar({ onRecargar }: { onRecargar: () => void }) {
  return null;
}

function CapaVotantes({ data }: { data: any }) {
  return null;
}

function CapaRecorridos({ data }: { data: any }) {
  return null;
}

function CapaApoyos({ data, filtros }: { data: any; filtros?: Record<string, boolean> }) {
  return null;
}

function CapaPeticiones({ data }: { data: any }) {
  return null;
}

function colorPorScore(score = 0) {
  return score >= 80 ? '#16A34A' : score >= 50 ? '#F59E0B' : '#EF4444';
}

function popupLider(l: Lider, onEditar?: (lider: Lider) => void): string {
  const nombre = escaparHtml(l.votante?.nombre || 'Líder');
  const seccion = l.votante?.seccion_electoral || 'Sin sección';
  const colonia = l.votante?.colonia || 'Sin colonia';
  const score = l.score ?? 0;
  const alcance = l.alcance_estimado ?? 0;
  const esPadre = !l.lider_padre_id;
  const editarBtn = onEditar
    ? `<button
        id="lider-edit-btn-${l.id}"
        class="mt-2 w-full rounded-md bg-primary-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
      >
        Editar líder
      </button>`
    : '';
  return `
    <div class="min-w-[200px] font-sans">
      <p class="text-sm font-bold text-secondary-900">${nombre}</p>
      <p class="text-[10px] uppercase tracking-wide text-secondary-500 mb-2">${esPadre ? 'Líder principal' : 'Estructura'} • Score ${score}</p>
      <div class="space-y-1 text-xs text-secondary-700">
        <div><span class="font-semibold">Sección:</span> ${seccion}</div>
        <div><span class="font-semibold">Colonia:</span> ${colonia}</div>
        <div><span class="font-semibold">Alcance estimado:</span> ${alcance}</div>
      </div>
      ${editarBtn}
    </div>
  `;
}

function CapaLideres({ lideres, modo, onEditar }: { lideres: Lider[]; modo?: string; onEditar?: (lider: Lider) => void }) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    // Limpiar capa anterior
    if (layerRef.current) {
      try { layerRef.current.removeFrom(map); } catch {}
      layerRef.current = null;
    }

    const conCoords = lideres.filter(
      (l) =>
        l.votante?.coordenadas &&
        typeof l.votante.coordenadas.lat === 'number' &&
        typeof l.votante.coordenadas.lng === 'number' &&
        !isNaN(l.votante.coordenadas.lat) &&
        !isNaN(l.votante.coordenadas.lng)
    );

    if (conCoords.length === 0) {
      console.log('[CapaLideres] Sin líderes con coordenadas válidas');
      return;
    }

    console.log('[CapaLideres] Renderizando', conCoords.length, 'líderes modo', modo);

    let layer: L.Layer | null = null;

    if (modo === 'heatmap') {
      const points = conCoords.map((l) => [
        l.votante!.coordenadas!.lat,
        l.votante!.coordenadas!.lng,
        Math.max(0.3, Math.min(1, (l.alcance_estimado || 50) / 100)),
      ]);
      try {
        layer = (L as any).heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 17,
          minOpacity: 0.35,
          gradient: { 0.3: '#22C55E', 0.6: '#F59E0B', 0.9: '#EF4444' },
        });
      } catch (e) {
        console.warn('[CapaLideres] heatLayer no disponible, fallback a círculos', e);
        modo = 'circulos';
      }
    }

    if (modo === 'circulos') {
      const featureGroup = L.featureGroup();
      conCoords.forEach((l) => {
        const radio = Math.max(40, Math.min(250, (l.alcance_estimado || 50) * 2.5));
        const color = colorPorScore(l.score ?? 0);
        const circle = L.circle([l.votante!.coordenadas!.lat, l.votante!.coordenadas!.lng], {
          radius: radio,
          color,
          fillColor: color,
          fillOpacity: 0.3,
          weight: 2,
        });
        circle.bindPopup(popupLider(l, onEditar));
        featureGroup.addLayer(circle);
      });
      layer = featureGroup;
    }

    if (modo === 'pines' || modo === 'solo_puntos' || !layer) {
      const featureGroup = L.featureGroup();
      conCoords.forEach((l) => {
        const color = colorPorScore(l.score ?? 0);
        const esPadre = !l.lider_padre_id;
        const radio = modo === 'solo_puntos' ? 5 : esPadre ? 10 : 7;
        const marker = L.circleMarker(
          [l.votante!.coordenadas!.lat, l.votante!.coordenadas!.lng],
          {
            radius: radio,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }
        );
        marker.bindPopup(popupLider(l, onEditar));
        featureGroup.addLayer(marker);
      });
      layer = featureGroup;
    }

    if (layer) {
      layer.addTo(map);
      layerRef.current = layer;

      if (onEditar) {
        const attach = () => {
          conCoords.forEach((l) => {
            const btn = document.getElementById(`lider-edit-btn-${l.id}`);
            if (btn) {
              btn.onclick = () => onEditar(l);
            }
          });
        };
        layer.on('popupopen', attach);
      }
    }

    return () => {
      if (layerRef.current) {
        try { layerRef.current.removeFrom(map); } catch {}
        layerRef.current = null;
      }
    };
  }, [lideres, modo, map, onEditar]);

  return null;
}

function CapaEventos({ data, onEditar }: { data?: GeoJSONCollection; onEditar?: (props: Record<string, any>) => void }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      try { layerRef.current.removeFrom(map); } catch {}
      layerRef.current = null;
    }
    if (!data?.features?.length) return;

    const colorPorStatus: Record<string, string> = {
      programado: '#3B82F6',
      en_curso: '#22C55E',
      finalizado: '#6B7280',
      cancelado: '#EF4444',
    };

    const layer = L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        const status = feature?.properties?.status || 'programado';
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: colorPorStatus[status] || '#3B82F6',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        });
      },
      onEachFeature: (feature, l) => {
        const props = feature?.properties || {};
        const id = props.id || props._feature_id || '';
        const nombre = escaparHtml(props.nombre || props.titulo || 'Evento');
        const direccion = escaparHtml(props.direccion || 'Sin dirección');
        const fecha = props.fecha_inicio
          ? format(new Date(props.fecha_inicio), "d 'de' MMMM, h:mm a", { locale: es })
          : 'Sin fecha';
        const status = props.status || 'programado';
        const editarBtn = onEditar
          ? `<button
              id="evento-edit-btn-${id}"
              class="mt-2 w-full rounded-md bg-primary-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            >
              Editar evento
            </button>`
          : '';
        l.bindPopup(`
          <div class="min-w-[200px] font-sans">
            <p class="text-sm font-bold text-secondary-900">${nombre}</p>
            <p class="text-[10px] uppercase tracking-wide text-secondary-500 mb-2">${escaparHtml(status)} • ${fecha}</p>
            <div class="text-xs text-secondary-700">
              <span class="font-semibold">Dirección:</span> ${direccion}
            </div>
            ${editarBtn}
          </div>
        `);
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    if (onEditar) {
      const attach = () => {
        data.features.forEach((f: any) => {
          const props = f.properties || {};
          const id = props.id || props._feature_id || '';
          const btn = document.getElementById(`evento-edit-btn-${id}`);
          if (btn) {
            btn.onclick = () => onEditar(props);
          }
        });
      };
      layer.on('popupopen', attach);
    }

    return () => {
      if (layerRef.current) {
        try { layerRef.current.removeFrom(map); } catch {}
        layerRef.current = null;
      }
    };
  }, [data, map, onEditar]);

  return null;
}

function CapaDibujo() {
  return null;
}

interface CapaPersonalizadaProps {
  data: any;
  capa: { id: string; nombre: string; color: string; bloqueada?: boolean; orden?: number };
  capasGeoJSONRef: React.RefObject<Map<string, L.GeoJSON>>;
  onFeatureClick?: (capaId: string, featureId: string, props: Record<string, any>) => void;
  onRender?: () => void;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function listaHtml(items: string[] | undefined): string {
  if (!items || items.length === 0) return '<em>Sin datos</em>';
  return `<ul class="list-disc pl-4 text-xs text-secondary-700">${items
    .map((i) => `<li>${escaparHtml(String(i))}</li>`)
    .join('')}</ul>`;
}

function resultadosHtml(resultados: any): string {
  if (!resultados || typeof resultados !== 'object') return '<em>Sin datos históricos</em>';
  const rows = Object.entries(resultados)
    .map(([anio, r]: [string, any]) => {
      const planilla = r?.planilla_ganadora ? escaparHtml(String(r.planilla_ganadora)) : '-';
      const votos = r?.votos_ganador != null ? Number(r.votos_ganador).toLocaleString() : '-';
      const total = r?.total != null ? Number(r.total).toLocaleString() : '-';
      return `<tr><td class="px-2 py-1 border-b border-secondary-200">${anio}</td><td class="px-2 py-1 border-b border-secondary-200 font-semibold">${planilla}</td><td class="px-2 py-1 border-b border-secondary-200 text-right">${votos}</td><td class="px-2 py-1 border-b border-secondary-200 text-right">${total}</td></tr>`;
    })
    .join('');
  return `<table class="w-full text-xs"><thead><tr class="bg-secondary-100"><th class="px-2 py-1 text-left">Año</th><th class="px-2 py-1 text-left">Planilla</th><th class="px-2 py-1 text-right">Votos gan.</th><th class="px-2 py-1 text-right">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function crearPopupHtml(props: Record<string, any>, capaId: string, capaNombre: string): string {
  const nombre = escaparHtml(String(props._feature_nombre || props.NOMBRE || props.nombre || props.name || 'Sin nombre'));
  const zona = props.zona_sindical ? escaparHtml(String(props.zona_sindical)) : null;
  const colorZona = props.color_zona ? String(props.color_zona) : null;
  const tipoEntidad = props.tipo_entidad ? escaparHtml(String(props.tipo_entidad)) : null;
  const dependenciasEje = Array.isArray(props.dependencias_eje) ? props.dependencias_eje : [];
  const dependenciasEspecificas = Array.isArray(props.dependencias_especificas)
    ? props.dependencias_especificas
    : [];
  const sede = props.sede_votacion ? escaparHtml(String(props.sede_votacion)) : null;
  const resultados = props.resultados_historicos || null;
  const esNodo = props.es_nodo === true;
  const featureId = String(props._feature_id || props.id || props.ID || props.OBJECTID || props.objectid || props.FID || props.fid || props.gid || props.GID);

  const colorDot = colorZona
    ? `<span class="inline-block h-3 w-3 rounded-full border border-white shadow" style="background-color:${colorZona}"></span>`
    : '';

  return `
    <div class="min-w-[260px] max-w-[320px] font-sans">
      <div class="mb-2 border-b border-secondary-200 pb-2">
        <h3 class="text-sm font-bold text-secondary-900">${nombre}</h3>
        <p class="text-[10px] uppercase tracking-wide text-secondary-500">${escaparHtml(capaNombre)}${esNodo ? ' • Nodo sindical' : ''}</p>
      </div>
      <div class="space-y-2 text-xs">
        ${zona ? `<div class="flex items-center gap-2">${colorDot}<span class="font-semibold text-secondary-800">Zona sindical:</span><span>${zona}</span></div>` : ''}
        ${tipoEntidad ? `<div><span class="font-semibold text-secondary-800">Tipo:</span> ${tipoEntidad}</div>` : ''}
        ${sede ? `<div><span class="font-semibold text-secondary-800">Sede de votación:</span> ${sede}</div>` : ''}
        <div>
          <span class="font-semibold text-secondary-800">Dependencias eje:</span>
          ${listaHtml(dependenciasEje)}
        </div>
        <div>
          <span class="font-semibold text-secondary-800">Dependencias específicas:</span>
          ${listaHtml(dependenciasEspecificas)}
        </div>
        <div class="rounded border border-secondary-200 bg-secondary-50/60 p-1.5">
          <p class="mb-1 font-semibold text-secondary-800">Resultados históricos STASE</p>
          ${resultadosHtml(resultados)}
        </div>
      </div>
      <div class="mt-3 flex gap-2">
        <button id="btn-editar-feature-${featureId}" class="flex-1 rounded-md bg-primary-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700">Editar polígono</button>
      </div>
    </div>
  `;
}

function CapaPersonalizada({ data, capa, capasGeoJSONRef, onFeatureClick, onRender }: CapaPersonalizadaProps) {
  const map = useMap();
  const capaRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (capaRef.current) {
      capaRef.current.removeFrom(map);
      capasGeoJSONRef.current?.delete(capa.id);
      capaRef.current = null;
    }
    if (!data?.features?.length) return;

    const esCapaSindical = /STASE|Sindicales/i.test(capa.nombre);
    const bloqueada = !!capa.bloqueada;
    const orden = typeof capa.orden === 'number' ? capa.orden : 0;
    const paneName = `capa-${capa.id}`;
    const zIndex = 500 + orden * 10;

    // Crear/actualizar pane propio para controlar z-index y bloqueo de interacción
    let pane = map.getPane(paneName);
    if (!pane) {
      pane = map.createPane(paneName);
    }
    pane.style.zIndex = String(zIndex);
    pane.style.pointerEvents = bloqueada ? 'none' : 'auto';

    const baseStyle = (feature: any) => {
      const color = feature?.properties?._feature_color || capa.color || '#3B82F6';
      return {
        color,
        fillColor: color,
        weight: esCapaSindical ? 2.5 : 2,
        opacity: esCapaSindical ? 0.85 : 0.7,
        fillOpacity: esCapaSindical ? 0.35 : 0.2,
      };
    };

    const layer = L.geoJSON(data, {
      pane: paneName,
      style: baseStyle,
      onEachFeature: bloqueada
        ? undefined
        : (feature: any, l: any) => {
            const props = feature?.properties || {};
            const featureId = String(props._feature_id || props.id || props.ID || props.OBJECTID || props.objectid || props.FID || props.fid || props.gid || props.GID);

            l.bindPopup(crearPopupHtml(props, capa.id, capa.nombre), {
              maxWidth: 320,
              className: 'capa-popup-sindical',
              autoPan: false,
            });

            l.on('click', (e: any) => {
              L.DomEvent.stopPropagation(e);
              l.bringToFront();
              l.setStyle({ weight: 4, opacity: 1, fillOpacity: 0.5 });
              l.openPopup();
              if (onFeatureClick) onFeatureClick(capa.id, featureId, props);
            });

            l.on('popupclose', () => {
              l.setStyle(baseStyle(l.feature));
            });

            l.on('popupopen', () => {
              const btn = document.getElementById(`btn-editar-feature-${featureId}`);
              if (btn && onFeatureClick) {
                const handler = () => onFeatureClick(capa.id, featureId, props);
                btn.addEventListener('click', handler);
                // Limpiar listener al cerrar popup para evitar duplicados
                const cleanup = () => {
                  btn.removeEventListener('click', handler);
                  l.off('popupclose', cleanup);
                };
                l.on('popupclose', cleanup);
              }
            });
          },
      pointToLayer: (feature: any, latlng: any) => {
        const color = feature?.properties?._feature_color || capa.color || '#3B82F6';
        return L.circleMarker(latlng, {
          radius: 6,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
          pane: paneName,
          interactive: !bloqueada,
        } as any);
      },
    });

    layer.addTo(map);
    capaRef.current = layer;
    capasGeoJSONRef.current?.set(capa.id, layer);
    console.log('[CapaPersonalizada] renderizada', capa.id, capa.nombre, 'bloqueada:', bloqueada, 'orden:', orden, 'features:', data.features.length);
    onRender?.();

    return () => {
      if (capaRef.current) {
        capaRef.current.removeFrom(map);
        capasGeoJSONRef.current?.delete(capa.id);
      }
    };
  }, [data, capa.id, capa.color, capa.nombre, capa.bloqueada, capa.orden, map, capasGeoJSONRef, onFeatureClick, onRender]);

  return null;
}

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
  const opciones = [
    {
      id: 'apoyo',
      label: 'Apoyo',
      sub: 'Entrega / beneficio',
      icono: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      ),
      color: '#F59E0B',
      bg: 'bg-amber-50',
      hover: 'hover:bg-amber-100',
      text: 'text-amber-700',
    },
    {
      id: 'evento',
      label: 'Evento',
      sub: 'Reunión / mitin',
      icono: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z" />
        </svg>
      ),
      color: '#D73216',
      bg: 'bg-red-50',
      hover: 'hover:bg-red-100',
      text: 'text-red-700',
    },
    {
      id: 'lider',
      label: 'Líder',
      sub: 'Estructura territorial',
      icono: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
      color: '#16A34A',
      bg: 'bg-green-50',
      hover: 'hover:bg-green-100',
      text: 'text-green-700',
    },
  ] as const;

  return (
    <Marker position={[lat, lng]}>
      <Popup closeButton={false} className="rounded-2xl">
        <div className="w-64 p-1">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-secondary-900">¿Qué registrar aquí?</p>
              <p className="text-[10px] text-secondary-500">Selecciona el tipo de registro</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {opciones.map((op) => (
              <button
                key={op.id}
                onClick={() => onAccion(op.id as any, lat, lng)}
                className={`flex flex-col items-center gap-1 rounded-xl border border-secondary-100 ${op.bg} ${op.hover} p-2.5 transition`}
              >
                <span style={{ color: op.color }}>{op.icono}</span>
                <span className={`text-[11px] font-semibold ${op.text}`}>{op.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onCerrar}
            className="mt-3 w-full rounded-lg py-1.5 text-xs font-medium text-secondary-500 transition hover:bg-secondary-50"
          >
            Cancelar
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

function CapaSeleccionada({ seleccion }: { seleccion: any }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!seleccion?.geometry) return;
    if (layerRef.current) {
      layerRef.current.removeFrom(map);
      layerRef.current = null;
    }
    const layer = L.geoJSON(seleccion.geometry, {
      style: {
        color: '#D73216',
        weight: 3,
        opacity: 0.9,
        fillColor: '#D73216',
        fillOpacity: 0.15,
        dashArray: '5 5',
      },
    });
    layer.addTo(map);
    layerRef.current = layer;
    return () => {
      if (layerRef.current) {
        layerRef.current.removeFrom(map);
      }
    };
  }, [seleccion, map]);

  return null;
}
