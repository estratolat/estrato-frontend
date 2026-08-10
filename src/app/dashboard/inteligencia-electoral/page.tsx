"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { inteligenciaElectoralApi } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";
import {
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Search,
  BarChart3,
  BrainCircuit,
  FileSpreadsheet,
  Users,
  Calendar,
  Award,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Send,
  Sparkles,
  Filter,
  Database,
  MapPin,
  Target,
  Check,
  Settings2,
  Wand2,
  ChevronRight,
  Layers,
} from "lucide-react";

interface Partido {
  id: string;
  nombre: string;
  siglas: string;
  color_hex?: string;
  logo_url?: string;
  orden: number;
}

interface Actor {
  id: string;
  partido_id?: string;
  es_coalicion: boolean;
  nombre_coalicion?: string;
  nombre_visual: string;
  color_hex?: string;
  columna_excel_alias: string;
  tipo_voto: "TOTAL" | "DIFERENCIADO";
  tipo_actor: "PARTIDO" | "CANDIDATO" | "COALICION" | "INDEPENDIENTE";
  orden: number;
  partido?: Partido;
}

interface Eleccion {
  id: string;
  nombre: string;
  anio: number;
  puesto: string;
  descripcion?: string;
  activa: boolean;
  _count?: { actores: number; resultados: number; proyecciones: number };
}

interface SeccionData {
  id: string;
  seccion: string;
  actor?: Actor & { partido?: Partido };
  porcentaje_votos_nulos: number;
  clasificacion_estrategica: string;
  lista_nominal_total: number;
  total_votos_total: number;
  porcentaje_participacion: number;
  desglose_votos: Record<string, number>;
  proyeccion_votos?: number;
}

const MapaSecciones = dynamic(() => import("./MapaSecciones"), { ssr: false });

