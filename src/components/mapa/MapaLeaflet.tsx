'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle, memo } from 'react';
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
import { COLORES_CAPA } from './colores-capa';
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
  onAccionPunto?: (tipo: 'apoyo' | 'evento' | 'lider' | 'peticion' | 'votante', lat: number, lng: number) => void;
  onCerrarPunto?: () => void;
  casillaUbicando?: { id: string; seccion: string; numero?: string; nombre: string } | null;
  onEditarLider?: (lider: Lider) => void;
  onEditarEvento?: (props: Record<string, any>) => void;
  onDibujoListo?: (geojson: GeoJSONCollection) => void;
  modoDibujo?: boolean;
  filtrosApoyos?: Record<string, boolean>;
  seleccion?: { geometry: any; properties?: any; tipo?: string; nombre?: string } | null;
  onFeatureClick?: (capaId: string, featureId: string, props: Record<string, any>, geometry?: any, coords?: { lat: number; lng: number }) => void;
  resultadoDestacado?: ResultadoGlobal | null;
  onBoundsChange?: (bounds: { south: number; west: number; north: number; east: number }) => void;
  onLimpiarSeleccion?: () => void;
}

// Refs compartidos entre MapaBridge y CapaPersonalizada para resaltar features
const highlightRef: { layer: L.GeoJSON | null; timer: any } = { layer: null, timer: null };
let pendingHighlight: { capaId: string; featureId: string; intentos: number } | null = null;
let ultimoClickEnFeature = 0;

