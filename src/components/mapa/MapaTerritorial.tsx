'use client';

import { useEffect, useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MapaData, CapaMapa, MapaPrefs, ResultadoGlobal, DetalleTerritorial } from '@/types/mapa';
import { Lider, Zona } from '@/types';
import { mapaApi, lideresApi, zonasApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';
import { useMapaPrefs } from '@/hooks/useMapaPrefs';
import SubirCapaModal from './SubirCapaModal';
import ImportarSeccionesIneModal from './ImportarSeccionesIneModal';
import ImportarSeccionesExcelModal from './ImportarSeccionesExcelModal';
import EditarCapaModal from './EditarCapaModal';
import EditarEstilosCapaModal from './EditarEstilosCapaModal';
import NuevoLiderModal from './NuevoLiderModal';
import NuevoEventoModal from './NuevoEventoModal';
import NuevoApoyoModal from './NuevoApoyoModal';
import LeyendaMapa from './LeyendaMapa';
import BuscadorGlobal from './BuscadorGlobal';
import FichaTerritorial from './FichaTerritorial';
import PanelFlotante from './PanelFlotante';
import ExploradorCapa, { ElementoCapa } from './ExploradorCapa';
import FichaFeature from './FichaFeature';
import type { MapaLeafletRef } from './MapaLeaflet';

const MapaLeaflet = dynamic(() => import('./MapaLeaflet').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <p className="text-sm text-secondary-600">Cargando mapa territorial...</p>
      </div>
    </div>
  ),
});

const CAPAS_CONFIG: {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  color: string;
  funcional: boolean;
}[] = [
  {
    id: 'votantes',
    nombre: 'Votantes / Simpatizantes',
    icono: 'votantes',
    descripcion: 'Votantes registrados con ubicación desde brigada',
    color: '#EF4444',
    funcional: true,
  },
  {
    id: 'recorridos',
    nombre: 'Recorridos',
    icono: 'mapa',
    descripcion: 'Rutas caminadas por brigadas',
    color: '#D73216',
    funcional: false,
  },
  {
    id: 'apoyos',
    nombre: 'Apoyos',
    icono: 'apoyos',
    descripcion: 'Entregas registradas desde brigada',
    color: '#F59E0B',
    funcional: true,
  },
  {
    id: 'peticiones',
    nombre: 'Peticiones',
    icono: 'crm',
    descripcion: 'Solicitudes ciudadanas georreferenciadas',
    color: '#06B6D4',
    funcional: true,
  },
  {
    id: 'eventos',
    nombre: 'Eventos',
    icono: 'eventos',
    descripcion: 'Mítines y reuniones programadas',
    color: '#D73216',
    funcional: true,
  },
  {
    id: 'lideres',
    nombre: 'Líderes',
    icono: 'lideres',
    descripcion: 'Líderes territoriales e influencia',
    color: '#383745',
    funcional: true,
  },
  {
    id: 'custom',
    nombre: 'Territorio personalizado',
    icono: 'seguridad',
    descripcion: 'Capas subidas o dibujadas a mano',
    color: '#8B5CF6',
    funcional: true,
  },
];

const CAPAS_IDS = CAPAS_CONFIG.map(c => c.id);

const DEFAULTS: MapaPrefs = {
  activas: Object.fromEntries(CAPAS_CONFIG.map(c => [c.id, false])) as Record<string, boolean>,
  capasExpandidas: {} as Record<string, boolean>,
  gruposExpandidos: { subidas: false, campania: true } as Record<string, boolean>,
  filtrosApoyos: {} as Record<string, boolean>,
  grupoLideresPor: 'seccion',
  soloLideresPadre: false,
  scoreMin: '',
  zonaFiltro: '',
  conSinCoordenadas: 'todos',
  topN: '',
  modoLideres: 'pines',
};