export default function InteligenciaElectoralPage() {
  const [elecciones, setElecciones] = useState<Eleccion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [eleccionId, setEleccionId] = useState<string>("");
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);
  const [actores, setActores] = useState<Actor[]>([]);
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [seccionesDesdeHistorico, setSeccionesDesdeHistorico] = useState<any[]>(
    [],
  );
  const [modoHistoricoEnAnalisis, setModoHistoricoEnAnalisis] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "catalogos" | "carga" | "analisis" | "mapa" | "consultor"
  >("consultor");
  const [mostrarConfigAvanzada, setMostrarConfigAvanzada] = useState(false);
  const [pasoDrawer, setPasoDrawer] = useState<'catalogos' | 'carga' | 'analisis' | 'mapa'>('catalogos');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [analizando, setAnalizando] = useState<string | null>(null);
  const [analisisResult, setAnalisisResult] = useState<any>(null);
  const [geojsonMapa, setGeojsonMapa] = useState<any>(null);
  const [cargandoMapa, setCargandoMapa] = useState(false);

  // Consultor IA
  const [pregunta, setPregunta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [respuestaIA, setRespuestaIA] = useState<string | null>(null);
  const [resumenContextoIA, setResumenContextoIA] = useState<Record<
    string,
    any
  > | null>(null);
  const [contextoCampana, setContextoCampana] = useState<
    Record<string, string>
  >({
    objetivo: "",
    escenario: "",
    preocupaciones: "",
    oportunidades: "",
    instrucciones: "",
  });
  const [fuentesIA, setFuentesIA] = useState<Record<string, boolean>>({
    proyeccion: true,
    historico: true,
    votantes: true,
    lideres: true,
    eventos: true,
    encuestas: true,
    sedes: true,
    monitoreo: true,
    candidato: true,
    eleccion: true,
    data: false,
  });
  const [actorPrincipalId, setActorPrincipalId] = useState<string>("");
  const [historicosDisponibles, setHistoricosDisponibles] = useState<
    Array<{
      tipo_historico: string;
      tipo_eleccion: string;
      anio: number;
      estado_id?: number;
      estado_nombre?: string;
      municipio_id?: number;
      municipio_nombre?: string;
      partido_principal?: string;
    }>
  >([]);
  const [historicoSeleccion, setHistoricoSeleccion] = useState<{
    anio?: number;
    tipo_historico?: string;
    tipo_eleccion?: string;
    estado_id?: number;
    municipio_id?: number;
  }>({});
  const [filtroTerritorialIA, setFiltroTerritorialIA] = useState<{
    tipo: "todos" | "zona" | "seccion" | "municipio";
    valor: string;
  }>({ tipo: "todos", valor: "" });
  const [rival, setRival] = useState<{
    nombre?: string;
    partido?: string;
    votos_historicos?: number;
  }>({});
  const [rivalesDisponibles, setRivalesDisponibles] = useState<
    Array<{ partido: string; votos: number; candidato?: string }>
  >([]);
  const [zonasDisponibles, setZonasDisponibles] = useState<
    Array<{ id: string; nombre: string }>
  >([]);
  const [guardadoLocal, setGuardadoLocal] = useState(false);
  const [historialIA, setHistorialIA] = useState<
    Array<{
      id: string;
      fecha: string;
      pregunta: string;
      respuesta: string;
      contexto_resumen?: Record<string, any>;
    }>
  >([]);
  const [historialExpandidoId, setHistorialExpandidoId] = useState<
    string | null
  >(null);
  const [estadoInteligencia, setEstadoInteligencia] = useState<{
    datos?: Record<string, number | boolean>;
    fuentes_con_datos?: Record<string, boolean>;
    historicos_disponibles?: any[];
    sugerencias?: {
      actorPrincipalId?: string;
      rival?: { nombre?: string; partido?: string; votos_historicos?: number };
      historicoSeleccion?: any;
      filtroTerritorial?: { tipo: string; valor: string };
    };
  } | null>(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);

  // Formularios
  const [partidoForm, setPartidoForm] = useState<Partial<Partido>>({});
  const [partidoEdit, setPartidoEdit] = useState<string | null>(null);
  const [eleccionForm, setEleccionForm] = useState<Partial<Eleccion>>({
    anio: new Date().getFullYear(),
    activa: true,
  });
  const [eleccionEdit, setEleccionEdit] = useState<string | null>(null);
  const [actorForm, setActorForm] = useState<Partial<Actor>>({});
  const [actorEdit, setActorEdit] = useState<string | null>(null);

  useEffect(() => {
    cargarInicial();
    cargarZonas();
    cargarHistoricosDisponibles();
  }, []);

  useEffect(() => {
    if (eleccionId) {
      cargarEleccion(eleccionId);
    } else {
      setEleccion(null);
      setActores([]);
      setSecciones([]);
      setGeojsonMapa(null);
      setActorPrincipalId("");
    }
  }, [eleccionId]);

  useEffect(() => {
    if (activeTab === "mapa" && eleccionId) {
      cargarMapaSecciones(eleccionId);
    }
  }, [activeTab, eleccionId]);

  useEffect(() => {
    if (activeTab === "analisis" && eleccionId && !secciones.length) {
      const hist = historicosDisponibles[0];
      if (hist) {
        cargarSeccionesDesdeHistorico(hist);
      }
    }
  }, [activeTab, eleccionId, secciones.length, historicosDisponibles.length]);

  const cargarInicial = async () => {
    try {
      setLoading(true);
      setError(null);
      const [ele, par] = await Promise.all([
        inteligenciaElectoralApi.getElecciones(),
        inteligenciaElectoralApi.getPartidos(),
      ]);
      setElecciones(ele.data || []);
      setPartidos(par.data || []);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Error al cargar datos iniciales",
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarZonas = async () => {
    try {
      const { data } = await import("@/lib/api").then((m) =>
        m.zonasApi.getAll(),
      );
      setZonasDisponibles(
        (data || []).map((z: any) => ({ id: z.id, nombre: z.nombre })),
      );
    } catch (err) {
      // No crítico: algunos tenants no usan zonas
    }
  };

  const cargarHistoricosDisponibles = async () => {
    try {
      const { data } =
        await inteligenciaElectoralApi.getHistoricosDisponibles();
      setHistoricosDisponibles(data || []);
    } catch (err) {
      // No crítico: módulo histórico puede no estar cargado
    }
  };

  const cargarRivalesDesdeHistorico = async (
    sel?: typeof historicoSeleccion,
  ) => {
    if (!sel || !sel.anio) {
      setRivalesDisponibles([]);
      return;
    }
    try {
      const { data } = await inteligenciaElectoralApi.getHistoricoResumen(sel);
      const resumen = Array.isArray(data) ? data[0] : data;
      const partidos = (resumen?.partidos || [])
        .sort((a: any, b: any) => b.votos - a.votos)
        .slice(0, 8);
      setRivalesDisponibles(partidos);
    } catch (err) {
      setRivalesDisponibles([]);
    }
  };

  const claveContextoIA = (id: string) => `estrato:consultor-ia:${id}`;
  const claveHistorialIA = (id: string) =>
    `estrato:consultor-ia-historial:${id}`;

  const guardarContextoLocal = (id: string) => {
    const payload = {
      contextoCampana,
      fuentesIA,
      actorPrincipalId,
      historicoSeleccion,
      filtroTerritorialIA,
      rival,
    };
    localStorage.setItem(claveContextoIA(id), JSON.stringify(payload));
    setGuardadoLocal(true);
    setTimeout(() => setGuardadoLocal(false), 1500);
  };

  const cargarContextoLocal = (id: string) => {
    try {
      const raw = localStorage.getItem(claveContextoIA(id));
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.contextoCampana) setContextoCampana(saved.contextoCampana);
      if (saved.fuentesIA) setFuentesIA(saved.fuentesIA);
      if (saved.actorPrincipalId) setActorPrincipalId(saved.actorPrincipalId);
      if (saved.historicoSeleccion)
        setHistoricoSeleccion(saved.historicoSeleccion);
      if (saved.filtroTerritorialIA)
        setFiltroTerritorialIA(saved.filtroTerritorialIA);
      if (saved.rival) setRival(saved.rival);
    } catch (err) {
      // Ignorar corruptos
    }
  };

  const cargarHistorialLocal = (id: string) => {
    try {
      const raw = localStorage.getItem(claveHistorialIA(id));
      if (raw) setHistorialIA(JSON.parse(raw));
    } catch (err) {
      setHistorialIA([]);
    }
  };

  const agregarAlHistorial = (
    id: string,
    item: {
      pregunta: string;
      respuesta: string;
      contexto_resumen?: Record<string, any>;
    },
  ) => {
    const nuevo = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fecha: new Date().toISOString(),
      ...item,
    };
    const actualizado = [nuevo, ...historialIA];
    setHistorialIA(actualizado);
    localStorage.setItem(
      claveHistorialIA(id),
      JSON.stringify(actualizado.slice(0, 50)),
    );
  };

  const eliminarDelHistorial = (id: string, itemId: string) => {
    const actualizado = historialIA.filter((h) => h.id !== itemId);
    setHistorialIA(actualizado);
    localStorage.setItem(claveHistorialIA(id), JSON.stringify(actualizado));
  };

  useEffect(() => {
    if (!eleccionId) return;
    cargarContextoLocal(eleccionId);
    cargarHistorialLocal(eleccionId);
  }, [eleccionId]);

  useEffect(() => {
    if (!eleccionId) return;
    const timer = setTimeout(() => guardarContextoLocal(eleccionId), 800);
    return () => clearTimeout(timer);
  }, [
    contextoCampana,
    fuentesIA,
    actorPrincipalId,
    historicoSeleccion,
    filtroTerritorialIA,
    rival,
    eleccionId,
  ]);

  useEffect(() => {
    cargarRivalesDesdeHistorico(historicoSeleccion);
  }, [
    historicoSeleccion.anio,
    historicoSeleccion.tipo_historico,
    historicoSeleccion.tipo_eleccion,
    historicoSeleccion.estado_id,
    historicoSeleccion.municipio_id,
  ]);

  const cargarEleccion = async (id: string) => {
    try {
      const { data } = await inteligenciaElectoralApi.getEleccion(id);
      setEleccion(data);
      const actoresCargados = data.actores || [];
      setActores(actoresCargados);
      setActorPrincipalId((prev) => prev || actoresCargados[0]?.id || "");
      const [sec] = await Promise.all([
        inteligenciaElectoralApi.getSecciones(id),
      ]);
      setSecciones(sec.data || []);
      await cargarEstadoInteligencia(id);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al cargar elección");
    }
  };

  const cargarEstadoInteligencia = async (id: string) => {
    setCargandoEstado(true);
    try {
      const { data } = await inteligenciaElectoralApi.getEstadoInteligencia(id);
      setEstadoInteligencia(data);

      // Solo aplicar sugerencias automáticas si no hay contexto guardado en localStorage
      const tieneContextoGuardado = !!localStorage.getItem(claveContextoIA(id));

      if (!tieneContextoGuardado) {
        if (data.sugerencias?.actorPrincipalId) {
          setActorPrincipalId(data.sugerencias.actorPrincipalId);
        }
        if (data.sugerencias?.rival?.partido) {
          setRival(data.sugerencias.rival);
        }
        if (data.sugerencias?.historicoSeleccion?.anio) {
          setHistoricoSeleccion(data.sugerencias.historicoSeleccion);
        }
        if (data.sugerencias?.filtroTerritorial) {
          setFiltroTerritorialIA(data.sugerencias.filtroTerritorial);
        }
      }

      // Actualizar fuentes: activar las que tienen datos, desactivar las que no
      const nuevasFuentes = { ...fuentesIA };
      let cambio = false;
      Object.entries(data.fuentes_con_datos || {}).forEach(([key, tiene]) => {
        const bool = !!tiene;
        if (nuevasFuentes[key] !== bool) {
          nuevasFuentes[key] = bool;
          cambio = true;
        }
      });
      if (cambio) setFuentesIA(nuevasFuentes);
    } catch (err) {
      // No crítico
    } finally {
      setCargandoEstado(false);
    }
  };

  const guardarPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partidoForm.nombre || !partidoForm.siglas) return;
    try {
      if (partidoEdit) {
        await inteligenciaElectoralApi.updatePartido(partidoEdit, partidoForm);
      } else {
        await inteligenciaElectoralApi.createPartido(partidoForm);
      }
      setPartidoForm({});
      setPartidoEdit(null);
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al guardar partido");
    }
  };

  const eliminarPartido = async (id: string) => {
    if (!confirm("¿Eliminar partido?")) return;
    try {
      await inteligenciaElectoralApi.deletePartido(id);
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar partido");
    }
  };

  const guardarEleccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eleccionForm.nombre || !eleccionForm.anio || !eleccionForm.puesto)
      return;
    try {
      if (eleccionEdit) {
        await inteligenciaElectoralApi.updateEleccion(
          eleccionEdit,
          eleccionForm,
        );
      } else {
        await inteligenciaElectoralApi.createEleccion(eleccionForm);
      }
      setEleccionForm({ anio: new Date().getFullYear(), activa: true });
      setEleccionEdit(null);
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al guardar elección");
    }
  };

  const eliminarEleccion = async (id: string) => {
    if (
      !confirm(
        "¿Eliminar elección? Se borrarán todos sus resultados y análisis.",
      )
    )
      return;
    try {
      await inteligenciaElectoralApi.deleteEleccion(id);
      if (eleccionId === id) setEleccionId("");
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar elección");
    }
  };

  const guardarActor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !actorForm.nombre_visual ||
      !actorForm.columna_excel_alias ||
      !eleccionId
    )
      return;
    try {
      if (actorEdit) {
        await inteligenciaElectoralApi.updateActor(actorEdit, actorForm);
      } else {
        await inteligenciaElectoralApi.createActor(eleccionId, actorForm);
      }
      setActorForm({});
      setActorEdit(null);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al guardar actor");
    }
  };

  const eliminarActor = async (id: string) => {
    if (!confirm("¿Eliminar actor/coalición?")) return;
    try {
      await inteligenciaElectoralApi.deleteActor(id);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al eliminar actor");
    }
  };

  const descargarPlantilla = async () => {
    if (!eleccionId) return;
    try {
      const res = await inteligenciaElectoralApi.descargarPlantilla(eleccionId);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plantilla_${eleccion?.nombre?.replace(/\s+/g, "_") || "eleccion"}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al descargar plantilla");
    }
  };

  const descargarSabana = async () => {
    if (!eleccionId) return;
    try {
      const res = await inteligenciaElectoralApi.descargarSabana(eleccionId);
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sabana_${eleccion?.nombre?.replace(/\s+/g, "_") || "eleccion"}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al descargar sábana");
    }
  };

  const cargarExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eleccionId) return;
    const input = (e.target as HTMLFormElement).archivo as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      const { data } = await inteligenciaElectoralApi.cargarExcel(
        eleccionId,
        formData,
      );
      setImportResult(data);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setImportResult({
        error: err.response?.data?.message || "Error al cargar Excel",
      });
    } finally {
      setImporting(false);
    }
  };

  const cargarMapaSecciones = async (id: string) => {
    setCargandoMapa(true);
    setGeojsonMapa(null);
    try {
      const { data } = await inteligenciaElectoralApi.getMapaSecciones(id);
      setGeojsonMapa(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Error al cargar mapa de secciones",
      );
    } finally {
      setCargandoMapa(false);
    }
  };

  const cargarSeccionesDesdeHistorico = async (
    hist?: (typeof historicosDisponibles)[0],
  ) => {
    if (!eleccionId || !hist) return;
    try {
      const { data } =
        await inteligenciaElectoralApi.getSeccionesDesdeHistorico(eleccionId, {
          anio: hist.anio,
          tipo_historico: hist.tipo_historico,
          tipo_eleccion: hist.tipo_eleccion,
          estado_id: hist.estado_id,
          municipio_id: hist.municipio_id,
        });
      setSeccionesDesdeHistorico(data || []);
      setModoHistoricoEnAnalisis(true);
    } catch (err: any) {
      setSeccionesDesdeHistorico([]);
      setModoHistoricoEnAnalisis(false);
    }
  };

  const analizarSeccion = async (seccion: string) => {
    if (!eleccionId) return;
    setAnalizando(seccion);
    setAnalisisResult(null);
    try {
      const { data } = await inteligenciaElectoralApi.analizarSeccion(
        eleccionId,
        seccion,
      );
      setAnalisisResult(data);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al analizar sección");
    } finally {
      setAnalizando(null);
    }
  };

  const colorClasificacion = (c: string) => {
    switch (c) {
      case "BASTION":
        return "bg-green-100 text-green-700 border-green-200";
      case "PRIORITARIA_RIESGO":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header simplificado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary-900">
            <Icon name="ia" size={28} className="text-primary-600" />
            Inteligencia Electoral
          </h1>
          <p className="text-sm text-secondary-500">
            Consultor IA de Campaña: hazle preguntas a tus datos y recibe estrategia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={eleccionId}
            onChange={(e) => setEleccionId(e.target.value)}
            className="input"
          >
            <option value="">Seleccionar elección</option>
            {elecciones.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre} ({e.anio}) - {e.puesto}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setPasoDrawer('catalogos');
              setMostrarConfigAvanzada(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            title="Configura partidos, elecciones, actores, sábanas, análisis y mapa"
          >
            <Settings2 size={16} /> Preparar datos
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Vista principal: Consultor IA */}
      <div className="space-y-6">
        {!eleccionId ? (
          <div className="card p-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                <Sparkles size={32} className="text-primary-600" />
              </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-secondary-900">
              Bienvenido al Consultor IA de Campaña
            </h3>
            <p className="mx-auto mb-6 max-w-xl text-sm text-secondary-600">
              Para que la IA te asesore, necesita saber de qué campaña hablamos.
              Elige una elección arriba o crea una nueva. Luego podrás cargar
              sábanas, histórico y preguntar a la IA.
            </p>
            {elecciones.length === 0 && (
              <button
                onClick={() => {
                  setPasoDrawer('catalogos');
                  setMostrarConfigAvanzada(true);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={16} /> Preparar mi primera elección
              </button>
            )}

            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { step: 1, title: 'Crear elección', desc: 'Define el cargo, año y actores.', icon: Calendar },
                { step: 2, title: 'Cargar sábanas', desc: 'Sube los resultados por casilla.', icon: Upload },
                { step: 3, title: 'Vincular histórico', desc: 'Conecta elecciones pasadas.', icon: BarChart3 },
                { step: 4, title: 'Preguntar a la IA', desc: 'Recibe estrategia territorial.', icon: Sparkles },
              ].map((s) => (
                <div key={s.step} className="rounded-lg border border-secondary-200 bg-secondary-50 p-4 text-left">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                    {s.step}
                  </div>
                  <p className="font-bold text-secondary-900">{s.title}</p>
                  <p className="text-xs text-secondary-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Panel de datos detectados */}
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 size={18} className="text-primary-600" />
                  <h4 className="font-bold text-secondary-900">
                    Datos detectados para {eleccion?.nombre}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setPasoDrawer('catalogos');
                    setMostrarConfigAvanzada(true);
                  }}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Preparar más datos
                </button>
              </div>
              {cargandoEstado ? (
                <div className="flex items-center gap-2 text-sm text-secondary-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-600" />
                  Analizando datos disponibles...
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { key: 'sábanas', label: 'Sábanas cargadas', icon: FileSpreadsheet },
                    { key: 'históricos', label: 'Históricos electorales', icon: BarChart3 },
                    { key: 'secciones', label: 'Secciones', icon: MapPin },
                    { key: 'votantes', label: 'Votantes', icon: Users },
                    { key: 'líderes', label: 'Líderes', icon: Award },
                    { key: 'eventos', label: 'Eventos', icon: Calendar },
                    { key: 'encuestas', label: 'Encuestas', icon: CheckCircle2 },
                    { key: 'casillas', label: 'Casillas / Sedes', icon: MapPin },
                  ].map((item) => {
                    const raw = estadoInteligencia?.datos?.[item.key];
                    const tiene = typeof raw === 'boolean' ? raw : (raw || 0) > 0;
                    return (
                      <div
                        key={item.key}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          tiene
                            ? 'border-primary-200 bg-primary-50 text-secondary-900'
                            : 'border-gray-200 bg-white text-secondary-400'
                        }`}
                      >
                        <item.icon
                          size={16}
                          className={tiene ? 'text-primary-600' : 'text-secondary-300'}
                        />
                        <span className="font-medium">{item.label}</span>
                        {typeof raw === 'number' && (
                          <span className="ml-auto text-xs font-bold">{raw.toLocaleString()}</span>
                        )}
                        {typeof raw === 'boolean' && (
                          <span className="ml-auto text-xs">{raw ? 'Sí' : 'No'}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!cargandoEstado && estadoInteligencia && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {estadoInteligencia.sugerencias?.actorPrincipalId && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      <Check size={14} /> Actor principal sugerido:{' '}
                      {actores.find((a) => a.id === estadoInteligencia.sugerencias?.actorPrincipalId)?.nombre_visual || '—'}
                    </span>
                  )}
                  {estadoInteligencia.sugerencias?.rival?.partido && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      <Target size={14} /> Rival sugerido:{' '}
                      {estadoInteligencia.sugerencias.rival.nombre || estadoInteligencia.sugerencias.rival.partido}
                    </span>
                  )}
                  {estadoInteligencia.sugerencias?.historicoSeleccion?.anio && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      <BarChart3 size={14} /> Histórico: {estadoInteligencia.sugerencias.historicoSeleccion.anio}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Formulario de consulta */}
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={22} className="text-primary-600" />
                  <h3 className="text-lg font-bold text-secondary-900">Consultor IA de Campaña</h3>
                </div>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-opacity ${
                    guardadoLocal
                      ? 'bg-green-100 text-green-700 opacity-100'
                      : 'bg-secondary-100 text-secondary-500 opacity-0'
                  }`}
                  aria-live="polite"
                >
                  <Check size={14} /> Guardado
                </span>
              </div>
              <p className="mb-4 text-sm text-secondary-600">
                Escribe lo que quieres saber o decidir. La IA cruza proyección, histórico, votantes, líderes, eventos,
                encuestas, sedes, monitoreo de casillas, perfil del candidato, indicadores municipales de Data y la
                perspectiva del actor principal.
              </p>

              <div className="mb-4 grid gap-4 lg:grid-cols-3">
                {/* Columna 1: actor, histórico, rival, fuentes, filtro */}
                <div className="space-y-3 lg:col-span-1">
                  <div className="space-y-2">
                    <label className="label flex items-center gap-2">
                      <Users size={16} className="text-primary-600" /> Actor principal / perspectiva
                    </label>
                    <select
                      value={actorPrincipalId}
                      onChange={(e) => setActorPrincipalId(e.target.value)}
                      className="input"
                      disabled={!eleccionId || actores.length === 0}
                    >
                      <option value="">
                        {eleccionId
                          ? actores.length
                            ? 'Seleccionar actor...'
                            : 'Sin actores'
                          : 'Selecciona una elección'}
                      </option>
                      {actores.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre_visual} {a.partido?.siglas ? `(${a.partido.siglas})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary-500">La IA analizará la estrategia desde la perspectiva de este actor.</p>
                  </div>

                  {fuentesIA.historico && historicosDisponibles.length > 0 && (
                    <div className="space-y-2">
                      <label className="label flex items-center gap-2">
                        <BarChart3 size={16} className="text-primary-600" /> Histórico electoral a usar
                      </label>
                      <select
                        value={
                          historicoSeleccion.anio
                            ? `${historicoSeleccion.tipo_historico || 'principal'}|${historicoSeleccion.tipo_eleccion || 'ayuntamiento'}|${historicoSeleccion.anio}|${historicoSeleccion.estado_id || ''}|${historicoSeleccion.municipio_id || ''}`
                            : ''
                        }
                        onChange={(e) => {
                          if (!e.target.value) {
                            setHistoricoSeleccion({});
                            setRival({});
                            return;
                          }
                          const [tipo_historico, tipo_eleccion, anio, estado_id, municipio_id] = e.target.value.split('|');
                          const sel = {
                            tipo_historico,
                            tipo_eleccion,
                            anio: Number(anio),
                            estado_id: estado_id ? Number(estado_id) : undefined,
                            municipio_id: municipio_id ? Number(municipio_id) : undefined,
                          };
                          setHistoricoSeleccion(sel);
                          setRival({});
                          cargarRivalesDesdeHistorico(sel);
                        }}
                        className="input"
                      >
                        <option value="">Usar todos los históricos disponibles</option>
                        {historicosDisponibles.map((h) => {
                          const key = `${h.tipo_historico}|${h.tipo_eleccion}|${h.anio}|${h.estado_id || ''}|${h.municipio_id || ''}`;
                          const label = `${h.anio} · ${h.tipo_historico === 'principal' ? 'Principal' : 'Complementario'} · ${h.tipo_eleccion.replace(/_/g, ' ')}${h.municipio_nombre ? ` · ${h.municipio_nombre}` : ''}${h.partido_principal ? ` · ${h.partido_principal}` : ''}`;
                          return (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-xs text-secondary-500">
                        Selecciona un histórico específico para que la IA use solo esos registros y secciones.
                      </p>
                    </div>
                  )}

                  {fuentesIA.historico && rivalesDisponibles.length > 0 && (
                    <div className="space-y-2">
                      <label className="label flex items-center gap-2">
                        <Target size={16} className="text-primary-600" /> Rival principal a vencer
                      </label>
                      <select
                        value={rival.partido || ''}
                        onChange={(e) => {
                          const partido = e.target.value;
                          if (!partido) {
                            setRival({});
                            return;
                          }
                          const r = rivalesDisponibles.find((x) => x.partido === partido);
                          setRival({
                            partido: r?.partido,
                            nombre: r?.candidato || r?.partido,
                            votos_historicos: r?.votos,
                          });
                        }}
                        className="input"
                      >
                        <option value="">Seleccionar rival...</option>
                        {rivalesDisponibles.map((r) => (
                          <option key={r.partido} value={r.partido}>
                            {r.partido} {r.candidato ? `(${r.candidato})` : ''} — {r.votos.toLocaleString()} votos
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-secondary-500">Tomado del histórico electoral. La IA enfocará la estrategia para vencer a este actor.</p>
                    </div>
                  )}

                  <label className="label flex items-center gap-2">
                    <Database size={16} className="text-primary-600" /> Fuentes de datos a vincular
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'proyeccion', label: 'Proyección de votos' },
                      { key: 'historico', label: 'Histórico electoral' },
                      { key: 'votantes', label: 'Votantes / simpatizantes' },
                      { key: 'lideres', label: 'Líderes territoriales' },
                      { key: 'eventos', label: 'Eventos / mítines' },
                      { key: 'encuestas', label: 'Encuestas' },
                      { key: 'sedes', label: 'Sedes / casillas' },
                      { key: 'monitoreo', label: 'Casillas monitoreo' },
                      { key: 'candidato', label: 'Perfil del candidato' },
                      { key: 'eleccion', label: 'Elección y actores' },
                      { key: 'data', label: 'Data / Indicadores municipales' },
                    ].map((f) => (
                      <label
                        key={f.key}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                          fuentesIA[f.key]
                            ? 'border-primary-300 bg-primary-50 text-secondary-900'
                            : 'border-gray-200 bg-white text-secondary-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={fuentesIA[f.key]}
                          onChange={(e) => setFuentesIA({ ...fuentesIA, [f.key]: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>

                  <div className="mt-3 space-y-2">
                    <label className="label flex items-center gap-2">
                      <MapPin size={16} className="text-primary-600" /> Filtro territorial
                    </label>
                    <select
                      value={filtroTerritorialIA.tipo}
                      onChange={(e) => setFiltroTerritorialIA({ tipo: e.target.value as any, valor: '' })}
                      className="input"
                    >
                      <option value="todos">Todo el territorio</option>
                      {zonasDisponibles.length > 0 && <option value="zona">Zona / Nodo</option>}
                      <option value="seccion">Sección electoral</option>
                      <option value="municipio">Municipio / Delegación</option>
                    </select>

                    {filtroTerritorialIA.tipo === 'zona' && zonasDisponibles.length > 0 && (
                      <select
                        value={filtroTerritorialIA.valor}
                        onChange={(e) => setFiltroTerritorialIA({ ...filtroTerritorialIA, valor: e.target.value })}
                        className="input"
                      >
                        <option value="">Seleccionar zona...</option>
                        {zonasDisponibles.map((z) => (
                          <option key={z.id} value={z.nombre}>{z.nombre}</option>
                        ))}
                      </select>
                    )}

                    {filtroTerritorialIA.tipo === 'seccion' && (
                      <div className="rounded-lg border border-gray-200 bg-white p-2">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-secondary-700">Selecciona las secciones a analizar</p>
                          <button
                            type="button"
                            onClick={() => {
                              const todas = secciones.map((s) => s.seccion);
                              const actuales = filtroTerritorialIA.valor.split(',').map((v) => v.trim()).filter(Boolean);
                              const todasSeleccionadas = actuales.length === todas.length && todas.every((t) => actuales.includes(t));
                              setFiltroTerritorialIA({
                                ...filtroTerritorialIA,
                                valor: todasSeleccionadas ? '' : todas.join(','),
                              });
                            }}
                            className="text-xs font-medium text-primary-600 hover:text-primary-700"
                          >
                            {filtroTerritorialIA.valor.split(',').filter(Boolean).length === secciones.length ? 'Quitar todas' : 'Seleccionar todas'}
                          </button>
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-3 gap-2">
                            {secciones.map((s) => {
                              const seleccionadas = filtroTerritorialIA.valor.split(',').map((v) => v.trim()).filter(Boolean);
                              const checked = seleccionadas.includes(s.seccion);
                              return (
                                <label
                                  key={s.id}
                                  className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${
                                    checked
                                      ? 'border-primary-300 bg-primary-50 text-secondary-900'
                                      : 'border-gray-200 bg-white text-secondary-600'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const nuevas = e.target.checked
                                        ? [...seleccionadas, s.seccion].filter((v, i, arr) => arr.indexOf(v) === i)
                                        : seleccionadas.filter((v) => v !== s.seccion);
                                      setFiltroTerritorialIA({ ...filtroTerritorialIA, valor: nuevas.join(',') });
                                    }}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  />
                                  {s.seccion}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {filtroTerritorialIA.valor && (
                          <p className="mt-2 text-xs text-secondary-500">
                            {filtroTerritorialIA.valor.split(',').filter(Boolean).length} sección(es) seleccionada(s)
                          </p>
                        )}
                      </div>
                    )}

                    {filtroTerritorialIA.tipo === 'municipio' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={filtroTerritorialIA.valor}
                          onChange={(e) => setFiltroTerritorialIA({ ...filtroTerritorialIA, valor: e.target.value })}
                          placeholder="Ej. Dolores Hidalgo"
                          className="input"
                        />
                        {historicosDisponibles.length > 0 && (
                          <p className="text-xs text-secondary-500">
                            Tip: si seleccionas un histórico electoral arriba, la IA usará automáticamente las secciones de ese municipio.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna 2: contexto de campaña */}
                <div className="space-y-3 lg:col-span-1">
                  <label className="label">Describe el contexto de tu campaña (formulario libre)</label>
                  {[
                    { key: 'objetivo', label: 'Objetivo electoral', placeholder: 'Ej. Ganar la gubernatura con 45% de votos válidos' },
                    { key: 'escenario', label: 'Escenario / rivalidad', placeholder: 'Ej. Competencia tripartita, el PRI lleva 12 años gobernando' },
                    { key: 'preocupaciones', label: 'Preocupaciones', placeholder: 'Ej. Baja participación en zonas rurales y votos nulos altos' },
                    { key: 'oportunidades', label: 'Oportunidades', placeholder: 'Ej. Fuerte crecimiento de jóvenes votantes en zona metropolitana' },
                    { key: 'instrucciones', label: 'Instrucciones especiales', placeholder: 'Ej. Enfócate en defender bastiones y recuperar secciones pérdidas en 2021' },
                  ].map((campo) => (
                    <div key={campo.key}>
                      <p className="mb-1 text-xs font-medium text-secondary-700">{campo.label}</p>
                      <textarea
                        value={contextoCampana[campo.key] || ''}
                        onChange={(e) => setContextoCampana({ ...contextoCampana, [campo.key]: e.target.value })}
                        placeholder={campo.placeholder}
                        rows={2}
                        className="input resize-none"
                      />
                    </div>
                  ))}
                </div>

                {/* Columna 3: pregunta */}
                <div className="flex flex-col gap-3 lg:col-span-1">
                  <label className="label">Tu pregunta o instrucción para la IA</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '¿En qué 3 secciones enfocar recursos esta semana?',
                      '¿Cuál es mi principal rival a vencer y por qué?',
                      '¿Qué secciones son bastiones y cuáles están en riesgo?',
                      '¿Qué estrategia recomiendas para ganar la elección?',
                      '¿Dónde hay más votos nulos y qué hacer al respecto?',
                      '¿Cómo está mi posición frente al rival histórico?',
                    ].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setPregunta(q)}
                        className="rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={pregunta}
                    onChange={(e) => setPregunta(e.target.value)}
                    placeholder="Ej. ¿En qué 3 secciones debo enfocar recursos esta semana según la proyección y el histórico?"
                    rows={6}
                    className="input resize-none"
                  />
                  <button
                    onClick={async () => {
                      if (!pregunta.trim()) return;
                      setConsultando(true);
                      setRespuestaIA(null);
                      setError(null);
                      try {
                        const { data } = await inteligenciaElectoralApi.consultarIA({
                          pregunta,
                          contextoCampana,
                          eleccionId: eleccionId || undefined,
                          actorPrincipalId: actorPrincipalId || undefined,
                          fuentes: fuentesIA,
                          filtroTerritorial: filtroTerritorialIA,
                          historicoSeleccion: Object.keys(historicoSeleccion).length ? historicoSeleccion : undefined,
                          rival: Object.keys(rival).length ? rival : undefined,
                        });
                        setRespuestaIA(data.respuesta);
                        setResumenContextoIA(data.contexto_resumen || null);
                        if (eleccionId) {
                          const nuevoItem = {
                            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                            fecha: new Date().toISOString(),
                            pregunta,
                            respuesta: data.respuesta,
                            contexto_resumen: data.contexto_resumen,
                          };
                          const actualizado = [nuevoItem, ...historialIA];
                          setHistorialIA(actualizado);
                          setHistorialExpandidoId(nuevoItem.id);
                          localStorage.setItem(claveHistorialIA(eleccionId), JSON.stringify(actualizado.slice(0, 50)));
                        }
                      } catch (err: any) {
                        setError(err.response?.data?.message || 'Error al consultar la IA');
                      } finally {
                        setConsultando(false);
                      }
                    }}
                    disabled={consultando || !pregunta.trim()}
                    className="btn-primary flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {consultando ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
                        Consultando...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> Preguntar a la IA
                      </>
                    )}
                  </button>
                </div>
              </div>

              {respuestaIA && (
                <div className="mt-6 rounded-lg border border-primary-200 bg-primary-50 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-bold text-secondary-900">
                    <Sparkles size={16} className="text-primary-600" /> Respuesta de la IA
                  </h4>
                  <div className="prose prose-sm max-w-none text-secondary-800">
                    {respuestaIA.split('\n').map((line, i) => {
                      if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold">{line.replace('# ', '')}</h1>;
                      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold">{line.replace('## ', '')}</h2>;
                      if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold">{line.replace('### ', '')}</h3>;
                      if (line.startsWith('- ')) return <li key={i}>{line.replace('- ', '')}</li>;
                      if (line.match(/^\d+\. /)) return <li key={i}>{line.replace(/^\d+\. /, '')}</li>;
                      if (line.trim() === '') return <br key={i} />;
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                </div>
              )}

              {resumenContextoIA && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { key: 'actor_principal', label: 'Actor principal' },
                    { key: 'data', label: 'Indicadores municipales' },
                    { key: 'proyeccion', label: 'Proyección' },
                    { key: 'historicos', label: 'Histórico' },
                    { key: 'votantes', label: 'Votantes' },
                    { key: 'lideres', label: 'Líderes' },
                    { key: 'eventos', label: 'Eventos' },
                    { key: 'encuestas', label: 'Encuestas' },
                    { key: 'sedes', label: 'Sedes' },
                    { key: 'monitoreo', label: 'Monitoreo' },
                    { key: 'candidato', label: 'Candidato' },
                    { key: 'eleccion', label: 'Elección' },
                  ].map((chip) => {
                    const raw = resumenContextoIA[chip.key];
                    const isActive = typeof raw === 'number' ? raw > 0 : !!raw;
                    return (
                      <span
                        key={chip.key}
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {chip.label}
                      </span>
                    );
                  })}
                  {resumenContextoIA?.filtro_territorial?.tipo !== 'todos' && (
                    <span className="inline-flex rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                      Filtro: {resumenContextoIA?.filtro_territorial?.tipo} · {resumenContextoIA?.filtro_territorial?.valor}
                    </span>
                  )}
                </div>
              )}

              {historialIA.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-2 font-bold text-secondary-900">
                      <MessageSquare size={20} className="text-primary-600" />
                      Historial de análisis
                    </h4>
                    <button
                      onClick={() => {
                        if (confirm('¿Borrar todo el historial de análisis de esta elección?')) {
                          setHistorialIA([]);
                          setHistorialExpandidoId(null);
                          if (eleccionId) localStorage.removeItem(claveHistorialIA(eleccionId));
                        }
                      }}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Borrar historial
                    </button>
                  </div>

                  {historialIA.map((item, idx) => {
                    const esUltimo = idx === 0;
                    const expandido = historialExpandidoId === item.id || (historialExpandidoId === null && esUltimo);
                    return (
                      <div key={item.id} className={`card overflow-hidden ${esUltimo ? 'border-primary-300' : 'border-gray-200'}`}>
                        <button
                          onClick={() => setHistorialExpandidoId(expandido ? null : item.id)}
                          className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                              {historialIA.length - idx}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-secondary-900">{item.pregunta}</p>
                              <p className="text-xs text-secondary-500">{new Date(item.fecha).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-secondary-500">{expandido ? 'Ocultar' : 'Ver respuesta'}</span>
                            <svg
                              className={`h-4 w-4 text-secondary-500 transition-transform ${expandido ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {expandido && (
                          <div className="border-t border-gray-100 p-4">
                            {item.contexto_resumen && (
                              <div className="mb-4 flex flex-wrap gap-2">
                                {[
                                  { key: 'actor_principal', label: 'Actor principal' },
                                  { key: 'data', label: 'Indicadores municipales' },
                                  { key: 'proyeccion', label: 'Proyección' },
                                  { key: 'historicos', label: 'Histórico' },
                                  { key: 'historico_resumen', label: 'Resumen histórico' },
                                  { key: 'votantes', label: 'Votantes' },
                                  { key: 'lideres', label: 'Líderes' },
                                  { key: 'eventos', label: 'Eventos' },
                                  { key: 'encuestas', label: 'Encuestas' },
                                  { key: 'sedes', label: 'Sedes' },
                                  { key: 'monitoreo', label: 'Monitoreo' },
                                  { key: 'candidato', label: 'Candidato' },
                                  { key: 'eleccion', label: 'Elección' },
                                ].map((chip) => {
                                  const raw = item.contexto_resumen?.[chip.key];
                                  const isActive = typeof raw === 'number' ? raw > 0 : !!raw;
                                  return (
                                    <span
                                      key={chip.key}
                                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                      }`}
                                    >
                                      {chip.label}
                                    </span>
                                  );
                                })}
                                {item.contexto_resumen?.filtro_territorial?.tipo !== 'todos' && (
                                  <span className="inline-flex rounded-full bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700">
                                    Filtro: {item.contexto_resumen?.filtro_territorial?.tipo} · {item.contexto_resumen?.filtro_territorial?.valor}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="prose prose-sm max-w-none text-secondary-800">
                              {item.respuesta.split('\n').map((line, i) => {
                                if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold">{line.replace('# ', '')}</h1>;
                                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold">{line.replace('## ', '')}</h2>;
                                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold">{line.replace('### ', '')}</h3>;
                                if (line.startsWith('- ')) return <li key={i}>{line.replace('- ', '')}</li>;
                                if (line.match(/^\d+\. /)) return <li key={i}>{line.replace(/^\d+\. /, '')}</li>;
                                if (line.trim() === '') return <br key={i} />;
                                return <p key={i}>{line}</p>;
                              })}
                            </div>
                            <div className="mt-4 flex justify-end">
                              <button
                                onClick={() => eliminarDelHistorial(eleccionId || '', item.id)}
                                className="text-xs font-medium text-red-600 hover:text-red-700"
                              >
                                Eliminar esta respuesta
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Drawer de Preparar datos */}
      {mostrarConfigAvanzada && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/40"
          onClick={() => { setMostrarConfigAvanzada(false); setActiveTab('consultor'); }}
        >
          <div
            className="h-full w-full max-w-5xl overflow-y-auto bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              {/* Drawer header */}
              <div className="border-b border-secondary-200 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-bold text-secondary-900">
                      <Settings2 size={20} className="text-primary-600" />
                      Preparar datos de campaña
                    </h3>
                    <p className="text-sm text-secondary-500">
                      Configura todo lo que la IA necesita para asesorarte. Avanza por los pasos en el orden que prefieras.
                    </p>
                  </div>
                  <button
                    onClick={() => { setMostrarConfigAvanzada(false); setActiveTab('consultor'); }}
                    className="rounded p-1 text-secondary-500 hover:bg-secondary-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Wizard steps */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'catalogos', label: 'Catálogos', desc: 'Partidos, elección y actores', icon: Users },
                    { key: 'carga', label: 'Cargar sábanas', desc: 'Resultados por casilla', icon: Upload },
                    { key: 'analisis', label: 'Análisis', desc: 'Revisar secciones', icon: BarChart3 },
                    { key: 'mapa', label: 'Mapa', desc: 'Visualización territorial', icon: MapPin },
                  ].map((s) => {
                    const completo = s.key === 'catalogos'
                      ? partidos.length > 0 && elecciones.length > 0 && actores.length > 0
                      : s.key === 'carga'
                        ? Number(estadoInteligencia?.datos?.sábanas || 0) > 0
                        : s.key === 'analisis'
                          ? Number(estadoInteligencia?.datos?.secciones || 0) > 0 || seccionesDesdeHistorico.length > 0
                          : !!geojsonMapa;
                    return (
                      <button
                        key={s.key}
                        onClick={() => { setPasoDrawer(s.key as any); setActiveTab(s.key as any); }}
                        className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                          pasoDrawer === s.key
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-secondary-200 bg-white hover:bg-secondary-50'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="flex items-center gap-1 text-sm font-bold text-secondary-900">
                            <s.icon size={16} className="text-primary-600" /> {s.label}
                          </span>
                          {completo ? (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">LISTO</span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">PEND</span>
                          )}
                        </div>
                        <span className="text-xs text-secondary-500">{s.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto p-6">
                {pasoDrawer === 'catalogos' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
                      <p className="font-bold">¿Qué haces aquí?</p>
                      <p>
                        Define quiénes compiten: los <strong>partidos</strong> (siglas y color), la <strong>elección</strong> (cargo y año, ej. Alcalde 2027) y los <strong>actores/coaliciones</strong> (candidato o alianza que busca votos). La IA usa esto para saber de quién hablas.
                      </p>
                    </div>
                        <div className="grid gap-6 lg:grid-cols-2">
                          {/* Partidos */}
                          <div className="card p-4">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-secondary-900">
                              <Award size={20} className="text-primary-600" /> Partidos
                              Políticos
                            </h2>

                            <form
                              onSubmit={guardarPartido}
                              className="mb-4 grid gap-3 sm:grid-cols-4"
                            >
                              <input
                                placeholder="Nombre"
                                value={partidoForm.nombre || ""}
                                onChange={(e) =>
                                  setPartidoForm({ ...partidoForm, nombre: e.target.value })
                                }
                                className="input"
                                required
                              />
                              <input
                                placeholder="Siglas"
                                value={partidoForm.siglas || ""}
                                onChange={(e) =>
                                  setPartidoForm({ ...partidoForm, siglas: e.target.value })
                                }
                                className="input"
                                required
                              />
                              <input
                                type="color"
                                placeholder="Color"
                                value={partidoForm.color_hex || "#3B82F6"}
                                onChange={(e) =>
                                  setPartidoForm({ ...partidoForm, color_hex: e.target.value })
                                }
                                className="input h-10 px-2"
                              />
                              <button
                                type="submit"
                                className="btn-primary flex items-center justify-center gap-1"
                              >
                                <Plus size={16} /> {partidoEdit ? "Actualizar" : "Agregar"}
                              </button>
                            </form>

                            <div className="divide-y divide-gray-100">
                              {partidos.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-4 w-4 rounded-full"
                                      style={{ backgroundColor: p.color_hex || "#ccc" }}
                                    />
                                    <span className="font-medium">{p.nombre}</span>
                                    <span className="text-xs text-secondary-500">
                                      ({p.siglas})
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setPartidoEdit(p.id);
                                        setPartidoForm(p);
                                      }}
                                      className="rounded p-1 text-secondary-500 hover:bg-secondary-100"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => eliminarPartido(p.id)}
                                      className="rounded p-1 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Elecciones */}
                          <div className="card p-4">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-secondary-900">
                              <Calendar size={20} className="text-primary-600" /> Eventos
                              Electorales
                            </h2>

                            <form
                              onSubmit={guardarEleccion}
                              className="mb-4 grid gap-3 sm:grid-cols-5"
                            >
                              <input
                                placeholder="Nombre (opcional)"
                                value={eleccionForm.nombre || ""}
                                onChange={(e) =>
                                  setEleccionForm({ ...eleccionForm, nombre: e.target.value })
                                }
                                className="input"
                              />
                              <input
                                type="number"
                                placeholder="Año"
                                value={eleccionForm.anio || ""}
                                onChange={(e) =>
                                  setEleccionForm({
                                    ...eleccionForm,
                                    anio: Number(e.target.value),
                                  })
                                }
                                className="input"
                                required
                              />
                              <select
                                value={eleccionForm.puesto || ""}
                                onChange={(e) =>
                                  setEleccionForm({ ...eleccionForm, puesto: e.target.value })
                                }
                                className="input"
                                required
                              >
                                <option value="">Seleccionar cargo...</option>
                                <option value="Presidente República">
                                  Presidente República
                                </option>
                                <option value="Diputaciones Federales">
                                  Diputaciones Federales
                                </option>
                                <option value="Diputaciones Locales">
                                  Diputaciones Locales
                                </option>
                                <option value="Alcalde">Alcalde</option>
                                <option value="Otro">Otro</option>
                              </select>
                              <select
                                value={eleccionForm.activa ? "true" : "false"}
                                onChange={(e) =>
                                  setEleccionForm({
                                    ...eleccionForm,
                                    activa: e.target.value === "true",
                                  })
                                }
                                className="input"
                              >
                                <option value="true">Activa</option>
                                <option value="false">Inactiva</option>
                              </select>
                              <button
                                type="submit"
                                className="btn-primary flex items-center justify-center gap-1"
                              >
                                <Plus size={16} /> {eleccionEdit ? "Actualizar" : "Agregar"}
                              </button>
                            </form>

                            <div className="divide-y divide-gray-100">
                              {elecciones.map((e) => (
                                <div
                                  key={e.id}
                                  className="flex items-center justify-between py-2"
                                >
                                  <div>
                                    <span className="font-medium">{e.nombre}</span>
                                    <span className="ml-2 text-xs text-secondary-500">
                                      {e.anio} · {e.puesto} · {e._count?.actores || 0} actores
                                    </span>
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => {
                                        setEleccionEdit(e.id);
                                        setEleccionForm(e);
                                      }}
                                      className="rounded p-1 text-secondary-500 hover:bg-secondary-100"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => eliminarEleccion(e.id)}
                                      className="rounded p-1 text-red-500 hover:bg-red-50"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Actores */}
                          <div className="card p-4 lg:col-span-2">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-secondary-900">
                              <Users size={20} className="text-primary-600" /> Actores y
                              Coaliciones
                              {eleccion && (
                                <span className="text-sm font-normal text-secondary-500">
                                  · {eleccion.nombre}
                                </span>
                              )}
                            </h2>

                            {eleccionId ? (
                              <>
                                <form
                                  onSubmit={guardarActor}
                                  className="mb-4 grid gap-3 sm:grid-cols-8"
                                >
                                  <select
                                    value={actorForm.partido_id || ""}
                                    onChange={(e) =>
                                      setActorForm({
                                        ...actorForm,
                                        partido_id: e.target.value || undefined,
                                      })
                                    }
                                    className="input"
                                  >
                                    <option value="">Sin partido</option>
                                    {partidos.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.siglas}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={actorForm.tipo_actor || "PARTIDO"}
                                    onChange={(e) =>
                                      setActorForm({
                                        ...actorForm,
                                        tipo_actor: e.target.value as any,
                                      })
                                    }
                                    className="input"
                                    title="Tipo de actor"
                                  >
                                    <option value="PARTIDO">Partido</option>
                                    <option value="CANDIDATO">Candidato</option>
                                    <option value="COALICION">Coalición</option>
                                    <option value="INDEPENDIENTE">Independiente</option>
                                  </select>
                                  <input
                                    placeholder="Nombre visual"
                                    value={actorForm.nombre_visual || ""}
                                    onChange={(e) =>
                                      setActorForm({
                                        ...actorForm,
                                        nombre_visual: e.target.value,
                                      })
                                    }
                                    className="input"
                                    required
                                  />
                                  <input
                                    placeholder="Nombre coalición"
                                    value={actorForm.nombre_coalicion || ""}
                                    onChange={(e) =>
                                      setActorForm({
                                        ...actorForm,
                                        nombre_coalicion: e.target.value,
                                      })
                                    }
                                    className="input"
                                    title="Solo si es coalición"
                                  />
                                  <input
                                    type="color"
                                    value={actorForm.color_hex || "#3B82F6"}
                                    onChange={(e) =>
                                      setActorForm({ ...actorForm, color_hex: e.target.value })
                                    }
                                    className="input h-10 px-2"
                                  />
                                  <input
                                    placeholder="Alias Excel"
                                    value={actorForm.columna_excel_alias || ""}
                                    onChange={(e) =>
                                      setActorForm({
                                        ...actorForm,
                                        columna_excel_alias: e.target.value,
                                      })
                                    }
                                    className="input"
                                    required
                                  />
                                  <select
                                    value={actorForm.tipo_voto || "TOTAL"}
                                    onChange={(e) =>
                                      setActorForm({
                                        ...actorForm,
                                        tipo_voto: e.target.value as any,
                                      })
                                    }
                                    className="input"
                                    title="¿Voto total o diferenciado?"
                                  >
                                    <option value="TOTAL">Voto total</option>
                                    <option value="DIFERENCIADO">Voto diferenciado</option>
                                  </select>
                                  <button
                                    type="submit"
                                    className="btn-primary flex items-center justify-center gap-1"
                                  >
                                    <Plus size={16} /> {actorEdit ? "Actualizar" : "Agregar"}
                                  </button>
                                </form>

                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                  {actores.map((a) => (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span
                                          className="h-4 w-4 rounded-full"
                                          style={{
                                            backgroundColor:
                                              a.color_hex || a.partido?.color_hex || "#ccc",
                                          }}
                                        />
                                        <div>
                                          <p className="font-medium">{a.nombre_visual}</p>
                                          <p className="text-xs text-secondary-500">
                                            {a.tipo_actor === "COALICION"
                                              ? `Coalición: ${a.nombre_coalicion || "—"}`
                                              : a.partido?.siglas || a.tipo_actor}{" "}
                                            ·{" "}
                                            {a.tipo_voto === "DIFERENCIADO"
                                              ? "Voto diferenciado"
                                              : "Voto total"}{" "}
                                            · Excel: {a.columna_excel_alias}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => {
                                            setActorEdit(a.id);
                                            setActorForm(a);
                                          }}
                                          className="rounded p-1 text-secondary-500 hover:bg-secondary-100"
                                        >
                                          <Edit2 size={14} />
                                        </button>
                                        <button
                                          onClick={() => eliminarActor(a.id)}
                                          className="rounded p-1 text-red-500 hover:bg-red-50"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-secondary-500">
                                Selecciona una elección arriba para configurar sus actores.
                              </p>
                            )}
                          </div>
                        </div>
                  </div>
                )}

                {pasoDrawer === 'carga' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
                      <p className="font-bold">¿Qué es una sábana?</p>
                      <p>
                        Es el archivo Excel con los resultados oficiales por casilla. Con ella la IA calcula ganador por sección, votos nulos, participación y estrategia territorial. Si aún no la tienes, descarga la plantilla.
                      </p>
                    </div>
                        <div className="card p-6">
                          {!eleccion ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                              <strong>Paso 1:</strong> selecciona o crea una elección arriba
                              para poder cargar sábanas.
                            </div>
                          ) : (
                            <>
                              <h3 className="mb-2 text-lg font-bold text-secondary-900">
                                Cargar sábanas de votación
                              </h3>
                              <p className="mb-4 text-sm text-secondary-500">
                                Elección: <strong>{eleccion.nombre}</strong> · {actores.length}{" "}
                                actores configurados · {secciones.length} secciones cargadas
                              </p>

                              <div className="mb-6 flex flex-wrap gap-3">
                                <button
                                  onClick={descargarPlantilla}
                                  className="btn-secondary flex items-center gap-2"
                                >
                                  <Download size={16} /> Plantilla para carga
                                </button>
                                <button
                                  onClick={descargarSabana}
                                  disabled={secciones.length === 0}
                                  className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                                  title={
                                    secciones.length === 0 ? "Carga resultados primero" : ""
                                  }
                                >
                                  <Download size={16} /> Sábana completa
                                </button>
                              </div>

                              <form onSubmit={cargarExcel} className="space-y-4">
                                <div>
                                  <label className="label">
                                    Archivo Excel (.xlsx, .xls o .csv)
                                  </label>
                                  <input
                                    type="file"
                                    name="archivo"
                                    accept=".xlsx,.xls,.csv"
                                    className="input"
                                    required
                                  />
                                </div>
                                <button
                                  type="submit"
                                  disabled={importing || actores.length === 0}
                                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                                  title={
                                    actores.length === 0
                                      ? "Configura actores antes de cargar"
                                      : ""
                                  }
                                >
                                  <Upload size={18} />
                                  {importing ? "Procesando..." : "Cargar sábanas"}
                                </button>
                                {actores.length === 0 && (
                                  <p className="text-sm text-amber-700">
                                    Configura al menos un actor/coalición en la pestaña
                                    Catálogos para poder cargar votos.
                                  </p>
                                )}
                              </form>
                            </>
                          )}

                          {importResult && (
                            <div
                              className={`mt-6 rounded-lg border p-4 ${importResult.error ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}
                            >
                              <div className="flex items-start gap-3">
                                {importResult.error ? (
                                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                                ) : (
                                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                                )}
                                <div className="text-sm">
                                  {importResult.error ? (
                                    <p className="font-medium text-red-700">
                                      {importResult.error}
                                    </p>
                                  ) : (
                                    <>
                                      <p className="font-medium text-green-700">
                                        Carga completada: {importResult.insertados} de{" "}
                                        {importResult.filasLeidas} casillas.
                                      </p>
                                      {importResult.errores > 0 && (
                                        <p className="mt-1 text-red-600">
                                          Errores: {importResult.errores}
                                        </p>
                                      )}
                                      {importResult.detallesErrores?.length > 0 && (
                                        <ul className="mt-2 max-h-40 overflow-y-auto list-inside list-disc text-red-600">
                                          {importResult.detallesErrores.map(
                                            (e: any, i: number) => (
                                              <li key={i}>
                                                Fila {e.fila}: {e.error}
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                  </div>
                )}

                {pasoDrawer === 'analisis' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-purple-50 p-4 text-sm text-purple-800">
                      <p className="font-bold">¿Qué verás aquí?</p>
                      <p>
                        Revisa el resumen por sección: ganador, votos, participación, votos nulos y clasificación estratégica. También puedes analizar una sección específica con IA.
                      </p>
                    </div>
                        <div className="space-y-6">
                          <div className="card overflow-hidden">
                            <div className="p-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <h3 className="mb-2 text-lg font-bold text-secondary-900 flex items-center gap-2">
                                    <BarChart3 size={20} className="text-primary-600" /> Resumen
                                    por sección
                                  </h3>
                                  <p className="text-sm text-secondary-500">
                                    {secciones.length > 0
                                      ? `${secciones.length} secciones procesadas`
                                      : modoHistoricoEnAnalisis
                                        ? `${seccionesDesdeHistorico.length} secciones desde Histórico Electoral`
                                        : "0 secciones procesadas"}
                                  </p>
                                </div>
                                {secciones.length === 0 && historicosDisponibles.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={
                                        historicoSeleccion.anio
                                          ? `${historicoSeleccion.tipo_historico || "principal"}|${historicoSeleccion.tipo_eleccion || "ayuntamiento"}|${historicoSeleccion.anio}|${historicoSeleccion.estado_id || ""}|${historicoSeleccion.municipio_id || ""}`
                                          : ""
                                      }
                                      onChange={(e) => {
                                        if (!e.target.value) {
                                          setHistoricoSeleccion({});
                                          setModoHistoricoEnAnalisis(false);
                                          setSeccionesDesdeHistorico([]);
                                          return;
                                        }
                                        const [
                                          tipo_historico,
                                          tipo_eleccion,
                                          anio,
                                          estado_id,
                                          municipio_id,
                                        ] = e.target.value.split("|");
                                        const sel = {
                                          tipo_historico,
                                          tipo_eleccion,
                                          anio: Number(anio),
                                          estado_id: estado_id ? Number(estado_id) : undefined,
                                          municipio_id: municipio_id
                                            ? Number(municipio_id)
                                            : undefined,
                                        };
                                        setHistoricoSeleccion(sel);
                                        const hist = historicosDisponibles.find(
                                          (h) =>
                                            `${h.tipo_historico}|${h.tipo_eleccion}|${h.anio}|${h.estado_id || ""}|${h.municipio_id || ""}` ===
                                            e.target.value,
                                        );
                                        cargarSeccionesDesdeHistorico(hist);
                                      }}
                                      className="input"
                                    >
                                      <option value="">Ver desde histórico electoral...</option>
                                      {historicosDisponibles.map((h) => {
                                        const key = `${h.tipo_historico}|${h.tipo_eleccion}|${h.anio}|${h.estado_id || ""}|${h.municipio_id || ""}`;
                                        const label = `${h.anio} · ${h.tipo_historico === "principal" ? "Principal" : "Complementario"} · ${h.tipo_eleccion.replace(/_/g, " ")}${h.municipio_nombre ? ` · ${h.municipio_nombre}` : ""}`;
                                        return (
                                          <option key={key} value={key}>
                                            {label}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Sección
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Ganador
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Votos
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Lista Nominal
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Participación
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      % Nulos
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Clasificación
                                    </th>
                                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                                      Acciones
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {secciones.length > 0 &&
                                    secciones.map((s) => (
                                      <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                          {s.seccion}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className="h-3 w-3 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  s.actor?.color_hex ||
                                                  s.actor?.partido?.color_hex ||
                                                  "#ccc",
                                              }}
                                            />
                                            <span>
                                              {s.actor?.nombre_visual || "Sin ganador"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {s.total_votos_total.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {s.lista_nominal_total.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {s.porcentaje_participacion.toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {s.porcentaje_votos_nulos.toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${colorClasificacion(s.clasificacion_estrategica)}`}
                                          >
                                            {s.clasificacion_estrategica}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <button
                                            onClick={() => analizarSeccion(s.seccion)}
                                            disabled={analizando === s.seccion}
                                            className="flex items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                                          >
                                            <BrainCircuit size={14} />
                                            {analizando === s.seccion
                                              ? "Analizando..."
                                              : "Analizar con IA"}
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  {secciones.length === 0 &&
                                    modoHistoricoEnAnalisis &&
                                    seccionesDesdeHistorico.map((s: any, idx: number) => (
                                      <tr key={`hist-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                          {s.seccion}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center gap-2">
                                            <span
                                              className="h-3 w-3 rounded-full"
                                              style={{
                                                backgroundColor:
                                                  s.actor_ganador?.color_hex || "#ccc",
                                              }}
                                            />
                                            <span>
                                              {s.actor_ganador?.nombre_visual || "Sin ganador"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {(s.total_votos_total || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {(s.lista_nominal_total || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {(s.porcentaje_participacion || 0).toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                          {(s.porcentaje_votos_nulos || 0).toFixed(2)}%
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${colorClasificacion(s.clasificacion_estrategica)}`}
                                          >
                                            {s.clasificacion_estrategica}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">
                                          <span className="text-xs text-secondary-500">
                                            Histórico
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  {secciones.length === 0 && !modoHistoricoEnAnalisis && (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className="px-4 py-8 text-center text-gray-500"
                                      >
                                        No hay secciones cargadas. Ve a la pestaña{" "}
                                        <strong>Cargar</strong> y sube un Excel, o selecciona un
                                        histórico electoral arriba.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {analisisResult && (
                            <div className="card p-5">
                              <h3 className="mb-3 text-lg font-bold text-secondary-900 flex items-center gap-2">
                                <BrainCircuit size={20} className="text-primary-600" />
                                Análisis IA · Sección {analisisResult.seccion}
                              </h3>
                              <div className="grid gap-4 sm:grid-cols-3">
                                <div className="rounded-lg border border-primary-100 bg-primary-50 p-3">
                                  <p className="text-xs text-secondary-500">
                                    Proyección de votos mínimos
                                  </p>
                                  <p className="text-xl font-bold text-primary-700">
                                    {analisisResult.proyeccion_votos?.toLocaleString() || "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <p className="text-xs text-secondary-500">Nivel de riesgo</p>
                                  <p
                                    className={`text-xl font-bold ${analisisResult.nivel_riesgo === "ALTO" ? "text-red-600" : analisisResult.nivel_riesgo === "BAJO" ? "text-green-600" : "text-yellow-600"}`}
                                  >
                                    {analisisResult.nivel_riesgo}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                  <p className="text-xs text-secondary-500">Actor ganador</p>
                                  <p className="text-xl font-bold text-secondary-800">
                                    {analisisResult.actor_ganador}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <p className="text-sm font-medium text-secondary-900">
                                  Auditoría / Defensa electoral
                                </p>
                                <p className="text-sm text-secondary-600">
                                  {analisisResult.auditoria_nulos_observaciones}
                                </p>
                              </div>
                              <div className="mt-3">
                                <p className="text-sm font-medium text-secondary-900">
                                  Estrategia recomendada
                                </p>
                                <ul className="mt-1 list-inside list-disc text-sm text-secondary-600">
                                  {analisisResult.estrategia?.map((s: string, i: number) => (
                                    <li key={i}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                  </div>
                )}

                {pasoDrawer === 'mapa' && (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                      <p className="font-bold">¿Para qué sirve el mapa?</p>
                      <p>
                        Visualiza geográficamente las secciones coloreadas por ganador. Requiere que hayas cargado sábanas o un histórico electoral.
                      </p>
                    </div>
                        <div className="space-y-4">
                          <div className="card p-4">
                            <h3 className="mb-2 text-lg font-bold text-secondary-900 flex items-center gap-2">
                              <Icon name="mapa" size={20} className="text-primary-600" /> Mapa
                              territorial por ganador
                            </h3>
                            <p className="text-sm text-secondary-500">
                              {eleccion
                                ? `Elección: ${eleccion.nombre} · Se muestran las secciones coloreadas según el actor ganador y clasificación estratégica.`
                                : "Selecciona una elección para ver el mapa."}
                            </p>
                          </div>
                          {eleccion && (
                            <div className="card overflow-hidden p-2">
                              <MapaSecciones geojson={geojsonMapa} cargando={cargandoMapa} />
                            </div>
                          )}
                        </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