export default forwardRef<MapaLeafletRef, Props>(function MapaLeaflet(
  { data, activas, onRecargar, personalizadas, lideres = [], modoLideres = 'pines', puntoSeleccionado, onSeleccionarCoordenada, onAccionPunto, onCerrarPunto, onEditarLider, onEditarEvento, onDibujoListo, modoDibujo, filtrosApoyos, seleccion, onFeatureClick, resultadoDestacado, onBoundsChange, casillaUbicando, onLimpiarSeleccion },
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
      doubleClickZoom={false}
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
      {onSeleccionarCoordenada && !casillaUbicando && <DetectorClicMapa onSeleccionar={onSeleccionarCoordenada} onLimpiarSeleccion={onLimpiarSeleccion} />}
      {casillaUbicando && <UbicarCasillaEnMapa casilla={casillaUbicando} onConfirmar={onSeleccionarCoordenada} onCancelar={onCerrarPunto} />}

      <ManejadorResultadoDestacado resultado={resultadoDestacado} capasGeoJSONRef={capasGeoJSONRef} />

      <CentradorCapas data={data} activas={activas} personalizadas={personalizadas} />

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

      {activas.casillas && data.casillas && (
        <CapaCasillas data={data.casillas} onEditar={(props) => window.open(`/dashboard/casillas/${props.id}`, '_blank')} />
      )}

      {activas.lideres && <CapaLideres lideres={lideres} modo={modoLideres} onEditar={onEditarLider} />}

      {activas.custom && onDibujoListo && <CapaDibujo onDibujoListo={onDibujoListo} modoDibujo={modoDibujo} />}

      {personalizadas.map(capa => (
        activas[capa.id] && data[capa.id] && (
          <CapaPersonalizada
            key={capa.id}
            data={data[capa.id]!}
            capa={capa}
            capasGeoJSONRef={capasGeoJSONRef}
            onFeatureClick={onFeatureClick}
            onSeleccionarCoordenada={onSeleccionarCoordenada}
            onAccionPunto={onAccionPunto}
            onRender={() => handleCapaRender(capa.id)}
          />
        )
      ))}

      {puntoSeleccionado && onAccionPunto && onCerrarPunto && (
        <MarcadorPuntoSeleccionado
          key={`punto-${puntoSeleccionado.lat}-${puntoSeleccionado.lng}`}
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
    // Pane para puntos de campaña (líderes, eventos, casillas) por encima de los
    // polígonos personalizados (z-index 500+) pero debajo de tooltips (650) y popups (700),
    // para que los puntos dentro de un polígono sigan siendo clicables.
    if (!map.getPane('puntos-campana')) {
      map.createPane('puntos-campana');
      map.getPane('puntos-campana')!.style.zIndex = '645';
    }
  }, [map]);

  const fitGeometryFallback = useCallback((geometryFallback?: any) => {
    if (!geometryFallback) return;
    try {
      const geoInput = geometryFallback.geometry || geometryFallback;
      console.log('[MapaBridge] fitGeometryFallback input', { geoInputType: geoInput?.type, hasCoordinates: Array.isArray(geoInput?.coordinates) });
      const fallback = L.geoJSON(geoInput);
      const fb = fallback.getBounds();
      fallback.remove();
      console.log('[MapaBridge] fitGeometryFallback bounds', { isValid: fb?.isValid?.() });
      if (fb?.isValid?.()) {
        registerProgrammaticMove(1200);
        console.log('[MapaBridge] fitGeometryFallback haciendo fitBounds');
        map.fitBounds(fb, { padding: [60, 60], maxZoom: 16, animate: true });
      }
    } catch (e) {
      console.warn('[MapaBridge] fitBounds fallback error:', e);
    }
  }, [map]);

  const resaltarFeature = useCallback((capaId: string, featureId: string, geometryFallback?: any) => {
    console.log('[MapaBridge] resaltarFeature invocado', { capaId, featureId, hasFallback: !!geometryFallback, fallbackType: geometryFallback?.type || geometryFallback?.geometry?.type });
    try {
      const geoLayer = capasGeoJSONRef?.current?.get(capaId);
      console.log('[MapaBridge] geoLayer lookup', { capaId, found: !!geoLayer, keys: geoLayer ? Array.from(capasGeoJSONRef!.current!.keys()) : [] });
      if (!geoLayer) {
        console.warn('[MapaBridge] resaltarFeature: capa no encontrada', capaId, '— se reintentará');
        pendingHighlight = { capaId, featureId, intentos: 1 };
        fitGeometryFallback(geometryFallback);
        return;
      }

      const layers = geoLayer.getLayers() as L.Layer[];
      console.log('[MapaBridge] resaltarFeature: capa tiene', layers.length, 'layers');
      const target = layers.find((l: any) => {
        const p = l.feature?.properties || {};
        const match = String(p._feature_id) === String(featureId);
        if (!match) console.log('[MapaBridge] comparando', { layerFeatureId: p._feature_id, requestedFeatureId: featureId });
        return match;
      }) as L.Layer | undefined;

      if (!target) {
        console.warn('[MapaBridge] resaltarFeature: feature no encontrado', featureId, 'en capa', capaId, 'capa tiene', layers.length, 'layers');
        pendingHighlight = { capaId, featureId, intentos: 1 };
        fitGeometryFallback(geometryFallback);
        return;
      }

      pendingHighlight = null;

      const bounds = (target as any).getBounds ? (target as any).getBounds() : null;
      console.log('[MapaBridge] resaltarFeature: bounds del target', { isValid: bounds?.isValid?.() });
      if (bounds?.isValid?.()) {
        // Ajustar el mapa para que el polígono ocupe toda la vista
        registerProgrammaticMove(1200);
        console.log('[MapaBridge] haciendo fitBounds al target');
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16, animate: true });
      } else if (geometryFallback) {
        console.log('[MapaBridge] usando geometryFallback para fitBounds');
        fitGeometryFallback(geometryFallback);
      } else if ((target as any).getLatLng) {
        const ll = (target as any).getLatLng();
        registerProgrammaticMove(1200);
        console.log('[MapaBridge] flyTo al latlng del target', ll);
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
      console.log('[MapaBridge] dibujando highlight');
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
  }, [map, capasGeoJSONRef, fitGeometryFallback]);

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
        if (!geometryOrBbox) {
          console.warn('[MapaBridge] fitBounds: entrada vacía');
          return;
        }
        console.log('[MapaBridge] fitBounds input:', geometryOrBbox);
        let bounds: L.LatLngBounds | null = null;
        if (Array.isArray(geometryOrBbox) && geometryOrBbox.length === 4 && geometryOrBbox.every(n => typeof n === 'number')) {
          const [minLng, minLat, maxLng, maxLat] = geometryOrBbox;
          bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        } else if (Array.isArray(geometryOrBbox?.bbox) && geometryOrBbox.bbox.length === 4) {
          const [minLng, minLat, maxLng, maxLat] = geometryOrBbox.bbox;
          bounds = L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
        } else {
          const geoInput = geometryOrBbox.geometry || geometryOrBbox;
          const geo = L.geoJSON(geoInput);
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
    if ((resultado.tipo === 'capa_feature' && resultado.capaId && resultado.featureId) || resultado.tipo === 'casilla') {
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
            if (resultado.tipo === 'casilla') {
              return String(p.id) === String(resultado.id).replace('casilla-', '');
            }
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

function DetectorClicMapa({
  onSeleccionar,
  onLimpiarSeleccion,
}: {
  onSeleccionar: (lat: number, lng: number) => void;
  onLimpiarSeleccion?: () => void;
}) {
  useMapEvents({
    click(e) {
      // Clic simple en zona vacía: limpiar selección (no abrir popup).
      // El popup de registro se abre con doble clic (dblclick).
      // Defensivo: si el clic cayó sobre una capa interactiva (polígono/punto),
      // NO limpiar — deja que el handler de esa capa maneje la selección.
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target && target.closest && target.closest('.leaflet-interactive')) return;
      // Extra defensivo: si un polígono de capa personalizada acaba de registrar el click,
      // no limpiar la selección aunque el evento haya bubbujeado hasta el mapa.
      if (Date.now() - ultimoClickEnFeature < 200) return;
      onLimpiarSeleccion?.();
    },
    dblclick(e) {
      // Doble clic en cualquier zona: abrir el popup "¿Qué registrar aquí?"
      onSeleccionar(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function UbicarCasillaEnMapa({
  casilla,
  onConfirmar,
  onCancelar,
}: {
  casilla: { id: string; seccion: string; numero?: string; nombre: string };
  onConfirmar?: (lat: number, lng: number) => void;
  onCancelar?: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const [latLng, setLatLng] = useState<L.LatLng | null>(null);

  useEffect(() => {
    const center = map.getCenter();
    const marker = L.marker(center, {
      draggable: true,
      icon: L.divIcon({
        className: 'custom-pin-ubicar',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:#F59E0B;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">??</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    }).addTo(map);
    markerRef.current = marker;
    setLatLng(center);

    marker.on('dragend', () => {
      setLatLng(marker.getLatLng());
    });

    const handleClick = (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      setLatLng(e.latlng);
    };
    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
      marker.remove();
      markerRef.current = null;
    };
  }, [map]);

  const confirmar = () => {
    if (!latLng || !onConfirmar) return;
    onConfirmar(latLng.lat, latLng.lng);
  };

  const cancelar = () => {
    if (onCancelar) onCancelar();
  };

  return (
    <div className="absolute bottom-6 left-1/2 z-[750] flex -translate-x-1/2 flex-col items-center gap-2 rounded-xl border border-amber-200 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur">
      <p className="text-center text-sm font-semibold text-secondary-900">
        Ubicando: <span className="text-amber-700">{casilla.nombre}</span>
      </p>
      <p className="max-w-xs text-center text-xs text-secondary-500">
        Arrastra el pin naranja o toca en el mapa. Luego confirma para guardar la coordenada.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={confirmar}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
        >
          Guardar ubicación
        </button>
        <button
          onClick={cancelar}
          className="rounded-lg bg-secondary-100 px-3 py-1.5 text-xs font-semibold text-secondary-700 hover:bg-secondary-200"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
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
  return score >= 80 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626';
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
    const handler = (e: any) => {
      const liderId = e.detail?.id;
      if (!liderId || !layerRef.current) return;
      let encontrado: L.Layer | null = null;
      (layerRef.current as any).eachLayer?.((layer: any) => {
        if (String(layer._liderId) === String(liderId)) {
          encontrado = layer;
        }
      });
      if (encontrado) {
        try {
          (encontrado as any).openPopup?.();
          // Resaltar temporalmente aumentando el radio
          const originalRadius = (encontrado as any).options?.radius || (encontrado as any).getRadius?.();
          if ((encontrado as any).setStyle) {
            (encontrado as any).setStyle({ color: '#D73216', fillColor: '#D73216', weight: 3 });
            setTimeout(() => {
              (encontrado as any).setStyle?.({ color: '#fff', fillColor: COLORES_CAPA.lideres, weight: 2 });
            }, 2500);
          }
        } catch (err) {
          console.warn('[CapaLideres] Error resaltando líder:', err);
        }
      }
    };
    window.addEventListener('mapa:resaltar-lider', handler);
    return () => window.removeEventListener('mapa:resaltar-lider', handler);
  }, []);

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
      console.log('[CapaLideres] Sin líderes con coordenadas válidas. Input lideres:', lideres.length);
      return;
    }

    console.log('[CapaLideres] Renderizando', conCoords.length, 'líderes modo', modo, 'input:', lideres.length);

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

    const colorCapa = COLORES_CAPA.lideres;

    const asignarLiderId = (layer: L.Layer, l: Lider) => {
      (layer as any)._liderId = l.id;
    };

    if (modo === 'circulos') {
      const featureGroup = L.featureGroup();
      conCoords.forEach((l) => {
        const radio = Math.max(40, Math.min(250, (l.alcance_estimado || 50) * 2.5));
        const circle = L.circle([l.votante!.coordenadas!.lat, l.votante!.coordenadas!.lng], {
          radius: radio,
          color: colorCapa,
          fillColor: colorCapa,
          fillOpacity: 0.3,
          weight: 2,
          pane: 'puntos-campana',
        });
        circle.bindPopup(popupLider(l, onEditar));
        circle.on('click', (e: any) => L.DomEvent.stopPropagation(e));
        asignarLiderId(circle, l);
        featureGroup.addLayer(circle);
      });
      layer = featureGroup;
    }

    if (modo === 'pines' || modo === 'solo_puntos' || !layer) {
      const featureGroup = L.featureGroup();
      conCoords.forEach((l) => {
        const esPadre = !l.lider_padre_id;
        const radio = modo === 'solo_puntos' ? 5 : esPadre ? 10 : 7;
        const marker = L.circleMarker(
          [l.votante!.coordenadas!.lat, l.votante!.coordenadas!.lng],
          {
            radius: radio,
            fillColor: colorCapa,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
            pane: 'puntos-campana',
          }
        );
        marker.bindPopup(popupLider(l, onEditar));
        marker.on('click', (e: any) => L.DomEvent.stopPropagation(e));
        asignarLiderId(marker, l);
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

    const colorCapa = COLORES_CAPA.eventos;
    const colorBordePorStatus: Record<string, string> = {
      programado: '#ffffff',
      en_curso: '#22C55E',
      finalizado: '#9CA3AF',
      cancelado: '#EF4444',
    };

    const layer = L.geoJSON(data, {
      pane: 'puntos-campana',
      pointToLayer: (feature, latlng) => {
        const status = feature?.properties?.status || 'programado';
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: colorCapa,
          color: colorBordePorStatus[status] || '#ffffff',
          weight: status === 'programado' ? 2 : 3,
          opacity: 1,
          fillOpacity: 0.9,
          pane: 'puntos-campana',
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
        l.on('click', (e: any) => L.DomEvent.stopPropagation(e));
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

function CapaCasillas({ data, onEditar }: { data?: GeoJSONCollection; onEditar?: (props: Record<string, any>) => void }) {
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      try { layerRef.current.removeFrom(map); } catch {}
      layerRef.current = null;
    }
    if (!data?.features?.length) return;

    const colorCapa = COLORES_CAPA.casillas;

    const layer = L.geoJSON(data, {
      pane: 'puntos-campana',
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 7,
          fillColor: colorCapa,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
          pane: 'puntos-campana',
        });
      },
      onEachFeature: (feature, l) => {
        const props = feature?.properties || {};
        l.on('click', (e: any) => L.DomEvent.stopPropagation(e));
        const seccion = escaparHtml(props.seccion || '');
        const tipo = escaparHtml(props.tipo || '');
        const numero = escaparHtml(props.numero || '');
        const ubicacion = escaparHtml(props.ubicacion || 'Sin ubicación');
        const direccion = escaparHtml(props.direccion || 'Sin dirección');
        const referencia = escaparHtml(props.referencia || '');
        const electores = props.electores_esperados ? `${props.electores_esperados} electores` : '';
        const status = escaparHtml(props.status || 'sin_reportar');
        const id = props.id || '';
        const historico = props.historico;
        const historicoCount = props.historico_count || 0;

        const labelsTipoEleccion: Record<string, string> = {
          ayuntamiento: 'Ayuntamiento',
          diputado_local: 'Diputado Local',
          diputado_federal: 'Diputado Federal',
          senador: 'Senador',
          gobernador: 'Gobernador',
          presidente_republica: 'Presidente',
        };

        const historicoHtml = historico
          ? `
            <div class="mt-2 rounded-md bg-amber-50 p-2 text-xs">
              <p class="mb-1 flex items-center gap-1 font-semibold text-amber-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Histórico ${historico.anio}
              </p>
              <p class="text-amber-900"><span class="font-medium">${labelsTipoEleccion[historico.tipo_eleccion] || historico.tipo_eleccion}:</span> Ganó <strong>${escaparHtml(historico.ganador)}</strong> con ${(historico.votos_ganador || 0).toLocaleString('es-MX')} votos</p>
              ${historico.total_votos ? `<p class="text-amber-800/80 mt-0.5">Total casilla: ${(historico.total_votos || 0).toLocaleString('es-MX')} votos · Lista nominal: ${(historico.lista_nominal || 0).toLocaleString('es-MX')}</p>` : ''}
              ${historicoCount > 1 ? `<p class="mt-1 text-[10px] text-amber-700">+${historicoCount - 1} elecciones más en ficha</p>` : ''}
            </div>`
          : historicoCount > 0
          ? `<div class="mt-2 rounded-md bg-secondary-50 p-2 text-xs text-secondary-600">Hay ${historicoCount} resultados históricos en la ficha de esta casilla.</div>`
          : '';

        const editarBtn = onEditar && id
          ? `<button
              id="casilla-edit-btn-${id}"
              class="mt-2 w-full rounded-md bg-primary-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
            >
              Editar casilla
            </button>`
          : '';
        l.bindPopup(`
          <div class="min-w-[240px] max-w-[280px] font-sans">
            <p class="text-sm font-bold text-secondary-900">Casilla ${tipo}${numero ? ` ${numero}` : ''}</p>
            <p class="text-[10px] uppercase tracking-wide text-secondary-500 mb-2">Sección ${seccion} • ${status}</p>
            <div class="text-xs text-secondary-700 space-y-1">
              <p><span class="font-semibold">Lugar:</span> ${ubicacion}</p>
              <p><span class="font-semibold">Dirección:</span> ${direccion}</p>
              ${referencia ? `<p><span class="font-semibold">Ref:</span> ${referencia}</p>` : ''}
              ${electores ? `<p><span class="font-semibold">${electores}</span></p>` : ''}
            </div>
            ${historicoHtml}
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
          const id = props.id || '';
          const btn = document.getElementById(`casilla-edit-btn-${id}`);
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

function CapaDibujo({
  onDibujoListo,
  modoDibujo,
}: {
  onDibujoListo: (geojson: GeoJSONCollection) => void;
  modoDibujo?: boolean;
}) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const controlRef = useRef<L.Control.Draw | null>(null);
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const drawnItems = drawnItemsRef.current;
    drawnItems.addTo(map);

    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: {
          shapeOptions: { color: COLORES_CAPA.custom, weight: 4 },
        },
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: COLORES_CAPA.custom, weight: 2 },
        },
        rectangle: {
          shapeOptions: { color: COLORES_CAPA.custom, weight: 2 },
        },
        circle: false,
        circlemarker: false,
        marker: {
          icon: new L.Icon.Default(),
        },
      },
      edit: {
        featureGroup: drawnItems,
      },
    });
    map.addControl(drawControl);
    controlRef.current = drawControl;

    const handleCreated = (e: any) => {
      const layer = e.layer;
      layer.feature = {
        type: 'Feature',
        geometry: (layer as any).toGeoJSON?.()?.geometry || null,
        properties: {},
      };
      drawnItems.addLayer(layer);
      setCount(drawnItems.getLayers().length);

      // Popup editable para asignar nombre y descripción a la forma
      const popupContent = document.createElement('div');
      popupContent.className = 'w-56 p-1';
      popupContent.innerHTML = `
        <div class="mb-2 flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-md bg-primary-50 text-primary-600">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </div>
          <div>
            <p class="text-sm font-bold text-secondary-900">Etiquetar forma</p>
            <p class="text-[10px] text-secondary-500">Nombre y descripción</p>
          </div>
        </div>
        <div class="space-y-2">
          <input type="text" id="nombre-dibujo" placeholder="Ej. Colonia Centro" class="input w-full text-xs py-1.5" />
          <textarea id="desc-dibujo" placeholder="Descripción opcional" class="input w-full min-h-[60px] text-xs py-1.5"></textarea>
          <button id="btn-guardar-dibujo" class="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">
            Guardar
          </button>
        </div>
      `;

      const inputNombre = popupContent.querySelector('#nombre-dibujo') as HTMLInputElement;
      const inputDesc = popupContent.querySelector('#desc-dibujo') as HTMLTextAreaElement;
      const btnGuardar = popupContent.querySelector('#btn-guardar-dibujo') as HTMLButtonElement;

      btnGuardar.addEventListener('click', () => {
        const nombre = inputNombre.value.trim();
        const descripcion = inputDesc.value.trim();
        if (layer.feature) {
          layer.feature.properties = {
            ...(layer.feature.properties || {}),
            _feature_nombre: nombre || 'Sin nombre',
            _feature_descripcion: descripcion,
            nombre: nombre || 'Sin nombre',
            descripcion,
          };
        }
        layer.closePopup();
      });

      layer.bindPopup(popupContent, { closeButton: false, className: 'rounded-2xl' });
      layer.openPopup();
    };

    const handleEdited = () => setCount(drawnItems.getLayers().length);
    const handleDeleted = () => setCount(drawnItems.getLayers().length);

    map.on(L.Draw.Event.CREATED, handleCreated);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      drawnItems.removeFrom(map);
      drawnItems.clearLayers();
    };
  }, [map]);

  useEffect(() => {
    if (!modoDibujo) return;
    const container = controlRef.current?.getContainer();
    if (!container) return;
    container.style.display = 'block';
    setVisible(true);
    const firstButton = container.querySelector('a.leaflet-draw-draw-polygon') as HTMLElement | null;
    if (firstButton) {
      setTimeout(() => firstButton.click(), 100);
    }
  }, [modoDibujo]);

  const handleGuardar = useCallback(() => {
    const features: any[] = [];
    drawnItemsRef.current.eachLayer((layer: any) => {
      let geojson: any;
      if (typeof layer.toGeoJSON === 'function') {
        geojson = layer.toGeoJSON();
      } else if (typeof layer.getLatLng === 'function') {
        const ll = layer.getLatLng();
        geojson = {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ll.lng, ll.lat] },
          properties: {},
        };
      }
      if (geojson) {
        const props = layer.feature?.properties || {};
        geojson.properties = {
          ...geojson.properties,
          ...props,
        };
        features.push(geojson);
      }
    });
    if (features.length === 0) return;
    onDibujoListo({ type: 'FeatureCollection', features });
    drawnItemsRef.current.clearLayers();
    setCount(0);
  }, [onDibujoListo]);

  const handleCancelar = useCallback(() => {
    drawnItemsRef.current.clearLayers();
    setCount(0);
  }, []);

  const toggleToolbar = useCallback(() => {
    setVisible((v) => {
      const next = !v;
      const container = controlRef.current?.getContainer();
      if (container) {
        container.style.display = next ? 'block' : 'none';
      }
      return next;
    });
  }, []);

  const activarPrimerTool = useCallback(() => {
    const container = controlRef.current?.getContainer();
    if (!container) return;
    container.style.display = 'block';
    setVisible(true);
    const firstButton = container.querySelector('a.leaflet-draw-draw-polygon') as HTMLElement | null;
    firstButton?.click();
  }, []);

  return (
    <div className="absolute bottom-6 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-secondary-200 bg-white p-2 shadow-lg">
      <button
        type="button"
        onClick={toggleToolbar}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-secondary-700 transition hover:bg-secondary-100"
        title={visible ? 'Ocultar herramientas de dibujo' : 'Mostrar herramientas de dibujo'}
      >
        <Icon name={visible ? 'ocultar' : 'ver'} size={14} />
        {visible ? 'Ocultar' : 'Dibujar'}
      </button>
      <div className="h-5 w-px bg-secondary-200" />
      <span className="text-xs text-secondary-500">
        {count === 0 ? 'Dibuja en el mapa' : `${count} forma${count === 1 ? '' : 's'}`}
      </span>
      <button
        type="button"
        onClick={handleGuardar}
        disabled={count === 0}
        className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={handleCancelar}
        disabled={count === 0}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-secondary-600 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Limpiar
      </button>
    </div>
  );
}

interface CapaPersonalizadaProps {
  data: any;
  capa: { id: string; nombre: string; color: string; bloqueada?: boolean; orden?: number; estilos?: any };
  capasGeoJSONRef: React.RefObject<Map<string, L.GeoJSON>>;
  onFeatureClick?: (capaId: string, featureId: string, props: Record<string, any>, geometry?: any, coords?: { lat: number; lng: number }) => void;
  onSeleccionarCoordenada?: (lat: number, lng: number) => void;
  onAccionPunto?: (tipo: 'apoyo' | 'evento' | 'lider' | 'peticion' | 'votante', lat: number, lng: number) => void;
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

function crearPopupHtml(props: Record<string, any>, capaId: string, capaNombre: string, geometryType?: string): string {
  const nombre = escaparHtml(String(props._feature_nombre || props.NOMBRE_VER || props.NOMBRE || props.nombre || props.name || props.NAME || 'Sin nombre'));
  const zona = props.zona_sindical ? escaparHtml(String(props.zona_sindical)) : null;
  const colorZona = props.color_zona ? String(props.color_zona) : null;
  const tipoEntidad = props.tipo_entidad
    ? escaparHtml(String(props.tipo_entidad))
    : props.tipo
      ? escaparHtml(String(props.tipo))
      : null;
  const dependenciasEje = Array.isArray(props.dependencias_eje) ? props.dependencias_eje : [];
  const dependenciasEspecificas = Array.isArray(props.dependencias_especificas)
    ? props.dependencias_especificas
    : [];
  const sede = props.sede_votacion ? escaparHtml(String(props.sede_votacion)) : null;
  const resultados = props.resultados_historicos || null;
  const esNodo = props.es_nodo === true;
  const esPunto = geometryType === 'Point' || geometryType === 'MultiPoint';
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
      <div class="mt-3 space-y-2">
        <div class="grid grid-cols-2 gap-2">
          <button id="btn-editar-feature-${featureId}" class="rounded-md bg-primary-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-primary-700">${esPunto ? 'Ver detalle' : 'Editar polígono'}</button>
          <button id="btn-registrar-aqui-${featureId}" class="rounded-md bg-secondary-100 px-2 py-1.5 text-[11px] font-semibold text-secondary-700 hover:bg-secondary-200">+ Registrar aquí</button>
        </div>
        <div class="rounded-md border border-secondary-200 bg-secondary-50/60 p-2">
          <p class="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-500">Registrar acción</p>
          <div class="grid grid-cols-3 gap-1.5">
            <button id="btn-accion-evento-${featureId}" class="rounded bg-red-50 px-1.5 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100">Evento</button>
            <button id="btn-accion-lider-${featureId}" class="rounded bg-purple-50 px-1.5 py-1 text-[10px] font-semibold text-purple-700 hover:bg-purple-100">Líder</button>
            <button id="btn-accion-votante-${featureId}" class="rounded bg-blue-50 px-1.5 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100">Votante</button>
            <button id="btn-accion-apoyo-${featureId}" class="rounded bg-amber-50 px-1.5 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100">Apoyo</button>
            <button id="btn-accion-peticion-${featureId}" class="rounded bg-sky-50 px-1.5 py-1 text-[10px] font-semibold text-sky-700 hover:bg-sky-100">Petición</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function obtenerCoordenadasFeature(feature: any, layer: any): { lat: number; lng: number } | null {
  try {
    const geom = feature?.geometry;
    if (!geom) return null;
    if (geom.type === 'Point') {
      return { lat: geom.coordinates[1], lng: geom.coordinates[0] };
    }
    const centroid = layer?.getBounds?.()?.getCenter?.() || null;
    if (centroid) return { lat: centroid.lat, lng: centroid.lng };
  } catch {
    return null;
  }
  return null;
}

const CapaPersonalizada = memo(function CapaPersonalizada({ data, capa, capasGeoJSONRef, onFeatureClick, onSeleccionarCoordenada, onAccionPunto, onRender }: CapaPersonalizadaProps) {
  const map = useMap();
  const capaRef = useRef<L.GeoJSON | null>(null);
  const onFeatureClickRef = useRef(onFeatureClick);
  const onSeleccionarRef = useRef(onSeleccionarCoordenada);
  const onAccionPuntoRef = useRef(onAccionPunto);
  const lastHighlightedRef = useRef<any>(null);
  onFeatureClickRef.current = onFeatureClick;
  onSeleccionarRef.current = onSeleccionarCoordenada;
  onAccionPuntoRef.current = onAccionPunto;

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

    // Refuerzo: asegurar que todos los elementos gráficos de una capa bloqueada
    // no intercepten eventos de puntero, permitiendo clics a marcadores/eventos debajo.
    const aplicarBloqueoPointerEvents = () => {
      if (!pane) return;
      pane.querySelectorAll('path, circle, svg').forEach((el) => {
        (el as HTMLElement).style.pointerEvents = bloqueada ? 'none' : 'auto';
      });
    };

    const estilosCapa = (capa.estilos as Record<string, any>) || {};

    const baseStyle = (feature: any) => {
      const props = feature?.properties || {};
      const featureId = String(props._feature_id || props.id || props.ID || props.OBJECTID || props.objectid || props.FID || props.fid || props.gid || props.GID);
      const estiloFeature = estilosCapa[featureId] || {};
      const color = estiloFeature.color || props._feature_color || capa.color || '#3B82F6';
      const opacidad = props._feature_opacidad != null ? Number(props._feature_opacidad) : (esCapaSindical ? 0.85 : 0.7);
      const fillOpacity = props._feature_opacidad != null ? Number(props._feature_opacidad) * 0.35 : (esCapaSindical ? 0.35 : 0.2);
      return {
        color,
        fillColor: color,
        weight: esCapaSindical ? 2.5 : 2,
        opacity: opacidad,
        fillOpacity,
      };
    };

    const layer = L.geoJSON(data, {
      pane: paneName,
      style: baseStyle,
      interactive: !bloqueada,
      onEachFeature: bloqueada
        ? undefined
        : (feature: any, l: any) => {
            const props = feature?.properties || {};
            const featureBloqueado = Boolean(props._feature_bloqueado);
            const featureId = String(props._feature_id || props.id || props.ID || props.OBJECTID || props.objectid || props.FID || props.fid || props.gid || props.GID);

            if (featureBloqueado) {
              l.setStyle({ opacity: baseStyle(feature).opacity, fillOpacity: baseStyle(feature).fillOpacity });
              return;
            }

            const geometryType = feature?.geometry?.type;

            // Etiqueta permanente para capas de puntos (colonias / localidades)
            if (geometryType === 'Point' || geometryType === 'MultiPoint') {
              const label = escaparHtml(String(props._feature_nombre || props.NOMBRE_VER || props.nombre || props.NOMBRE || props.name || props.NAME || 'Sin nombre'));
              l.bindTooltip(
                `<div class="mapa-point-label">${label}</div>`,
                {
                  permanent: true,
                  direction: 'bottom',
                  offset: [0, 10],
                  opacity: 1,
                  interactive: false,
                  className: 'mapa-point-label-tooltip',
                } as any,
              );
            }

            l.on('click', (e: any) => {
              console.log('[CapaPersonalizada] click en feature', { capaId: capa.id, featureId, geometryType: feature?.geometry?.type });
              // Detener la propagación del evento para evitar que el clic llegue al mapa
              // y dispare el "limpiar selección" o el popup de registro.
              if (e.originalEvent) {
                L.DomEvent.stopPropagation(e.originalEvent);
                e.originalEvent.stopImmediatePropagation();
              }
              L.DomEvent.stopPropagation(e);
              ultimoClickEnFeature = Date.now();

              // Resetear el layer resaltado anterior (antes se hacía en popupclose)
              if (lastHighlightedRef.current && lastHighlightedRef.current !== l) {
                try { lastHighlightedRef.current.setStyle(baseStyle(lastHighlightedRef.current.feature)); } catch {}
              }

              l.bringToFront();
              l.setStyle({ weight: 4, opacity: 1, fillOpacity: Math.min(1, baseStyle(feature).fillOpacity + 0.2) });
              lastHighlightedRef.current = l;

              // Coordenada exacta del click (más preciso que el centroide que usaba el popup)
              const coords = e?.latlng ? { lat: e.latlng.lat, lng: e.latlng.lng } : obtenerCoordenadasFeature(feature, l);
              if (onFeatureClickRef.current) onFeatureClickRef.current(capa.id, featureId, props, feature?.geometry, coords || undefined);
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

    // Aplicar refuerzo de pointer-events tras el render (sync + microtask por seguridad)
    aplicarBloqueoPointerEvents();
    const timeoutRefuerzo = setTimeout(aplicarBloqueoPointerEvents, 0);

    console.log('[CapaPersonalizada] renderizada', capa.id, capa.nombre, 'bloqueada:', bloqueada, 'orden:', orden, 'features:', data.features.length);
    onRender?.();

    return () => {
      clearTimeout(timeoutRefuerzo);
      if (capaRef.current) {
        capaRef.current.removeFrom(map);
        capasGeoJSONRef.current?.delete(capa.id);
      }
    };
  }, [data, capa.id, capa.color, capa.nombre, capa.bloqueada, capa.orden, map, capasGeoJSONRef, onRender]);

  return null;
}, (prev, next) => {
  // Evitar remontar la capa si los datos son estructuralmente iguales.
  const equalFeatures = (a: any, b: any) => {
    if (a === b) return true;
    if (!a || !b) return false;
    const fa = a.features;
    const fb = b.features;
    if (!Array.isArray(fa) || !Array.isArray(fb)) return false;
    if (fa.length !== fb.length) return false;
    return fa.every((f: any, i: number) => String(f?.properties?._feature_id) === String(fb[i]?.properties?._feature_id));
  };
  return (
    prev.capa.id === next.capa.id &&
    prev.capa.color === next.capa.color &&
    prev.capa.nombre === next.capa.nombre &&
    prev.capa.bloqueada === next.capa.bloqueada &&
    prev.capa.orden === next.capa.orden &&
    equalFeatures(prev.data, next.data)
  );
});

function CentradorCapas({
  data,
  activas,
  personalizadas,
}: {
  data: MapaData;
  activas: Record<string, boolean>;
  personalizadas: { id: string; nombre: string; tipo: string; color: string; bloqueada?: boolean; orden?: number }[];
}) {
  const map = useMap();
  const yaCentradoRef = useRef(false);

  useEffect(() => {
    if (yaCentradoRef.current) return;

    const capasActivas = personalizadas.filter(c => activas[c.id] && data[c.id]?.features?.length);
    if (capasActivas.length === 0) return;

    // Calcular bounds combinados de todas las capas personalizadas activas
    let globalBounds: L.LatLngBounds | null = null;
    capasActivas.forEach(capa => {
      const geo = L.geoJSON(data[capa.id]!);
      const bounds = geo.getBounds();
      geo.remove();
      if (bounds?.isValid?.()) {
        if (!globalBounds) {
          globalBounds = bounds;
        } else {
          globalBounds.extend(bounds);
        }
      }
    });

    if (!globalBounds) return;

    const boundsTyped = globalBounds as L.LatLngBounds;
    if (!boundsTyped.isValid()) return;
    const center = boundsTyped.getCenter();
    const isOutsideMexico = center.lat < 14 || center.lat > 33 || center.lng < -118 || center.lng > -86;
    const currentCenter = map.getCenter();
    const isCurrentlyInMexico =
      currentCenter.lat >= 14 && currentCenter.lat <= 33 &&
      currentCenter.lng >= -118 && currentCenter.lng <= -86;

    // Solo auto-centrar si las capas están fuera de México y el mapa sigue en México
    // (para no sobreescribir el comportamiento de proyectos mexicanos existentes)
    if (isOutsideMexico && isCurrentlyInMexico) {
      yaCentradoRef.current = true;
      registerProgrammaticMove(1200);
      map.fitBounds(boundsTyped, { padding: [80, 80], maxZoom: 14, animate: true });
    }
  }, [map, data, activas, personalizadas]);

  return null;
}

function popupAccionesHtml(
  onAccion: (tipo: 'apoyo' | 'evento' | 'lider' | 'peticion' | 'votante', lat: number, lng: number) => void,
  onCerrar: () => void,
  lat: number,
  lng: number
): HTMLElement {
  const opciones: Array<{ id: 'apoyo' | 'peticion' | 'evento' | 'lider' | 'votante'; label: string; color: string; bg: string; hover: string; text: string; svg: string }> = [
    { id: 'apoyo', label: 'Apoyo', color: COLORES_CAPA.apoyos, bg: 'bg-amber-50', hover: 'hover:bg-amber-100', text: 'text-amber-700', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' },
    { id: 'peticion', label: 'Petición', color: COLORES_CAPA.peticiones, bg: 'bg-sky-50', hover: 'hover:bg-sky-100', text: 'text-sky-700', svg: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z' },
    { id: 'evento', label: 'Evento', color: COLORES_CAPA.eventos, bg: 'bg-red-50', hover: 'hover:bg-red-100', text: 'text-red-700', svg: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z' },
    { id: 'lider', label: 'Líder', color: COLORES_CAPA.lideres, bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700', svg: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' },
    { id: 'votante', label: 'Votante', color: COLORES_CAPA.votantes, bg: 'bg-red-50', hover: 'hover:bg-red-100', text: 'text-red-700', svg: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  ];

  const root = document.createElement('div');
  root.className = 'w-64 p-1 font-sans';
  root.innerHTML = `
    <div class="mb-3 flex items-center gap-2">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <svg viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>
      <div>
        <p class="text-sm font-bold text-secondary-900">¿Qué registrar aquí?</p>
        <p class="text-[10px] text-secondary-500">Selecciona el tipo de registro</p>
      </div>
    </div>
    <div class="space-y-2">
      <div class="grid grid-cols-3 gap-2">
        ${opciones.slice(0, 3).map(op => `
          <button data-accion="${op.id}" class="accion-btn flex flex-col items-center gap-1 rounded-xl border border-secondary-100 ${op.bg} ${op.hover} p-2.5 transition">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" style="color:${op.color}"><path d="${op.svg}"/></svg>
            <span class="text-[11px] font-semibold ${op.text}">${op.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="grid grid-cols-2 gap-2 px-4">
        ${opciones.slice(3).map(op => `
          <button data-accion="${op.id}" class="accion-btn flex flex-col items-center gap-1 rounded-xl border border-secondary-100 ${op.bg} ${op.hover} p-2.5 transition">
            <svg viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5" style="color:${op.color}"><path d="${op.svg}"/></svg>
            <span class="text-[11px] font-semibold ${op.text}">${op.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
    <button id="cerrar-popup-acciones" class="mt-3 w-full rounded-lg py-1.5 text-xs font-medium text-secondary-500 transition hover:bg-secondary-50">Cancelar</button>
  `;

  root.querySelectorAll('button[data-accion]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipo = btn.getAttribute('data-accion') as any;
      onAccion(tipo, lat, lng);
    });
  });

  const cerrar = root.querySelector('#cerrar-popup-acciones');
  cerrar?.addEventListener('click', onCerrar);

  return root;
}

function MarcadorPuntoSeleccionado({
  lat,
  lng,
  onAccion,
  onCerrar,
}: {
  lat: number;
  lng: number;
  onAccion: (tipo: 'apoyo' | 'evento' | 'lider' | 'peticion' | 'votante', lat: number, lng: number) => void;
  onCerrar: () => void;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const onAccionRef = useRef(onAccion);
  const onCerrarRef = useRef(onCerrar);
  onAccionRef.current = onAccion;
  onCerrarRef.current = onCerrar;

  useEffect(() => {
    if (!map) return;
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: 'custom-pin-seleccion',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${COLORES_CAPA.eventos};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:bold;">+</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    });
    markerRef.current = marker;

    const content = popupAccionesHtml(
      (tipo, llat, llng) => onAccionRef.current(tipo, llat, llng),
      () => onCerrarRef.current(),
      lat,
      lng
    );

    marker.bindPopup(content, {
      closeButton: false,
      className: 'rounded-2xl popup-acciones-mapa',
      autoPan: true,
      autoPanPadding: [16, 16],
      minWidth: 260,
      autoClose: false,
      closeOnClick: false,
      offset: [0, -10],
    });

    marker.addTo(map);

    const open = (intentos = 0) => {
      try {
        marker.openPopup();
        console.log('[MarcadorPuntoSeleccionado] popup abierto', { lat, lng, intentos });
      } catch (err) {
        console.warn('[MarcadorPuntoSeleccionado] error abriendo popup', err);
        if (intentos < 8) setTimeout(() => open(intentos + 1), 80);
      }
    };
    open();

    marker.on('popupclose', () => {
      console.log('[MarcadorPuntoSeleccionado] popup cerrado');
      onCerrarRef.current();
    });

    return () => {
      try { marker.removeFrom(map); } catch {}
      markerRef.current = null;
    };
  }, [map, lat, lng]);

  return null;
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