export default function MapaTerritorial() {
  const prefs = useMapaPrefs('mapa-territorial', DEFAULTS);
  const [activas, setActivas] = useState<Record<string, boolean>>(prefs.activas);
  const [capaSubir, setCapaSubir] = useState<string | null>(null);
  const [capaEditar, setCapaEditar] = useState<CapaMapa | null>(null);
  const [capaEditarEstilos, setCapaEditarEstilos] = useState<CapaMapa | null>(null);
  const [featureEditando, setFeatureEditando] = useState<{
    capaId: string;
    featureId: string;
    nombre: string;
    color: string;
    props: Record<string, any>;
  } | null>(null);
  const [featureSindicalSeleccionado, setFeatureSindicalSeleccionado] = useState<{
    capaId: string;
    featureId: string;
    props: Record<string, any>;
  } | null>(null);

  // Estados del panel flotante / explorador / ficha
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [panelVista, setPanelVista] = useState<'capas' | 'explorar'>('capas');
  const [exploradorCapaId, setExploradorCapaId] = useState<string | null>(null);
  const [featureSeleccionado, setFeatureSeleccionado] = useState<ElementoCapa | null>(null);
  const [modoLimpio, setModoLimpio] = useState(false);
  const [mostrarLeyenda, setMostrarLeyenda] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(true);
  const [mostrarResumen, setMostrarResumen] = useState(true);
  const [resumenPos, setResumenPos] = useState<{ x: number; y: number } | null>(null);

  const [guardandoFeature, setGuardandoFeature] = useState(false);
  const [modalIneSecciones, setModalIneSecciones] = useState(false);
  const [modalExcel, setModalExcel] = useState(false);
  const [modalActivo, setModalActivo] = useState<'lider' | 'evento' | 'apoyo' | null>(null);
  const [puntoInicial, setPuntoInicial] = useState<{ lat: number; lng: number } | null>(null);
  const [capasExpandidas, setCapasExpandidas] = useState<Record<string, boolean>>(prefs.capasExpandidas);
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>(prefs.gruposExpandidos);
  const [capasPersonalizadas, setCapasPersonalizadas] = useState<CapaMapa[]>([]);
  const [secciones, setSecciones] = useState<string[]>([]);

  const [seleccion, setSeleccion] = useState<{ geometry: any; properties?: any; tipo?: string; nombre?: string } | null>(null);
  const [resultadoDestacado, setResultadoDestacado] = useState<ResultadoGlobal | null>(null);
  const [detalle, setDetalle] = useState<DetalleTerritorial | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  const [data, setData] = useState<MapaData>({});
  const [stats, setStats] = useState<any[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [grupoLideresPor, setGrupoLideresPor] = useState<'seccion' | 'colonia' | 'score'>(prefs.grupoLideresPor);
  const [filtrosApoyos, setFiltrosApoyos] = useState<Record<string, boolean>>(prefs.filtrosApoyos);

  // Filtros de líderes
  const [soloLideresPadre, setSoloLideresPadre] = useState(prefs.soloLideresPadre);
  const [scoreMin, setScoreMin] = useState<number | ''>(prefs.scoreMin);
  const [zonaFiltro, setZonaFiltro] = useState<string>(prefs.zonaFiltro);
  const [conSinCoordenadas, setConSinCoordenadas] = useState<'todos' | 'con' | 'sin'>(prefs.conSinCoordenadas);
  const [topN, setTopN] = useState<number | ''>(prefs.topN);
  const [modoLideres, setModoLideres] = useState<'pines' | 'circulos' | 'heatmap' | 'solo_puntos'>(prefs.modoLideres);
  const [mapBounds, setMapBounds] = useState<{ south: number; west: number; north: number; east: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingCapas, setLoadingCapas] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [modoDemo, setModoDemo] = useState(false);
  const mapRef = useRef<MapaLeafletRef | null>(null);
  const debounceBoundsRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resumenRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const router = useRouter();

  // Persistir cada cambio de preferencias
  useEffect(() => {
    prefs.save({
      activas,
      capasExpandidas,
      gruposExpandidos,
      filtrosApoyos,
      grupoLideresPor,
      soloLideresPadre,
      scoreMin,
      zonaFiltro,
      conSinCoordenadas,
      topN,
      modoLideres,
    });
  }, [
    activas, capasExpandidas, gruposExpandidos, filtrosApoyos,
    grupoLideresPor, soloLideresPadre, scoreMin, zonaFiltro, conSinCoordenadas, topN, modoLideres,
  ]);

  const toggleCapa = useCallback((id: string) => {
    setActivas(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleExpandir = useCallback((id: string) => {
    setCapasExpandidas(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleGrupo = useCallback((id: string) => {
    setGruposExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const expandirCapa = useCallback((id: string) => {
    setCapasExpandidas(prev => ({ ...prev, [id]: true }));
  }, []);

  const activarTodas = useCallback(() => {
    setActivas(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => (next[k] = true));
      return next;
    });
  }, []);

  const desactivarTodas = useCallback(() => {
    setActivas(prev => {
      const next: Record<string, boolean> = {};
      Object.keys(prev).forEach(k => (next[k] = false));
      return next;
    });
  }, []);

  const verLiderEnMapa = useCallback((l: Lider) => {
    const c = l.votante?.coordenadas;
    if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') return;
    if (!activas.lideres) {
      setActivas(prev => ({ ...prev, lideres: true }));
    }
    setTimeout(() => {
      mapRef.current?.flyTo(c.lat, c.lng, 17);
    }, 150);
  }, [activas.lideres]);

  const handleBoundsChange = useCallback((bounds: { south: number; west: number; north: number; east: number }) => {
    if (debounceBoundsRef.current) clearTimeout(debounceBoundsRef.current);
    debounceBoundsRef.current = setTimeout(() => {
      setMapBounds(bounds);
    }, 400);
  }, []);

  const abrirModal = useCallback((tipo: 'lider' | 'evento' | 'apoyo', coords?: { lat: number; lng: number } | null) => {
    setPuntoInicial(coords || null);
    setModalActivo(tipo);
  }, []);

  const cerrarModal = useCallback(() => {
    setModalActivo(null);
    setPuntoInicial(null);
  }, []);

  const cerrarFicha = useCallback(() => {
    setDetalle(null);
    setSeleccion(null);
  }, []);

  const handleFeatureClick = useCallback((capaId: string, featureId: string, props: Record<string, any>) => {
    const esCapaSindical = /STASE|Sindicales/i.test(
      capasPersonalizadas.find(c => c.id === capaId)?.nombre || ''
    );
    if (esCapaSindical) {
      setFeatureSindicalSeleccionado({ capaId, featureId, props });
    }

    // Construir elemento para la ficha flotante
    const capa = capasPersonalizadas.find(c => c.id === capaId) || CAPAS_CONFIG.find(c => c.id === capaId);
    const feature = data[capaId]?.features?.find((f: any) => {
      const p = f.properties || {};
      const fid = String(p._feature_id || p.id || p.ID || p.OBJECTID || p.objectid || p.FID || p.fid || p.gid || p.GID);
      return fid === featureId;
    });
    setFeatureSeleccionado({
      id: featureId,
      nombre: props._feature_nombre || props.NOMBRE || props.nombre || props.name || capa?.nombre || 'Elemento',
      subtexto: capa?.nombre,
      feature: feature || { type: 'Feature', properties: props, geometry: null } as any,
      capaId,
      capaNombre: capa?.nombre || capaId,
      color: capa?.color,
    });

    setFeatureEditando({
      capaId,
      featureId,
      nombre: props._feature_nombre || featureId,
      color: props._feature_color || capasPersonalizadas.find(c => c.id === capaId)?.color || '#3B82F6',
      props,
    });
  }, [capasPersonalizadas, data]);

  const cerrarFeatureEditando = useCallback(() => {
    setFeatureEditando(null);
  }, []);

  const cerrarFeatureSindical = useCallback(() => {
    setFeatureSindicalSeleccionado(null);
  }, []);

  const abrirPanel = useCallback((vista: 'capas' | 'explorar' = 'capas') => {
    setPanelVista(vista);
    setPanelAbierto(true);
  }, []);

  const cerrarPanel = useCallback(() => {
    setPanelAbierto(false);
  }, []);

  const abrirExplorador = useCallback((capaId: string | null = null) => {
    setExploradorCapaId(capaId);
    setPanelVista('explorar');
    setPanelAbierto(true);
  }, []);

  const asegurarCapaCargada = useCallback(async (capaId: string, featureId: string, geometry?: any) => {
    if (data[capaId]?.features?.length) return; // ya cargada
    try {
      const res = await mapaApi.getGeoJson([capaId]);
      const capaData = (res.data as MapaData)?.[capaId];
      if (capaData?.features?.length) {
        setData(prev => ({ ...prev, ...(res.data as MapaData) }));
      } else if (geometry) {
        // Fallback: mostrar la geometría sola si la capa padre no está disponible
        setData(prev => ({
          ...prev,
          [`__temp-${capaId}`]: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry,
              properties: { _feature_id: featureId, _feature_color: '#D73216', _feature_nombre: 'Búsqueda' },
            }],
          } as any,
        }));
      }
    } catch (e) {
      console.error('[MapaTerritorial] Error cargando capa para resaltar:', e);
    }
  }, [data]);

  const seleccionarElemento = useCallback(async (el: ElementoCapa) => {
    // Activar la capa padre
    setActivas(prev => ({ ...prev, [el.capaId]: true }));

    const p = el.feature?.properties || {};
    const id = String(p._feature_id || p.id || p.ID || p.OBJECTID || p.objectid || p.FID || p.fid || p.gid || p.GID);
    const geometry = el.feature?.geometry;

    await asegurarCapaCargada(el.capaId, id, geometry);
    mapRef.current?.resaltarFeature(el.capaId, id, geometry);

    setFeatureSeleccionado(el);
    cerrarPanel();
  }, [asegurarCapaCargada, cerrarPanel]);

  const seleccionarResultado = useCallback(async (r: ResultadoGlobal) => {
    setDetalle(null);
    setSeleccion({ geometry: r.geometry, tipo: r.tipo, nombre: r.nombre });

    // Activar la capa padre y asegurar que esté cargada
    const idCapa = r.tipo === 'capa_feature' ? r.capaId : r.tipo === 'capa' ? r.id : undefined;
    if (idCapa) {
      setActivas((prev) => ({ ...prev, [idCapa]: true }));
      await asegurarCapaCargada(idCapa, r.featureId || r.id, r.geometry);
    }

    // Pasar el resultado al mapa para que maneje el zoom y resaltado internamente
    setResultadoDestacado(r);

    // Detalle territorial solo para geometrías poligonales con área
    const esPoligono = r.geometry?.type === 'Polygon' || r.geometry?.type === 'MultiPolygon';
    if (!esPoligono) {
      setCargandoDetalle(false);
      return;
    }

    setCargandoDetalle(true);
    try {
      const res = await mapaApi.detalleTerritorial({
        tipo: r.tipo,
        id: r.id,
        nombre: r.nombre,
        geometry: r.geometry,
        estado_id: r.estado_id,
        municipio_id: r.municipio_id,
        seccion: r.seccion,
        clave: r.clave,
      });
      setDetalle(res.data as DetalleTerritorial);
    } catch (e) {
      console.error('Error cargando detalle territorial:', e);
    } finally {
      setCargandoDetalle(false);
    }
  }, [asegurarCapaCargada]);

  const construirParamsGeo = useCallback(() => {
    const params: any = { limit: 500 };
    if (soloLideresPadre) params.padres = 'true';
    if (scoreMin !== '') params.score_min = scoreMin;
    if (zonaFiltro) params.zona_id = zonaFiltro;
    if (conSinCoordenadas === 'con') params.sin_coordenadas = 'false';
    if (conSinCoordenadas === 'sin') params.sin_coordenadas = 'true';
    if (topN !== '') params.limit = Math.min(Number(topN), 2000);
    if (mapBounds) params.bbox = `${mapBounds.west},${mapBounds.south},${mapBounds.east},${mapBounds.north}`;
    return params;
  }, [soloLideresPadre, scoreMin, zonaFiltro, conSinCoordenadas, topN, mapBounds]);

  const idsActivos = useCallback(() => {
    const predefinidos = CAPAS_CONFIG.filter(c => activas[c.id]).map(c => c.id);
    const personalizados = capasPersonalizadas.filter(c => activas[c.id]).map(c => c.id);
    return [...predefinidos, ...personalizados];
  }, [activas, capasPersonalizadas]);

  const cargarConfigInicial = useCallback(async () => {
    setError(null);
    try {
      const capasRes = await mapaApi.getCapas();
      const personalizadas = capasRes.data?.personalizadas || [];
      setCapasPersonalizadas(personalizadas);
      const zonasRes = await zonasApi.getAll().catch((err: any) => {
        console.warn('Zonas no disponibles:', err);
        return { data: [] };
      });
      setZonas(zonasRes.data || []);
    } catch (err: any) {
      console.error('Error cargando configuración inicial del mapa:', err);
      setError(errorToString(err) || 'Error cargando capas personalizadas');
    } finally {
      setLoadingInicial(false);
    }
  }, []);

  const cargarGeoJson = useCallback(async () => {
    const capasActivas = idsActivos();
    if (capasActivas.length === 0 || !mapBounds) {
      setData({});
      return { nuevoGeo: {}, todasFallaron: false };
    }

    setLoadingGeo(true);
    try {
      const params = construirParamsGeo();
      const nextLoading: Record<string, boolean> = {};
      capasActivas.forEach(id => { nextLoading[id] = true; });
      setLoadingCapas(nextLoading);

      const promises = capasActivas.map(id =>
        mapaApi.getGeoJsonCapa(id, params)
          .then(res => ({ ok: true, id, data: (res.data as MapaData)?.[id] }))
          .catch(err => {
            console.error(`[MapaTerritorial] Error cargando capa ${id}:`, err);
            return { ok: false, id, data: null };
          })
          .finally(() => setLoadingCapas(prev => ({ ...prev, [id]: false })))
      );

      const resultados = await Promise.all(promises);
      const nuevoGeo: MapaData = {};
      let todasFallaron = true;
      resultados.forEach(r => {
        if (r.ok && r.data) {
          nuevoGeo[r.id] = r.data;
          todasFallaron = false;
        }
      });

      setData(nuevoGeo);
      setModoDemo(false);
      return { nuevoGeo, todasFallaron };
    } catch (err: any) {
      console.error('Error cargando GeoJSON del mapa:', err);
      return { nuevoGeo: {}, todasFallaron: true };
    } finally {
      setLoadingGeo(false);
    }
  }, [idsActivos, mapBounds, construirParamsGeo]);

  const cargarStatsYLideres = useCallback(async () => {
    if (!mapBounds) return;
    const params = construirParamsGeo();
    try {
      const [statsRes, lideresRes] = await Promise.all([
        mapaApi.getEstadisticas('seccion').catch((err: any) => {
          console.warn('Estadísticas no disponibles:', err);
          return { data: { items: [] } };
        }),
        lideresApi.getAll(params).catch((err: any) => {
          console.warn('Líderes no disponibles:', err);
          return { data: [] };
        }),
      ]);
      setStats(statsRes.data?.items || []);
      setLideres(lideresRes.data || []);
    } catch (err: any) {
      console.error('Error cargando estadísticas y líderes:', err);
    }
  }, [mapBounds, construirParamsGeo]);

  const cargarDatos = useCallback(async (forzarDemo = false) => {
    setLoading(true);
    setError(null);
    try {
      await cargarConfigInicial();
      const { nuevoGeo, todasFallaron } = await cargarGeoJson();
      await cargarStatsYLideres();

      if (todasFallaron && idsActivos().length > 0) {
        if (forzarDemo) {
          const demo = generarDemoData();
          setData(demo);
          setModoDemo(true);
          setSecciones([]);
          setLideres(demo.lideres?.features.map((f: any) => ({
            id: f.properties.id,
            votante: { nombre: f.properties.nombre, coordenadas: { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] } },
            score: f.properties.score,
            alcance_estimado: f.properties.alcance_estimado,
          } as unknown as Lider)) || []);
          setStats([]);
          setZonas([]);
          setError('Modo demo activado manualmente. No se pudo conectar con el servidor de mapas.');
          return;
        }
        setError('No se pudieron cargar las capas activas del mapa. Intenta recargar o activar menos capas.');
      }

      setSecciones([]);

      // Extraer tipos de apoyo para filtros (mantener preferencias del usuario)
      const tiposApoyo = new Set<string>(['despensa', 'medicamento', 'lamina', 'otro']);
      (nuevoGeo.apoyos?.features || []).forEach((f: any) => {
        const t = f.properties?.tipo_apoyo;
        if (t) tiposApoyo.add(String(t));
      });
      setFiltrosApoyos(prev => {
        const next: Record<string, boolean> = { ...prev };
        tiposApoyo.forEach(t => {
          if (!(t in next)) next[t] = true;
        });
        return next;
      });
    } catch (err: any) {
      console.error('Error cargando mapa:', err);
      const msg = errorToString(err) || 'Error cargando datos del mapa';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [cargarConfigInicial, cargarGeoJson, cargarStatsYLideres, idsActivos]);

  const guardarFeature = useCallback(async () => {
    if (!featureEditando) return;
    try {
      setGuardandoFeature(true);
      const capa = capasPersonalizadas.find(c => c.id === featureEditando.capaId);
      const estilosActuales = { ...(capa?.estilos || {}) };
      const cambios: { color?: string; nombre?: string } = {};
      if (featureEditando.color) cambios.color = featureEditando.color;
      if (featureEditando.nombre) cambios.nombre = featureEditando.nombre;
      estilosActuales[featureEditando.featureId] = { ...(estilosActuales[featureEditando.featureId] || {}), ...cambios };
      await mapaApi.updateEstilosCapa(featureEditando.capaId, estilosActuales);
      // Actualizar capas personalizadas localmente para que el color se vea inmediatamente
      setCapasPersonalizadas(prev =>
        prev.map(c =>
          c.id === featureEditando.capaId ? { ...c, estilos: estilosActuales } : c
        )
      );
      // Forzar recarga de geojson de esa capa
      setData(prev => {
        const capaGeo = prev[featureEditando.capaId];
        if (!capaGeo) return prev;
        const next = { ...prev };
        next[featureEditando.capaId] = {
          ...capaGeo,
          features: capaGeo.features.map((f: any) => {
            const p = f.properties || {};
            const fid = String(p._feature_id || p.id || p.ID || p.OBJECTID || p.objectid || p.FID || p.fid || p.gid || p.GID);
            if (fid !== featureEditando.featureId) return f;
            return {
              ...f,
              properties: {
                ...p,
                _feature_color: featureEditando.color,
                _feature_nombre: featureEditando.nombre || p._feature_nombre,
                color: featureEditando.color,
              },
            };
          }),
        };
        return next;
      });
      cerrarFeatureEditando();
    } catch (e) {
      console.error('Error guardando feature:', e);
      setError('No se pudo guardar el polígono');
    } finally {
      setGuardandoFeature(false);
    }
  }, [featureEditando, capasPersonalizadas]);

  useEffect(() => {
    cargarConfigInicial();
  }, [cargarConfigInicial]);

  // Atajos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === 'l') {
        e.preventDefault();
        abrirPanel('capas');
      } else if (key === 'f' || key === 'escape') {
        e.preventDefault();
        setModoLimpio(prev => !prev);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [abrirPanel]);

  useEffect(() => {
    // No cargar capas geográficas hasta tener bounds del mapa; evita traer TODO el país.
    if (!mapBounds) return;
    cargarGeoJson();
  }, [cargarGeoJson, mapBounds]);

  useEffect(() => {
    // Estadísticas y líderes son complementarios; se cargan silenciosamente con bounds.
    if (!mapBounds) return;
    cargarStatsYLideres();
  }, [cargarStatsYLideres, mapBounds]);

  const onExitoGuardado = useCallback((tipo?: 'lider' | 'evento' | 'apoyo', id?: string, lat?: number, lng?: number) => {
    cerrarModal();
    setPuntoInicial(null);

    if (tipo === 'apoyo' && !activas.apoyos) {
      setActivas(prev => ({ ...prev, apoyos: true }));
    }

    // Recargar datos y asegurar que el tipo de apoyo recién creado esté visible
    cargarDatos();

    if (lat != null && lng != null) {
      setTimeout(() => mapRef.current?.flyTo(lat, lng, 17), 250);
    }
  }, [cargarDatos, cerrarModal, activas.apoyos]);

  // Drag del panel de resumen
  const iniciarDragResumen = useCallback((clientX: number, clientY: number) => {
    const el = resumenRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffsetRef.current = { x: clientX - rect.left, y: clientY - rect.top };
    isDraggingRef.current = true;
    el.style.cursor = 'grabbing';
    setResumenPos(prev => {
      if (prev) return prev;
      const parent = el.offsetParent as HTMLElement | null;
      if (!parent) return { x: 0, y: 0 };
      const parentRect = parent.getBoundingClientRect();
      return { x: rect.left - parentRect.left, y: rect.top - parentRect.top };
    });
  }, []);

  const handleResumenMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    iniciarDragResumen(e.clientX, e.clientY);
  }, [iniciarDragResumen]);

  const handleResumenTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    iniciarDragResumen(e.touches[0].clientX, e.touches[0].clientY);
  }, [iniciarDragResumen]);

  useEffect(() => {
    const onMove = (e: Event) => {
      if (!isDraggingRef.current) return;
      let clientX: number;
      let clientY: number;
      if ('TouchEvent' in window && e instanceof TouchEvent) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        e.preventDefault();
      } else if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        return;
      }
      const el = resumenRef.current;
      if (!el) return;
      const parent = el.offsetParent as HTMLElement | null;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      setResumenPos({
        x: clientX - dragOffsetRef.current.x - parentRect.left,
        y: clientY - dragOffsetRef.current.y - parentRect.top,
      });
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      const el = resumenRef.current;
      if (el) el.style.cursor = '';
      setResumenPos(prev => {
        if (!prev) return prev;
        const panel = resumenRef.current;
        if (!panel) return prev;
        const parent = panel.offsetParent as HTMLElement | null;
        if (!parent) return prev;
        const rect = panel.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const maxLeft = Math.max(0, parentRect.width - rect.width);
        const maxTop = Math.max(0, parentRect.height - rect.height);
        return {
          x: Math.max(0, Math.min(prev.x, maxLeft)),
          y: Math.max(0, Math.min(prev.y, maxTop)),
        };
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  const lideresFiltrados = useMemo(() => {
    let resultado = [...lideres];

    if (soloLideresPadre) {
      resultado = resultado.filter((l) => !l.lider_padre_id);
    }

    if (scoreMin !== '') {
      resultado = resultado.filter((l) => (l.score ?? 0) >= scoreMin);
    }

    if (zonaFiltro) {
      resultado = resultado.filter((l) => l.zonas?.some((z) => z.id === zonaFiltro));
    }

    if (conSinCoordenadas === 'con') {
      resultado = resultado.filter((l) => l.votante?.coordenadas && typeof l.votante.coordenadas.lat === 'number');
    } else if (conSinCoordenadas === 'sin') {
      resultado = resultado.filter((l) => !l.votante?.coordenadas || typeof l.votante.coordenadas.lat !== 'number');
    }

    if (topN !== '') {
      resultado = resultado
        .slice()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, topN);
    }

    return resultado;
  }, [lideres, soloLideresPadre, scoreMin, zonaFiltro, conSinCoordenadas, topN]);

  const lideresConUbicacion = useMemo(() => {
    return lideresFiltrados.filter(
      (l) =>
        l.votante?.coordenadas &&
        typeof l.votante.coordenadas.lat === 'number' &&
        typeof l.votante.coordenadas.lng === 'number' &&
        !isNaN(l.votante.coordenadas.lat) &&
        !isNaN(l.votante.coordenadas.lng)
    );
  }, [lideresFiltrados]);

  const lideresSinUbicacion = useMemo(() => {
    return lideresFiltrados.filter((l) => !lideresConUbicacion.some((c) => c.id === l.id));
  }, [lideresFiltrados, lideresConUbicacion]);

  const lideresAgrupados = useMemo(() => {
    const grupos: Record<string, Lider[]> = {};
    const sinGrupo: Lider[] = [];

    lideresConUbicacion.forEach(l => {
      let clave = '';
      if (grupoLideresPor === 'seccion') {
        clave = l.votante?.seccion_electoral || 'Sin sección';
      } else if (grupoLideresPor === 'colonia') {
        clave = l.votante?.colonia || 'Sin colonia';
      } else if (grupoLideresPor === 'score') {
        const s = l.score ?? 0;
        if (s >= 80) clave = '🔥 Alto impacto (80+ pts)';
        else if (s >= 50) clave = '⚡ Medio impacto (50-79 pts)';
        else clave = '🌱 En crecimiento (<50 pts)';
      }

      if (!clave) {
        sinGrupo.push(l);
        return;
      }
      if (!grupos[clave]) grupos[clave] = [];
      grupos[clave].push(l);
    });

    // Ordenar grupos: secciones numéricamente, colonias alfabéticamente, score por prioridad
    const ordenados = Object.entries(grupos).sort(([a], [b]) => {
      if (grupoLideresPor === 'seccion') {
        return a.localeCompare(b, undefined, { numeric: true });
      }
      if (grupoLideresPor === 'score') {
        const orden = ['🔥 Alto impacto (80+ pts)', '⚡ Medio impacto (50-79 pts)', '🌱 En crecimiento (<50 pts)'];
        return orden.indexOf(a) - orden.indexOf(b);
      }
      return a.localeCompare(b);
    });

    if (sinGrupo.length > 0) {
      ordenados.push([grupoLideresPor === 'seccion' ? 'Sin sección' : 'Sin grupo', sinGrupo]);
    }

    return ordenados;
  }, [lideresConUbicacion, grupoLideresPor]);

  const capasPorSeccion = useMemo(() => {
    const grupos: Record<string, CapaMapa[]> = {};
    const sinSeccion: CapaMapa[] = [];

    capasPersonalizadas.forEach(capa => {
      const seccion = (capa.metadata as any)?.seccion_electoral;
      if (seccion) {
        if (!grupos[seccion]) grupos[seccion] = [];
        grupos[seccion].push(capa);
      } else {
        sinSeccion.push(capa);
      }
    });

    return { grupos, sinSeccion };
  }, [capasPersonalizadas]);

  const capasPorGrupo = useMemo(() => {
    const grupos: Record<string, CapaMapa[]> = {};
    const sinGrupo: CapaMapa[] = [];

    capasPersonalizadas.forEach(capa => {
      const grupo = (capa.metadata as any)?.grupo || (capa.metadata as any)?.capa_territorio;
      if (grupo) {
        if (!grupos[grupo]) grupos[grupo] = [];
        grupos[grupo].push(capa);
      } else {
        sinGrupo.push(capa);
      }
    });

    return { grupos, sinGrupo };
  }, [capasPersonalizadas]);

  const nombresGrupos = useMemo(() => {
    const set = new Set<string>();
    capasPersonalizadas.forEach(capa => {
      const g = (capa.metadata as any)?.grupo;
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [capasPersonalizadas]);

  const renderCapaButton = (capa: CapaMapa, capaTerritorioDefault?: string) => (
    <div key={capa.id} className="rounded-lg border border-secondary-100 bg-white p-2">
      <div className="flex items-start gap-2 p-2">
        <button
          onClick={() => toggleCapa(capa.id)}
          title={activas[capa.id] ? 'Desactivar capa' : 'Activar capa'}
          className="relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none"
          style={{ backgroundColor: activas[capa.id] ? capa.color : '#D1D5DB' }}
          aria-checked={activas[capa.id]}
          role="switch"
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${activas[capa.id] ? 'translate-x-5' : 'translate-x-0.5'}`}
          />
        </button>

        <button
          onClick={() => setCapaSubir(capaTerritorioDefault || 'custom')}
          className="min-w-0 flex-1 text-left"
        >
          <p className={`text-sm font-semibold ${activas[capa.id] ? 'text-secondary-900' : 'text-secondary-600'}`}>
            {capa.nombre}
          </p>
          <p className="text-xs leading-snug text-secondary-500">
            {((capa.metadata as any)?.tipo_archivo || 'custom').toUpperCase()}
            {(capa.metadata as any)?.archivo_original ? ` • ${(capa.metadata as any).archivo_original}` : ''}
          </p>
          {!activas[capa.id] && <p className="mt-0.5 text-[10px] text-secondary-400">Toca el switch para activar</p>}
        </button>

        <button
          onClick={() => setCapaEditar(capa)}
          title="Editar capa"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
        >
          <Icon name="seguridad" size={14} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setCapaSubir(capaTerritorioDefault || 'custom')}
          className="flex items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-medium text-primary-600 transition hover:bg-primary-50"
          title="Subir otra capa"
        >
          <Icon name="apoyos" size={12} /> Subir
        </button>
        <button
          onClick={() => setCapaEditar(capa)}
          className="flex items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-medium text-secondary-600 transition hover:bg-secondary-100"
          title="Editar capa"
        >
          <Icon name="seguridad" size={12} /> Editar
        </button>
        <button
          onClick={() => {
            if (!activas[capa.id]) {
              setActivas(prev => ({ ...prev, [capa.id]: true }));
            }
            setCapaEditarEstilos(capa);
          }}
          className="flex items-center justify-center gap-1 rounded-md bg-amber-50 py-1.5 text-[10px] font-semibold text-amber-700 transition hover:bg-amber-100"
          title="Buscar polígonos de esta capa"
        >
          <Icon name="buscar" size={12} /> Buscar
        </button>
      </div>
    </div>
  );

  const renderCapaItem = (capa: (typeof CAPAS_CONFIG)[number]) => {
    const activa = !!activas[capa.id];
    const expandida = !!capasExpandidas[capa.id];
    const cantidad = data[capa.id]?.features?.length ?? 0;

    const herramientas: { id: string; label: string; icono: string; accion: () => void; primario?: boolean }[] = [];

    if (capa.id === 'votantes') {
      herramientas.push(
        { id: 'lista', label: 'Ver lista', icono: 'seguridad', accion: () => router.push('/dashboard/votantes') },
      );
    } else if (capa.id === 'recorridos') {
      herramientas.push(
        { id: 'subir', label: 'Subir recorrido', icono: 'apoyos', accion: () => setCapaSubir(capa.id) },
      );
    } else if (capa.id === 'apoyos') {
      herramientas.push(
        { id: 'nuevo', label: 'Registrar apoyo', icono: 'apoyos', accion: () => abrirModal('apoyo'), primario: true },
      );
    } else if (capa.id === 'peticiones') {
      herramientas.push(
        { id: 'lista', label: 'Ver peticiones', icono: 'crm', accion: () => router.push('/dashboard/peticiones'), primario: true },
      );
    } else if (capa.id === 'eventos') {
      herramientas.push(
        { id: 'nuevo', label: 'Nuevo evento', icono: 'eventos', accion: () => abrirModal('evento'), primario: true },
        { id: 'lista', label: 'Ver eventos', icono: 'seguridad', accion: () => router.push('/dashboard/eventos') },
      );
    } else if (capa.id === 'lideres') {
      herramientas.push(
        { id: 'nuevo', label: 'Agregar líder', icono: 'lideres', accion: () => abrirModal('lider'), primario: true },
        { id: 'lista', label: 'Ver líderes', icono: 'seguridad', accion: () => router.push('/dashboard/lideres') },
      );
    } else if (capa.id === 'custom') {
      herramientas.push(
        { id: 'subir', label: 'Subir capa', icono: 'apoyos', accion: () => setCapaSubir(capa.id), primario: true },
      );
    }

    return (
      <div
        key={capa.id}
        className={`overflow-hidden rounded-xl border transition-all ${
          activa ? 'border-primary-200 bg-primary-50/60' : 'border-secondary-100 bg-white opacity-80'
        }`}
      >
        <div className="flex w-full items-start gap-3 p-3">
          {/* Toggle individual estilo switch */}
          <button
            onClick={() => toggleCapa(capa.id)}
            title={activa ? 'Desactivar capa' : 'Activar capa'}
            className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            style={{ backgroundColor: activa ? capa.color : '#D1D5DB' }}
            aria-checked={activa}
            role="switch"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${activa ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>

          <button
            onClick={() => toggleExpandir(capa.id)}
            className="min-w-0 flex-1 text-left"
          >
            <p className={`text-sm font-semibold ${activa ? 'text-secondary-900' : 'text-secondary-600'}`}>
              {capa.nombre}
              {!capa.funcional && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">Próx.</span>}
            </p>
            <p className="text-xs leading-snug text-secondary-500">{capa.descripcion}</p>
            {cantidad >= 0 && (
              <p className="mt-0.5 text-[10px] font-medium text-secondary-400">
                {activa ? `${cantidad} pines visibles` : `${cantidad} pines ocultos — toca el switch para activar`}
              </p>
            )}
          </button>

          <button
            onClick={() => toggleExpandir(capa.id)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-400 transition hover:bg-secondary-100"
          >
            <Icon name="seguridad" size={16} className={`transition-transform ${expandida ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {expandida && (
          <div className="border-t border-secondary-100 bg-secondary-50/40 p-3 pt-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {herramientas.map((h) => (
                <button
                  key={h.id}
                  onClick={h.accion}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                    h.primario
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-white text-secondary-600 hover:bg-secondary-100 border border-secondary-200'
                  }`}
                >
                  <Icon name={h.icono as any} size={12} /> {h.label}
                </button>
              ))}
            </div>

            {capa.id === 'lideres' && renderPanelLideres()}
            {capa.id === 'apoyos' && renderFiltrosApoyos()}
          </div>
        )}
      </div>
    );
  };

  const renderFiltrosApoyos = () => {
    const features = data.apoyos?.features || [];
    if (features.length === 0) {
      return (
        <p className="pt-2 text-xs text-secondary-500">
          Aún no hay apoyos registrados con ubicación. Registra uno desde "Registrar apoyo" o haz clic en el mapa.
        </p>
      );
    }

    const conteoPorTipo: Record<string, number> = {};
    features.forEach((f: any) => {
      const t = f.properties?.tipo_apoyo || 'otro';
      conteoPorTipo[t] = (conteoPorTipo[t] || 0) + 1;
    });

    const tipos = Object.keys(filtrosApoyos).length > 0
      ? Object.keys(filtrosApoyos).sort()
      : Object.keys(conteoPorTipo).sort();

    const toggleTipo = (tipo: string) => {
      setFiltrosApoyos(prev => ({ ...prev, [tipo]: !prev[tipo] }));
    };

    const colorPorTipo: Record<string, string> = {
      despensa: '#F59E0B',
      medicamento: '#3B82F6',
      lamina: '#6B7280',
      otro: '#22C55E',
    };

    return (
      <div className="space-y-2 pt-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">Clasificación de apoyos</p>
        <div className="space-y-1.5">
          {tipos.map((tipo) => {
            const activo = filtrosApoyos[tipo] !== false;
            const cantidad = conteoPorTipo[tipo] || 0;
            return (
              <button
                key={tipo}
                onClick={() => toggleTipo(tipo)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition ${
                  activo ? 'bg-white' : 'bg-secondary-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorPorTipo[tipo] || '#9CA3AF' }}
                  />
                  <span className={`text-xs font-medium capitalize ${activo ? 'text-secondary-900' : 'text-secondary-400 line-through'}`}>
                    {tipo}
                  </span>
                  <span className="rounded-full bg-secondary-100 px-1.5 py-0.5 text-[10px] text-secondary-600">
                    {cantidad}
                  </span>
                </div>
                <div className={`rounded-md p-1 transition ${activo ? 'text-primary-600' : 'text-secondary-400'}`}>
                  <Icon name={activo ? 'ver' : 'ocultar'} size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const limpiarFiltrosLideres = useCallback(() => {
    setSoloLideresPadre(false);
    setScoreMin('');
    setZonaFiltro('');
    setConSinCoordenadas('todos');
    setTopN('');
    setModoLideres('pines');
  }, []);

  const renderFiltrosLideres = () => (
    <div className="space-y-2.5 rounded-lg bg-secondary-50/70 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">Filtros</p>
        <button
          onClick={limpiarFiltrosLideres}
          className="text-[10px] font-medium text-primary-600 transition hover:text-primary-700"
        >
          Limpiar
        </button>
      </div>

      <label className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-medium text-secondary-700 shadow-sm">
        <span>Solo líderes padre</span>
        <input
          type="checkbox"
          checked={soloLideresPadre}
          onChange={(e) => setSoloLideresPadre(e.target.checked)}
          className="h-4 w-4 accent-primary-600"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-secondary-500">Score mín.</label>
          <input
            type="number"
            min={0}
            max={100}
            value={scoreMin}
            onChange={(e) =>
              setScoreMin(
                e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value)))
              )
            }
            className="w-full rounded-md border border-secondary-200 px-2 py-1.5 text-xs outline-none focus:border-primary-400"
            placeholder="0-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase text-secondary-500">Top N</label>
          <input
            type="number"
            min={1}
            value={topN}
            onChange={(e) =>
              setTopN(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
            }
            className="w-full rounded-md border border-secondary-200 px-2 py-1.5 text-xs outline-none focus:border-primary-400"
            placeholder="Todos"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase text-secondary-500">Zona asignada</label>
        <select
          value={zonaFiltro}
          onChange={(e) => setZonaFiltro(e.target.value)}
          className="w-full rounded-md border border-secondary-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-primary-400"
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase text-secondary-500">Ubicación</label>
        <div className="flex items-center gap-1 rounded-lg bg-white p-1 shadow-sm">
          {(['todos', 'con', 'sin'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setConSinCoordenadas(opt)}
              className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                conSinCoordenadas === opt
                  ? 'bg-primary-100 text-primary-700 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {opt === 'todos' ? 'Todos' : opt === 'con' ? 'Con ubicación' : 'Sin ubicación'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase text-secondary-500">Modo visual</label>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { key: 'pines', label: 'Pines', icon: 'lideres' },
            { key: 'circulos', label: 'Círculos', icon: 'mapa' },
            { key: 'heatmap', label: 'Heatmap', icon: 'votantes' },
            { key: 'solo_puntos', label: 'Sin círculos', icon: 'seguridad' },
          ] as { key: typeof modoLideres; label: string; icon: string }[]).map((m) => (
            <button
              key={m.key}
              onClick={() => setModoLideres(m.key)}
              className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${
                modoLideres === m.key
                  ? 'bg-primary-100 text-primary-700 shadow-sm'
                  : 'bg-white text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              <Icon name={m.icon as any} size={12} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between rounded-lg bg-primary-50 px-3 py-2">
          <span className="text-xs font-semibold text-primary-800">Líderes visibles</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-primary-700">
            {lideresFiltrados.length}
          </span>
        </div>
        {lideresSinUbicacion.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
            <span className="text-xs font-semibold text-amber-800">Sin ubicación en mapa</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {lideresSinUbicacion.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const renderFichasLideres = () => {
    if (lideresConUbicacion.length === 0) {
      return conSinCoordenadas === 'sin' ? null : (
        <p className="pt-2 text-xs text-secondary-500">
          Ningún líder visible tiene ubicación en el mapa.
        </p>
      );
    }

    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-secondary-400">Fichas de líderes</p>
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
            {lideresConUbicacion.length}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-secondary-50 p-1">
          {([
            { key: 'seccion', label: 'Sección' },
            { key: 'colonia', label: 'Colonia' },
            { key: 'score', label: 'Score' },
          ] as { key: typeof grupoLideresPor; label: string }[]).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setGrupoLideresPor(opt.key)}
              className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                grupoLideresPor === opt.key
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {lideresAgrupados.map(([clave, grupo]) => (
            <div key={clave} className="space-y-1.5">
              <button
                onClick={() => {
                  const primero = grupo[0];
                  if (primero?.votante?.coordenadas) verLiderEnMapa(primero);
                }}
                className="flex w-full items-center justify-between rounded-md bg-primary-50 px-2 py-1 text-left transition hover:bg-primary-100"
              >
                <span className="text-xs font-semibold text-primary-800">{clave}</span>
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-primary-700">
                  {grupo.length} líder{grupo.length > 1 ? 'es' : ''}
                </span>
              </button>

              <div className="space-y-1.5 pl-1">
                {grupo.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => verLiderEnMapa(l)}
                    className="flex w-full items-start gap-2.5 rounded-lg border border-secondary-100 bg-white p-2 text-left transition-all hover:border-primary-300 hover:bg-primary-50 hover:shadow-sm"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                      <Icon name="lideres" size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-secondary-900">{l.votante?.nombre || 'Líder'}</p>
                      <p className="truncate text-[11px] text-secondary-500">
                        {l.votante?.colonia ? `${l.votante.colonia} • ` : ''}
                        {l.votante?.seccion_electoral ? `Sección ${l.votante.seccion_electoral}` : 'Sin sección'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-secondary-600">
                        <span className="rounded bg-primary-50 px-1 py-0.5 font-medium text-primary-700">{l.score ?? 0} pts</span>
                        <span className="rounded bg-secondary-100 px-1 py-0.5">{l.alcance_estimado || 0} alc.</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPanelLideres = () => (
    <div className="space-y-3 pt-2">
      {renderFiltrosLideres()}
      {renderFichasLideres()}
    </div>
  );

  const renderGrupoColapsable = (
    id: string,
    titulo: string,
    badge: React.ReactNode,
    children: ReactNode,
    defaultOpen = true
  ) => {
    const expandido = gruposExpandidos[id] ?? defaultOpen;
    return (
      <div className="rounded-xl border border-secondary-100 bg-white overflow-hidden">
        <button
          onClick={() => toggleGrupo(id)}
          className="flex w-full items-center justify-between gap-2 bg-secondary-50/70 px-3 py-2.5 text-left transition hover:bg-secondary-100"
        >
          <div className="flex items-center gap-2">
            <Icon
              name="seguridad"
              size={14}
              className={`text-secondary-500 transition-transform ${expandido ? 'rotate-90' : ''}`}
            />
            <p className="text-xs font-bold uppercase tracking-wider text-secondary-700">{titulo}</p>
          </div>
          {badge}
        </button>
        {expandido && <div className="space-y-2 p-2.5">{children}</div>}
      </div>
    );
  };

  const capasConDatos = useMemo(() => [
    ...CAPAS_CONFIG.filter(c => activas[c.id] && (data[c.id]?.features?.length || 0) > 0),
    ...capasPersonalizadas.filter(c => activas[c.id] && (data[c.id]?.features?.length || 0) > 0),
  ], [activas, capasPersonalizadas, data]);

  const resumenTerritorial = useMemo(() => {
    const votantes = data.votantes?.features?.length || 0;
    const apoyos = data.apoyos?.features?.length || 0;
    const peticiones = data.peticiones?.features?.length || 0;
    const eventos = data.eventos?.features?.length || 0;
    const lideresTotal = lideresFiltrados.length;
    const secciones = data.secciones?.features?.length || 0;
    const casillas = data.casillas?.features?.length || 0;

    // Territorio propio / en riesgo: se infiere de propiedades del feature cuando existan.
    // Fallback: si no hay clasificación, se cuentan las capas personalizadas según su contexto.
    let territorioPropio = 0;
    let territorioRiesgo = 0;

    const featuresTerritorio = [
      ...(data.secciones?.features || []),
      ...(data.municipios?.features || []),
      ...capasPersonalizadas.filter(c => activas[c.id]).flatMap(c => data[c.id]?.features || []),
    ];

    featuresTerritorio.forEach((f: any) => {
      const p = f?.properties || {};
      const status = String(p.status || p.estado || p.estatus || p.clasificacion || p.tipo_territorio || '').toLowerCase();
      const color = String(p.color || p._feature_color || '').toLowerCase();
      const esPropio = status.includes('propio') || status.includes('ganado') || status.includes('favorable') || status.includes('seguro') || status.includes('aliado') || color.includes('green') || color.includes('verde') || color.includes('22c55e') || color.includes('3b82f6');
      const esRiesgo = status.includes('riesgo') || status.includes('enemigo') || status.includes('adverso') || status.includes('perdido') || status.includes('rival') || color.includes('red') || color.includes('rojo') || color.includes('ef4444') || color.includes('d73216');
      if (esPropio) territorioPropio += 1;
      else if (esRiesgo) territorioRiesgo += 1;
    });

    const totalItems = votantes + apoyos + peticiones + eventos + lideresTotal + secciones + casillas;
    return [
      { id: 'votantes', label: 'Votantes', value: votantes, color: '#EF4444' },
      { id: 'apoyos', label: 'Apoyos', value: apoyos, color: '#F59E0B' },
      { id: 'peticiones', label: 'Peticiones', value: peticiones, color: '#06B6D4' },
      { id: 'eventos', label: 'Eventos', value: eventos, color: '#D73216' },
      { id: 'lideres', label: 'Líderes', value: lideresTotal, color: '#383745' },
      { id: 'secciones', label: 'Secciones', value: secciones, color: '#8B5CF6' },
      { id: 'casillas', label: 'Casillas', value: casillas, color: '#6366F1' },
      { id: 'territorio_riesgo', label: 'Territorio en riesgo', value: territorioRiesgo, color: '#DC2626' },
      { id: 'territorio_propio', label: 'Territorio propio', value: territorioPropio, color: '#16A34A' },
    ].filter(i => i.value > 0 || totalItems === 0);
  }, [data, lideresFiltrados, capasPersonalizadas, activas]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Mapa full-bleed */}
      <section className="absolute inset-0 z-0">
        <MapaLeaflet
          ref={mapRef}
          data={data}
          activas={activas}
          onRecargar={() => cargarDatos()}
          personalizadas={capasPersonalizadas}
          lideres={lideresFiltrados}
          modoLideres={modoLideres}
          filtrosApoyos={filtrosApoyos}
          puntoSeleccionado={puntoInicial}
          onSeleccionarCoordenada={(lat, lng) => setPuntoInicial({ lat, lng })}
          onAccionPunto={(tipo, lat, lng) => {
            setPuntoInicial({ lat, lng });
            abrirModal(tipo, { lat, lng });
          }}
          onCerrarPunto={() => setPuntoInicial(null)}
          seleccion={seleccion}
          onFeatureClick={handleFeatureClick}
          resultadoDestacado={resultadoDestacado}
          onBoundsChange={handleBoundsChange}
        />
      </section>

      {/* Barra de herramientas flotante: buscador, resumen, panel */}
      {!modoLimpio && (
        <div className="pointer-events-auto absolute bottom-6 left-1/2 z-[550] flex -translate-x-1/2 items-center gap-2 rounded-full border border-secondary-200 bg-white p-1.5 shadow-xl">
          <button
            onClick={() => setMostrarBuscador(v => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${mostrarBuscador ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}`}
            title="Buscar"
          >
            <Icon name="buscar" size={18} />
          </button>
          <button
            onClick={() => setMostrarResumen(v => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${mostrarResumen ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}`}
            title="Resumen territorial"
          >
            <Icon name="dashboard" size={18} />
          </button>
          <button
            onClick={() => setMostrarLeyenda(v => !v)}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${mostrarLeyenda ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-100'}`}
            title="Leyenda"
          >
            <Icon name="ver" size={18} />
          </button>
          <button
            onClick={() => abrirPanel('explorar')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white shadow transition hover:bg-primary-700"
            title="Explorar elementos"
          >
            <Icon name="mapa" size={18} />
          </button>
          <button
            onClick={() => abrirPanel('capas')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-800 text-white shadow transition hover:bg-secondary-900"
            title="Capas"
          >
            <Icon name="seguridad" size={18} />
          </button>
        </div>
      )}

      {/* Buscador arriba a la derecha, compacto */}
      {!modoLimpio && mostrarBuscador && (
        <div className="pointer-events-auto absolute right-4 top-4 z-[500] w-full max-w-sm">
          <div className="rounded-xl border border-secondary-200 bg-white p-3 shadow-lg">
            <BuscadorGlobal onSeleccionar={seleccionarResultado} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {capasConDatos.map(c => (
                <button
                  key={c.id}
                  onClick={() => abrirExplorador(c.id)}
                  className="inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm transition hover:scale-105"
                  style={{ backgroundColor: c.color }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                  <span className="truncate">{data[c.id]?.features?.length || 0} {c.nombre}</span>
                </button>
              ))}
              {capasConDatos.length === 0 && (
                <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] text-secondary-500">Ninguna capa activa con datos</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Numeralia colapsable arriba a la izquierda, compacta */}
      {!modoLimpio && mostrarResumen && resumenTerritorial.length > 0 && (
        <div
          ref={resumenRef}
          className="pointer-events-auto absolute left-4 top-4 z-[500] flex w-full max-w-[18rem] flex-col gap-2"
          style={resumenPos ? { left: resumenPos.x, top: resumenPos.y } : undefined}
        >
          <div className="rounded-xl border border-secondary-200 bg-white p-3 shadow-lg">
            <div
              className="mb-2 flex cursor-grab select-none items-center justify-between active:cursor-grabbing"
              onMouseDown={handleResumenMouseDown}
              onTouchStart={handleResumenTouchStart}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-700">Resumen</span>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => setMostrarResumen(false)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {resumenTerritorial.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (activas[item.id]) {
                      abrirExplorador(item.id);
                    } else if (CAPAS_CONFIG.some(c => c.id === item.id) || capasPersonalizadas.some(c => c.id === item.id)) {
                      setActivas(prev => ({ ...prev, [item.id]: true }));
                    }
                  }}
                  className="flex flex-col items-start rounded-md border border-secondary-100 bg-secondary-50/50 px-2 py-1 text-left transition hover:border-primary-200 hover:bg-primary-50"
                >
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-secondary-500">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-bold text-secondary-900">{item.value.toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leyenda colapsable arriba a la izquierda debajo del resumen */}
      {!modoLimpio && mostrarLeyenda && (
        <div className="pointer-events-auto absolute left-4 top-[7.5rem] z-[490] flex w-full max-w-[14rem] flex-col gap-2">
          <div className="rounded-xl border border-secondary-200 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-700">Leyenda</span>
              <button onClick={() => setMostrarLeyenda(false)} className="text-secondary-400 hover:text-secondary-600">✕</button>
            </div>
            <LeyendaMapa activas={activas} data={data} personalizadas={capasPersonalizadas} />
          </div>
        </div>
      )}

      {/* Panel lateral/bottom sheet */}
      <PanelFlotante
        abierto={panelAbierto}
        onCerrar={cerrarPanel}
        titulo={panelVista === 'explorar' ? 'Explorar elementos' : 'Herramientas del mapa'}
        icono={panelVista === 'explorar' ? 'buscar' : 'mapa'}
      >
        {panelVista === 'explorar' ? (
          <ExploradorCapa
            capaId={exploradorCapaId || undefined}
            capaNombre={exploradorCapaId ? (capasPersonalizadas.find(c => c.id === exploradorCapaId)?.nombre || CAPAS_CONFIG.find(c => c.id === exploradorCapaId)?.nombre) : undefined}
            color={exploradorCapaId ? (capasPersonalizadas.find(c => c.id === exploradorCapaId)?.color || CAPAS_CONFIG.find(c => c.id === exploradorCapaId)?.color) : undefined}
            capas={[
              ...CAPAS_CONFIG.filter(c => activas[c.id] && (data[c.id]?.features?.length || 0) > 0).map(c => ({ capa: { id: c.id, nombre: c.nombre, color: c.color, tipo: 'custom', origen: 'propia', visible: true, orden: 0 } as CapaMapa, data: data[c.id] })),
              ...capasPersonalizadas.filter(c => activas[c.id] && (data[c.id]?.features?.length || 0) > 0).map(c => ({ capa: c, data: data[c.id] })),
            ]}
            onSeleccionar={seleccionarElemento}
            onCerrar={cerrarPanel}
          />
        ) : (
          <div className="space-y-4">
            {/* Encabezado + acciones globales */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-secondary-900">Herramientas del mapa</h2>
                <p className="text-xs text-secondary-500">Activa las capas que quieres ver</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={activarTodas} title="Ver todas" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary-600 transition hover:bg-primary-50 hover:text-primary-700"><Icon name="ver" size={14} /> Ver todo</button>
                <button onClick={desactivarTodas} title="Ocultar todas" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary-600 transition hover:bg-primary-50 hover:text-primary-700"><Icon name="ocultar" size={14} /> Limpiar</button>
                <button onClick={prefs.reset} title="Restablecer" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary-600 transition hover:bg-primary-50 hover:text-primary-700"><Icon name="seguridad" size={14} /></button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 rounded-lg bg-secondary-50 p-1">
              <button
                onClick={() => setPanelVista('capas')}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${panelVista === 'capas' ? 'bg-white text-primary-700 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
              >Capas</button>
              <button
                onClick={() => abrirExplorador(null)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${panelVista !== 'capas' ? 'bg-white text-primary-700 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'}`}
              >Explorar</button>
            </div>

            {/* Botón explorar por capa activa */}
            <div className="flex flex-wrap gap-2">
              {[
                ...CAPAS_CONFIG.filter(c => activas[c.id] && (data[c.id]?.features?.length || 0) > 0),
                ...capasPersonalizadas.filter(c => activas[c.id] && (data[c.id]?.features?.length || 0) > 0),
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => abrirExplorador(c.id)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
                  style={{ backgroundColor: c.color }}
                >
                  <Icon name="buscar" size={10} /> {c.nombre} ({data[c.id]?.features?.length || 0})
                </button>
              ))}
            </div>

            {/* Subir capa / KML */}
            <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600"><Icon name="apoyos" size={20} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-secondary-900">Subir KML / capa GIS</p>
                  <p className="text-xs text-secondary-600">Importa KML, GeoJSON o Shapefiles.</p>
                </div>
              </div>
              <button onClick={() => setCapaSubir('custom')} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"><Icon name="apoyos" size={16} /> {capasPersonalizadas.length > 0 ? 'Subir más capas' : 'Subir mi primera capa'}</button>
            </div>

            {capasPersonalizadas.length > 0 && renderGrupoColapsable('subidas', 'Capas subidas', <span className="rounded bg-secondary-100 px-1.5 py-0.5 text-[10px] font-bold text-secondary-600">{capasPersonalizadas.length}</span>, (
              <div className="space-y-2">
                {Object.entries(capasPorGrupo.grupos).map(([grupoNombre, capas]) => {
                  const grupoId = `subidas-${grupoNombre}`;
                  const expandido = gruposExpandidos[grupoId] ?? true;
                  return (
                    <div key={grupoNombre} className="rounded-lg border border-primary-100 bg-primary-50/50 overflow-hidden">
                      <button
                        onClick={() => toggleGrupo(grupoId)}
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left transition hover:bg-primary-100"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon
                            name="seguridad"
                            size={12}
                            className={`text-primary-600 transition-transform ${expandido ? 'rotate-90' : ''}`}
                          />
                          <p className="text-xs font-semibold text-primary-800">{grupoNombre}</p>
                        </div>
                        <span className="text-[10px] text-secondary-500">{capas.length} capa{capas.length > 1 ? 's' : ''}</span>
                      </button>
                      {expandido && <div className="space-y-2 p-2">{capas.map(c => renderCapaButton(c))}</div>}
                    </div>
                  );
                })}

                {capasPorGrupo.sinGrupo.length > 0 && (
                  <div className="space-y-2">
                    <p className="px-1 text-xs font-semibold text-secondary-600">Sin grupo</p>
                    {capasPorGrupo.sinGrupo.map(c => renderCapaButton(c))}
                  </div>
                )}
              </div>
            ), true)}

            {renderGrupoColapsable(
              'campania',
              'Campaña',
              <span className="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-700">{CAPAS_CONFIG.filter(c => activas[c.id]).length}/{CAPAS_CONFIG.length}</span>,
              CAPAS_CONFIG.map(capa => renderCapaItem(capa)),
              true
            )}

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <p className="font-semibold">{modoDemo ? 'Modo demo activado' : 'Error del servidor'}</p>
                <p>{error}</p>
                {!modoDemo && <button onClick={() => cargarDatos(true)} className="mt-2 text-xs font-semibold underline hover:no-underline">Usar modo demo</button>}
              </div>
            )}
          </div>
        )}
      </PanelFlotante>

      {/* Ficha del feature seleccionado */}
      {featureSeleccionado && (
        <FichaFeature
          elemento={featureSeleccionado}
          onCerrar={() => setFeatureSeleccionado(null)}
          onVerDetalle={(el) => {
            // Si es capa personalizada, abrir editor de estilos
            const esPersonalizada = capasPersonalizadas.some(c => c.id === el.capaId);
            if (esPersonalizada) {
              const capa = capasPersonalizadas.find(c => c.id === el.capaId);
              if (capa) {
                const p = el.feature?.properties || {};
                const id = String(p._feature_id || p.id || p.ID || p.OBJECTID || p.objectid || p.FID || p.fid || p.gid || p.GID);
                setFeatureEditando({ capaId: el.capaId, featureId: id, nombre: el.nombre, color: p._feature_color || p.color || capa.color || '#3B82F6', props: p });
              }
            }
          }}
        />
      )}

      {/* Fichas existentes */}
      {detalle && <FichaTerritorial detalle={detalle} onCerrar={cerrarFicha} />}
      {featureSindicalSeleccionado && <PanelSindicalFeature feature={featureSindicalSeleccionado} onCerrar={cerrarFeatureSindical} />}
      {featureEditando && (
          <div className="fixed inset-x-0 bottom-4 z-[660] mx-auto max-w-sm rounded-xl border border-secondary-200 bg-white p-4 shadow-xl lg:left-auto lg:right-4 lg:top-20 lg:max-w-xs">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-secondary-900">Editar polígono</h3>
              <button
                onClick={cerrarFeatureEditando}
                className="text-secondary-400 hover:text-secondary-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-secondary-500">Nombre</label>
                <input
                  type="text"
                  value={featureEditando.nombre}
                  onChange={(e) => setFeatureEditando(prev => prev ? { ...prev, nombre: e.target.value } : null)}
                  className="input w-full text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[10px] font-semibold uppercase text-secondary-500">Color</label>
                <input
                  type="color"
                  value={featureEditando.color}
                  onChange={(e) => setFeatureEditando(prev => prev ? { ...prev, color: e.target.value } : null)}
                  className="h-8 w-16 cursor-pointer rounded border border-secondary-200"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={cerrarFeatureEditando}
                  className="btn-secondary flex-1 py-1.5 text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarFeature}
                  disabled={guardandoFeature}
                  className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-60"
                >
                  {guardandoFeature ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      {cargandoDetalle && !detalle && (
        <div className="pointer-events-none absolute bottom-4 right-4 top-20 z-[500] flex w-[92vw] max-w-md items-center justify-center rounded-xl border border-secondary-200 bg-white/95 shadow-xl">
          <div className="flex items-center gap-2 text-sm text-secondary-600"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" /> Cargando detalle territorial...</div>
        </div>
      )}

      {/* Indicador sutil de carga */}
      {(loadingInicial || loading || loadingGeo) && idsActivos().length > 0 && (
        <div className="pointer-events-none absolute right-4 top-16 z-[550] flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-secondary-600 shadow-sm backdrop-blur">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          {loadingGeo ? 'Actualizando capas...' : 'Cargando capas...'}
        </div>
      )}

      {/* Modales (se mantienen fuera del flujo) */}
      <SubirCapaModal
        abierto={!!capaSubir}
        onCerrar={() => setCapaSubir(null)}
        onExito={(ids) => {
          if (ids?.length) {
            setActivas(prev => {
              const next = { ...prev };
              ids.forEach(id => { next[id] = true; });
              return next;
            });
            // Mostrar el grupo de capas subidas para que el usuario vea las nuevas
            setGruposExpandidos(prev => ({ ...prev, subidas: true }));
          }
          cargarDatos();
        }}
        secciones={secciones}
        capaTerritorioDefault={capaSubir || undefined}
      />

      <ImportarSeccionesIneModal
        abierto={modalIneSecciones}
        onCerrar={() => setModalIneSecciones(false)}
        onExito={() => {
          setModalIneSecciones(false);
          cargarDatos();
        }}
      />

      <ImportarSeccionesExcelModal
        abierto={modalExcel}
        onCerrar={() => setModalExcel(false)}
        onExito={() => {
          cargarDatos();
        }}
      />

      {capaEditar && (
        <EditarCapaModal
          capa={capaEditar}
          abierto={!!capaEditar}
          onCerrar={() => setCapaEditar(null)}
          onExito={() => {
            setCapaEditar(null);
            cargarDatos();
          }}
        />
      )}

      {capaEditarEstilos && (
        <EditarEstilosCapaModal
          capa={capaEditarEstilos}
          geojson={data[capaEditarEstilos.id]}
          abierto={!!capaEditarEstilos}
          onCerrar={() => setCapaEditarEstilos(null)}
          onExito={() => {
            setCapaEditarEstilos(null);
            cargarDatos();
          }}
          onResaltarFeature={async (capaId, featureId) => {
            setActivas(prev => ({ ...prev, [capaId]: true }));
            await asegurarCapaCargada(capaId, featureId);
            const f = data[capaId]?.features?.find((x: any) => {
              const p = x.properties || {};
              const fid = String(p._feature_id || p.id || p.ID || p.OBJECTID || p.objectid || p.FID || p.fid || p.gid || p.GID);
              return fid === featureId;
            });
            window.dispatchEvent(new CustomEvent('mapa:resaltar', { detail: { capaId, featureId, geometry: f?.geometry } }));
          }}
        />
      )}

      <NuevoLiderModal
        abierto={modalActivo === 'lider'}
        onCerrar={cerrarModal}
        onExito={(id, lat, lng) => onExitoGuardado('lider', id, lat, lng)}
        coordenadasIniciales={puntoInicial}
      />

      <NuevoEventoModal
        abierto={modalActivo === 'evento'}
        onCerrar={cerrarModal}
        onExito={(id, lat, lng) => onExitoGuardado('evento', id, lat, lng)}
        coordenadasIniciales={puntoInicial}
      />

      <NuevoApoyoModal
        abierto={modalActivo === 'apoyo'}
        onCerrar={cerrarModal}
        onExito={(id, lat, lng) => onExitoGuardado('apoyo', id, lat, lng)}
        coordenadasIniciales={puntoInicial}
      />
    </div>
  );
}

function generarDemoData(): MapaData {
  const centro: [number, number] = [21.125, -101.6858];
  const size = 0.025;
  const features: any[] = [];

  for (let row = -3; row <= 3; row++) {
    for (let col = -3; col <= 3; col++) {
      const lat = centro[0] + row * size;
      const lng = centro[1] + col * size;
      const seccion = `${String(Math.abs(row) + 1).padStart(2, '0')}${String(Math.abs(col) + 1).padStart(2, '0')}`;
      const colorAleatorio = Math.random();
      const color = colorAleatorio > 0.6 ? '#22C55E' : colorAleatorio > 0.3 ? '#FACC15' : '#EF4444';
      const faltan = Math.floor(Math.random() * 300);

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng, lat],
              [lng + size, lat],
              [lng + size, lat + size],
              [lng, lat + size],
              [lng, lat],
            ],
          ],
        },
        properties: {
          id: seccion,
          seccion,
          nombre: `Sección ${seccion}`,
          color,
          faltan_para_ganar: faltan,
          votantes: Math.floor(Math.random() * 500),
          lista_nominal_2024: 800 + Math.floor(Math.random() * 400),
        },
      });
    }
  }

  const votantes: any[] = [];
  for (let i = 0; i < 200; i++) {
    votantes.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [
          centro[1] + (Math.random() - 0.5) * 0.25,
          centro[0] + (Math.random() - 0.5) * 0.2,
        ],
      },
      properties: { id: i, nombre: `Simpatizante ${i}`, nivel_apoyo: 1 + Math.floor(Math.random() * 5) },
    });
  }

  const recorridos: any[] = [];
  for (let i = 0; i < 8; i++) {
    const puntos: number[][] = [];
    let lat = centro[0] + (Math.random() - 0.5) * 0.15;
    let lng = centro[1] + (Math.random() - 0.5) * 0.15;
    for (let j = 0; j < 15; j++) {
      lat += (Math.random() - 0.5) * 0.01;
      lng += (Math.random() - 0.5) * 0.01;
      puntos.push([lng, lat]);
    }
    recorridos.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: puntos },
      properties: { id: i, usuario_nombre: `Brigadista ${i + 1}`, fecha: new Date().toISOString() },
    });
  }

  const apoyos: any[] = [];
  for (let i = 0; i < 30; i++) {
    apoyos.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [centro[1] + (Math.random() - 0.5) * 0.2, centro[0] + (Math.random() - 0.5) * 0.18],
      },
      properties: {
        id: i,
        tipo_apoyo: ['despensa', 'lámina', 'medicamento'][Math.floor(Math.random() * 3)],
        fecha_entrega: new Date().toISOString(),
        entregado_por: `Brigadista ${1 + Math.floor(Math.random() * 5)}`,
        foto_url: null,
        observaciones: 'Entrega registrada con foto y ubicación',
        votante_nombre: `Beneficiario ${i}`,
      },
    });
  }

  const eventos: any[] = [];
  const nombres = ['Mitin Centro', 'Reunión con lideresas', 'Caminata colonia Jardines', 'Foro juvenil', 'Desayuno con vecinos'];
  nombres.forEach((nombre, i) => {
    eventos.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [centro[1] + (Math.random() - 0.5) * 0.18, centro[0] + (Math.random() - 0.5) * 0.15],
      },
      properties: {
        id: i,
        nombre,
        direccion: 'Dirección demo',
        fecha_inicio: new Date(Date.now() + i * 86400000).toISOString(),
        status: 'programado',
      },
    });
  });

  const lideres: any[] = [];
  for (let i = 0; i < 15; i++) {
    lideres.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [centro[1] + (Math.random() - 0.5) * 0.22, centro[0] + (Math.random() - 0.5) * 0.2],
      },
      properties: {
        id: i,
        nombre: `Líder ${i + 1}`,
        score: Math.floor(Math.random() * 100),
        alcance_estimado: 20 + Math.floor(Math.random() * 80),
      },
    });
  }

  const peticiones: any[] = [];
  const categoriasDemo = ['bache', 'alumbrado', 'agua', 'seguridad', 'limpia'];
  const prioridadesDemo = ['baja', 'media', 'alta', 'critica'];
  for (let i = 0; i < 12; i++) {
    peticiones.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [centro[1] + (Math.random() - 0.5) * 0.2, centro[0] + (Math.random() - 0.5) * 0.18],
      },
      properties: {
        id: `demo-pet-${i}`,
        categoria: categoriasDemo[i % categoriasDemo.length],
        prioridad: prioridadesDemo[i % prioridadesDemo.length],
        estatus: i < 6 ? 'reportada' : 'en_proceso',
        titulo: `Petición demo ${i + 1}`,
        descripcion: 'Solicitud registrada desde la app de brigada.',
        foto_url: null,
        created_at: new Date().toISOString(),
        votante_nombre: `Vecino ${i + 1}`,
        creador_nombre: 'Brigadista demo',
      },
    });
  }

  return {
    votantes: { type: 'FeatureCollection', features: votantes },
    recorridos: { type: 'FeatureCollection', features: recorridos },
    apoyos: { type: 'FeatureCollection', features: apoyos },
    peticiones: { type: 'FeatureCollection', features: peticiones },
    eventos: { type: 'FeatureCollection', features: eventos },
    lideres: { type: 'FeatureCollection', features: lideres },
  };
}

function PanelSindicalFeature({
  feature,
  onCerrar,
}: {
  feature: { capaId: string; featureId: string; props: Record<string, any> };
  onCerrar: () => void;
}) {
  const props = feature.props || {};
  const nombre = String(props._feature_nombre || props.NOMBRE || props.nombre || props.name || 'Sin nombre');
  const zona = props.zona_sindical ? String(props.zona_sindical) : null;
  const colorZona = props.color_zona ? String(props.color_zona) : null;
  const tipoEntidad = props.tipo_entidad ? String(props.tipo_entidad) : null;
  const dependenciasEje = Array.isArray(props.dependencias_eje) ? props.dependencias_eje : [];
  const dependenciasEspecificas = Array.isArray(props.dependencias_especificas) ? props.dependencias_especificas : [];
  const sede = props.sede_votacion ? String(props.sede_votacion) : null;
  const resultados = props.resultados_historicos || null;
  const esNodo = props.es_nodo === true;

  return (
    <div className="absolute right-4 top-4 z-[650] w-[340px] max-w-[92vw] rounded-xl border border-secondary-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-start justify-between border-b border-secondary-200 pb-2">
        <div>
          <h3 className="text-base font-bold text-secondary-900">{nombre}</h3>
          <p className="text-[10px] uppercase tracking-wide text-secondary-500">
            Sinaloa - Municipios y Nodos Sindicales STASE 2027
            {esNodo && ' • Nodo sindical'}
          </p>
        </div>
        <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600">✕</button>
      </div>

      <div className="space-y-2 text-xs">
        {zona && (
          <div className="flex items-center gap-2">
            {colorZona && (
              <span
                className="inline-block h-3 w-3 rounded-full border border-white shadow"
                style={{ backgroundColor: colorZona }}
              />
            )}
            <span className="font-semibold text-secondary-800">Zona sindical:</span>
            <span>{zona}</span>
          </div>
        )}
        {tipoEntidad && (
          <div>
            <span className="font-semibold text-secondary-800">Tipo:</span> {tipoEntidad}
          </div>
        )}
        {sede && (
          <div>
            <span className="font-semibold text-secondary-800">Sede de votación:</span> {sede}
          </div>
        )}

        <div>
          <span className="font-semibold text-secondary-800">Dependencias eje:</span>
          {dependenciasEje.length > 0 ? (
            <ul className="list-disc pl-4 text-secondary-700">
              {dependenciasEje.map((d: string, i: number) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          ) : (
            <em className="text-secondary-500">Sin datos</em>
          )}
        </div>

        <div>
          <span className="font-semibold text-secondary-800">Dependencias específicas:</span>
          {dependenciasEspecificas.length > 0 ? (
            <ul className="list-disc pl-4 text-secondary-700">
              {dependenciasEspecificas.map((d: string, i: number) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          ) : (
            <em className="text-secondary-500">Sin datos</em>
          )}
        </div>

        {resultados && (
          <div className="rounded border border-secondary-200 bg-secondary-50/60 p-1.5">
            <p className="mb-1 font-semibold text-secondary-800">Resultados históricos STASE</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-secondary-100">
                  <th className="px-2 py-1 text-left">Año</th>
                  <th className="px-2 py-1 text-left">Planilla</th>
                  <th className="px-2 py-1 text-right">Votos gan.</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(resultados).map(([anio, r]: [string, any]) => (
                  <tr key={anio} className="border-b border-secondary-200">
                    <td className="px-2 py-1">{anio}</td>
                    <td className="px-2 py-1 font-semibold">{r?.planilla_ganadora || '-'}</td>
                    <td className="px-2 py-1 text-right">
                      {r?.votos_ganador != null ? Number(r.votos_ganador).toLocaleString() : '-'}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {r?.total != null ? Number(r.total).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
