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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modoDemo, setModoDemo] = useState(false);
  const mapRef = useRef<MapaLeafletRef | null>(null);
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
    setFeatureEditando({
      capaId,
      featureId,
      nombre: props._feature_nombre || featureId,
      color: props._feature_color || capasPersonalizadas.find(c => c.id === capaId)?.color || '#3B82F6',
      props,
    });
  }, [capasPersonalizadas]);

  const cerrarFeatureEditando = useCallback(() => {
    setFeatureEditando(null);
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

  const cargarDatos = useCallback(async (forzarDemo = false) => {
    setLoading(true);
    setError(null);
    try {
      const capasRes = await mapaApi.getCapas();
      const personalizadas = capasRes.data?.personalizadas || [];
      setCapasPersonalizadas(personalizadas);

      const idsPredefinidos = CAPAS_CONFIG.filter(c => activas[c.id]).map(c => c.id as string);
      const idsPersonalizados = personalizadas.filter((c: CapaMapa) => activas[c.id]).map((c: CapaMapa) => c.id);
      const capasActivas = [...idsPredefinidos, ...idsPersonalizados];

      // GeoJSON es crítico; si falla, reportamos el error real y solo usamos demo si se fuerza explícitamente
      let geo: MapaData = {};
      try {
        const geoRes = await mapaApi.getGeoJson(capasActivas, { limit: 5000 });
        geo = geoRes.data as MapaData;
        setData(geo);
      } catch (geoErr: any) {
        console.error('Error cargando geojson:', geoErr);
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
          setLoading(false);
          return;
        }
        const status = geoErr?.response?.status;
        const msg = errorToString(geoErr) || 'Error de red';
        setError(status === 401
          ? 'Tu sesión expiró. Inicia sesión de nuevo para ver los datos reales del mapa.'
          : `No se pudieron cargar las capas del mapa (${status || 'red'}: ${msg}). Presiona el botón de recargar.`);
        setLoading(false);
        return;
      }

      // Estadísticas, líderes y zonas son complementarios; si fallan, seguimos mostrando el mapa real
      const params: any = {};
      if (soloLideresPadre) params.padres = 'true';
      if (scoreMin !== '') params.score_min = scoreMin;
      if (zonaFiltro) params.zona_id = zonaFiltro;
      if (conSinCoordenadas === 'con') params.sin_coordenadas = 'false';
      if (conSinCoordenadas === 'sin') params.sin_coordenadas = 'true';
      if (topN !== '') params.limit = topN;

      const [statsRes, lideresRes, zonasRes] = await Promise.all([
        mapaApi.getEstadisticas('seccion').catch((err: any) => {
          console.warn('Estadísticas no disponibles:', err);
          return { data: { items: [] } };
        }),
        lideresApi.getAll(params).catch((err: any) => {
          console.warn('Líderes no disponibles:', err);
          return { data: [] };
        }),
        zonasApi.getAll().catch((err: any) => {
          console.warn('Zonas no disponibles:', err);
          return { data: [] };
        }),
      ]);

      setStats(statsRes.data?.items || []);
      setLideres(lideresRes.data || []);
      setZonas(zonasRes.data || []);
      setModoDemo(false);

      setSecciones([]);

      // Extraer tipos de apoyo para filtros (mantener preferencias del usuario)
      const tiposApoyo = new Set<string>(['despensa', 'medicamento', 'lamina', 'otro']);
      (geo.apoyos?.features || []).forEach((f: any) => {
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
  }, [
    activas,
    capasPersonalizadas.length,
    soloLideresPadre,
    scoreMin,
    zonaFiltro,
    conSinCoordenadas,
    topN,
  ]);

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
    cargarDatos();
  }, [cargarDatos]);

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

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      <aside className="flex w-full flex-col overflow-hidden rounded-xl bg-white shadow-sm lg:w-96">
        <div className="shrink-0 space-y-2 p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-secondary-900">Herramientas del mapa</h2>
              <p className="text-xs text-secondary-500">Activa las capas que quieres ver</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={activarTodas}
                title="Ver todas las capas"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary-600 transition hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon name="ver" size={14} /> Ver todo
              </button>
              <button
                onClick={desactivarTodas}
                title="Ocultar todas las capas"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary-600 transition hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon name="ocultar" size={14} /> Limpiar
              </button>
              <button
                onClick={prefs.reset}
                title="Restablecer preferencias del mapa"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-secondary-600 transition hover:bg-primary-50 hover:text-primary-700"
              >
                <Icon name="seguridad" size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <BuscadorGlobal onSeleccionar={seleccionarResultado} />
            </div>

            <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 sm:flex">
              {CAPAS_CONFIG.filter(c => activas[c.id]).map(c => {
                const count = data[c.id]?.features?.length || 0;
                return (
                  <span
                    key={c.id}
                    className="inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-1 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: c.color }}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                    <span className="truncate">{count} {c.nombre}</span>
                  </span>
                );
              })}
              {Object.keys(activas).filter(k => activas[k]).length === 0 && (
                <span className="text-[10px] text-secondary-400">Ninguna capa activa</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 pt-0">
          {/* Subir capa / KML — acceso rápido */}
          <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                <Icon name="apoyos" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-secondary-900">Subir KML / capa GIS</p>
                <p className="text-xs text-secondary-600">
                  Importa KML, GeoJSON o Shapefiles de Google Earth, QGIS o cualquier fuente.
                </p>
              </div>
            </div>
            <button
              onClick={() => setCapaSubir('custom')}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              <Icon name="apoyos" size={16} />
              {capasPersonalizadas.length > 0 ? 'Subir más capas' : 'Subir mi primera capa'}
            </button>
            <p className="mt-2 text-center text-[10px] text-secondary-500">
              Las capas nuevas se activan automáticamente en el mapa.
            </p>
          </div>

          {/* Capas subidas */}
          {capasPersonalizadas.length > 0 && renderGrupoColapsable(
            'subidas',
            'Capas subidas',
            <span className="rounded bg-secondary-100 px-1.5 py-0.5 text-[10px] font-bold text-secondary-600">{capasPersonalizadas.length}</span>,
            (
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
            ),
            true
          )}

          {/* Campaña */}
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
              {!modoDemo && (
                <button
                  onClick={() => cargarDatos(true)}
                  className="mt-2 text-xs font-semibold underline hover:no-underline"
                >
                  Usar modo demo
                </button>
              )}
            </div>
          )}

        </div>
      </aside>

      <section className="relative min-h-[400px] flex-1 overflow-hidden rounded-xl bg-white shadow-sm">
        {detalle && <FichaTerritorial detalle={detalle} onCerrar={cerrarFicha} />}

        {featureEditando && (
          <div className="absolute left-4 right-4 top-4 z-[600] mx-auto max-w-sm rounded-xl border border-secondary-200 bg-white p-4 shadow-xl">
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
          <div className="absolute bottom-4 right-4 top-20 z-[500] flex w-[92vw] max-w-md items-center justify-center rounded-xl border border-secondary-200 bg-white/95 shadow-xl">
            <div className="flex items-center gap-2 text-sm text-secondary-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              Cargando detalle territorial...
            </div>
          </div>
        )}

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
        />

        <LeyendaMapa activas={activas} data={data} />

        {loading && (
          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-white/60">
            <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-lg">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              <span className="text-sm font-medium text-secondary-700">Cargando capas...</span>
            </div>
          </div>
        )}
      </section>

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
