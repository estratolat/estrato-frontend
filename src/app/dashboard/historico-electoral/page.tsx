"use client";

import { useEffect, useMemo, useState, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { resultadosHistoricosApi, mapaApi } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

const MapaCruceHistorico = dynamic(() => import("./MapaCruceHistorico"), {
  ssr: false,
});
const TablaCruceHistorico = dynamic(() => import("./TablaCruceHistorico"), {
  ssr: false,
});
import {
  Upload,
  Search,
  BarChart3,
  Table2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  Settings2,
  Eye,
  ArrowRight,
  ArrowLeft,
  Plus,
  MapPin,
  ChevronRight,
  LayoutDashboard,
  Users,
  Vote,
  TrendingUp,
  Award,
  Target,
  Percent,
  Calendar,
  Map as MapIcon,
  BarChart2,
  BrainCircuit,
  TrendingDown,
  TrendingUpIcon,
} from "lucide-react";

// Tipos
interface Agrupado {
  tipo_historico: string;
  tipo_eleccion: string;
  anio: number;
  estado_id?: number;
  estado_nombre?: string;
  municipio_id?: number;
  municipio_nombre?: string;
  registros: number;
  casillas: number;
  secciones: number;
  total_votos: number;
  lista_nominal?: number;
  participacion_promedio?: number | null;
  partidos: { partido: string; votos: number; candidato?: string }[];
  partido_principal?: string;
  sabana?: any;
}

interface ResumenBackend {
  totalRegistros: number;
  agrupados: Agrupado[];
}

interface Resultado {
  id: number;
  anio: number;
  tipo_historico: string;
  tipo_eleccion: string;
  seccion: string;
  casilla: string;
  estado_id?: number;
  municipio_id?: number;
  partido_ganador: string;
  votos_ganador?: number;
  total_votos?: number;
  votos_nulos?: number;
  lista_nominal?: number;
  participacion_pct?: number;
  desglose_partidos?: {
    partido: string;
    votos: number;
    tipo: "individual" | "coalicion";
    candidato?: string;
  }[];
  sabana_completa?: any;
  partido_principal?: string;
}

const TIPO_HISTORICO_LABEL: Record<string, string> = {
  principal: "Histórico principal",
  complementario: "Histórico complementario",
};

const TIPO_ELECCION_LABEL: Record<string, string> = {
  ayuntamiento: "Ayuntamiento / Presidencia municipal",
  diputado_local: "Diputado local",
  diputado_federal: "Diputado federal",
  senador: "Senador",
  gobernador: "Gobernador",
  presidente_republica: "Presidente de la República",
};

const PARTIDO_COLORS: Record<string, string> = {
  // México
  MORENA: "#b91c1c",
  PAN: "#2563eb",
  PRI: "#16a34a",
  PRD: "#facc15",
  MC: "#f97316",
  PVEM: "#65a30d",
  PT: "#dc2626",
  PANAL: "#06b6d4",
  ROJA: "#b91c1c",
  "AZUL MARINO": "#1e3a8a",
  BLANCA: "#374151",
  AZUL: "#2563eb",
  VERDE: "#16a34a",
  // Colombia
  "PARTIDO CONSERVADOR COLOMBIANO": "#1e40af",
  "PARTIDO CENTRO DEMOCRATICO": "#f97316",
  "PARTIDO CAMBIO RADICAL": "#dc2626",
  "PARTIDO DE LA U - OPCION CIUDADANA": "#b91c1c",
  "PARTIDO ALIANZA VERDE": "#16a34a",
  "DESARROLLO Y BIENESTAR SOCIAL, UN COMPROMISO CON CAPITANEJO": "#7c3aed",
  "COALICION PROGRAMATICA Y POLITICA": "#0d9488",
  "VOTO EN BLANCO": "#9ca3af",
  "MARIO BALLESTEROS": "#2563eb",
  "DEFENSORES DE LA PATRIA": "#0f766e",
  OTRO: "#6b7280",
};

// Coaliciones/Alianzas históricas no son partidos individuales.
// Se detectan por nombres compuestos (guiones bajos, guiones) o palabras clave.
function esPartidoIndividual(nombre: string): boolean {
  if (!nombre || typeof nombre !== "string") return false;
  const n = nombre.trim().toUpperCase();
  if (n.includes("_") || n.includes("-") || n.includes("/")) return false;
  const palabrasCoalicion = [
    "COALICION",
    "COALICIÓN",
    "ALIANZA",
    "CIERRA",
    "CAND_IND",
    "INDEPENDIENTE",
  ];
  if (palabrasCoalicion.some((p) => n.includes(p))) return false;
  return true;
}

type WizardStep =
  | "archivo"
  | "metadatos"
  | "encabezado"
  | "mapeo"
  | "validacion"
  | "importando";
type Vista = "dashboard" | "listado" | "detalle" | "analisis" | "wizard";

interface MapeoState {
  seccion: string;
  casilla: string;
  tipo_casilla: string;
  ext_contigua: string;
  lista_nominal: string;
  votos_nulos: string;
  votos_no_reg: string;
  votos_validos: string;
  total_votos: string;
  participacion_pct: string;
  filtro_municipio_columna: string;
  filtro_municipio: string;
}

interface ActorState {
  id: string;
  nombre: string;
  columna: string;
  tipo: "individual" | "coalicion";
}

const MAPEO_VACIO: MapeoState = {
  seccion: "",
  casilla: "",
  tipo_casilla: "",
  ext_contigua: "",
  lista_nominal: "",
  votos_nulos: "",
  votos_no_reg: "",
  votos_validos: "",
  total_votos: "",
  participacion_pct: "",
  filtro_municipio_columna: "",
  filtro_municipio: "",
};

// Suma los votos de las coaliciones a cada partido que las compone.
// Ej: PAN = PAN + PAN_PRI_PRD + PAN_PRI + PAN_PRD
function consolidarCoalicionesActores(
  actores: {
    partido: string;
    votos: number;
    tipo?: "individual" | "coalicion";
    candidato?: string;
  }[],
): {
  consolidado: {
    partido: string;
    votos: number;
    tipo: "individual" | "coalicion";
    candidato?: string;
  }[];
  detalle: Record<
    string,
    { individual: number; coaliciones: { nombre: string; votos: number }[] }
  >;
} {
  const acumulado = new Map<string, number>();
  const candidatos = new Map<string, string>();
  const individual = new Map<string, number>();
  const coalicionDetalle = new Map<
    string,
    { nombre: string; votos: number }[]
  >();

  for (const actor of actores) {
    if (!actor || !actor.partido || typeof actor.votos !== "number") continue;
    const partes = actor.partido.split("_");
    const esCoalicion = partes.length > 1;

    if (esCoalicion) {
      for (const parte of partes) {
        if (!parte) continue;
        acumulado.set(parte, (acumulado.get(parte) || 0) + actor.votos);
        if (!coalicionDetalle.has(parte)) coalicionDetalle.set(parte, []);
        const lista = coalicionDetalle.get(parte)!;
        lista.push({ nombre: actor.partido, votos: actor.votos });
      }
    } else {
      acumulado.set(
        actor.partido,
        (acumulado.get(actor.partido) || 0) + actor.votos,
      );
      individual.set(
        actor.partido,
        (individual.get(actor.partido) || 0) + actor.votos,
      );
      if (actor.candidato && !candidatos.get(actor.partido)) {
        candidatos.set(actor.partido, actor.candidato);
      }
    }
  }

  const detalle: Record<
    string,
    { individual: number; coaliciones: { nombre: string; votos: number }[] }
  > = {};
  acumulado.forEach((_votos, partido) => {
    detalle[partido] = {
      individual: individual.get(partido) || 0,
      coaliciones: coalicionDetalle.get(partido) || [],
    };
  });

  const consolidado = Array.from(acumulado.entries())
    .map(([partido, votos]) => ({
      partido,
      votos,
      tipo: "individual" as const,
      candidato: candidatos.get(partido),
    }))
    .sort((a, b) => b.votos - a.votos);

  return { consolidado, detalle };
}

const CAMPOS_MAPEO: {
  key: keyof MapeoState;
  label: string;
  required?: boolean;
}[] = [
  { key: "seccion", label: "Sección", required: true },
  { key: "casilla", label: "Casilla", required: true },
  { key: "tipo_casilla", label: "Tipo de casilla" },
  { key: "ext_contigua", label: "Ext. contigua" },
  { key: "lista_nominal", label: "Lista nominal" },
  { key: "votos_nulos", label: "Votos nulos" },
  { key: "votos_no_reg", label: "Votos no registrados" },
  { key: "votos_validos", label: "Votos válidos" },
  { key: "total_votos", label: "Total de votos" },
  { key: "participacion_pct", label: "Participación %" },
  { key: "filtro_municipio_columna", label: "Columna filtro municipio" },
];

function HistoricoElectoralPageInner() {
  // Listado / resumen
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [resumen, setResumen] = useState<ResumenBackend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("dashboard");
  const [historicoSeleccionado, setHistoricoSeleccionado] =
    useState<Agrupado | null>(null);
  const [filtros, setFiltros] = useState({
    tipo_historico: "",
    tipo_eleccion: "",
    anio: "",
    seccion: "",
  });

  // Partido seleccionado para el análisis predictivo 2027
  const [actorPredictivo, setActorPredictivo] = useState<string>("");

  // Rival / enemigo a vencer en 2027
  const [rivalPredictivo, setRivalPredictivo] = useState<string>("");

  // Múltiples rivales para proyectos tipo Colombia (Ballesteros)
  const [rivalesPredictivo, setRivalesPredictivo] = useState<string[]>([]);

  // Actor nuevo que no aparece en históricos (candidato nuevo en Colombia)
  const [actorNuevo, setActorNuevo] = useState<{ nombre: string; votos2027: string }>({
    nombre: "",
    votos2027: "",
  });

  // Actor principal manual para proyectos donde el candidato va por partido nuevo y no tiene histórico (Ballesteros)
  const [actorManual, setActorManual] = useState<{ nombre: string; votos2027: string }>({
    nombre: "",
    votos2027: "",
  });

  // Rival para comparar las alianzas (por defecto el rival principal)
  const [rivalAlianzas, setRivalAlianzas] = useState<string>("");

  // Alianzas simuladas para comparar escenarios 2027
  interface AlianzaSimulada {
    id: string;
    nombre: string;
    partidos: string[];
  }
  const [alianzas, setAlianzas] = useState<AlianzaSimulada[]>([]);

  // Detectar tenant Ballesteros/Colombia para habilitar modo múltiples rivales
  const [tenantSlug, setTenantSlug] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const slug = localStorage.getItem("tenantSlug") || "";
      setTenantSlug(slug);
      if (slug === "mario-bellesteros") {
        setActorManual({ nombre: "Movimiento de Salvación Nacional", votos2027: "" });
        setActorPredictivo("");
      }
    }
  }, []);
  const modoBallesteros = tenantSlug === "mario-bellesteros";

  // Análisis territorial / cruce histórico
  const [cruceData, setCruceData] = useState<any | null>(null);
  const [cruceSeccionesINE, setCruceSeccionesINE] = useState<any[]>([]);
  const [cruceLoading, setCruceLoading] = useState(false);
  const [cruceError, setCruceError] = useState<string | null>(null);
  const [subVistaAnalisis, setSubVistaAnalisis] = useState<"mapa" | "tabla">(
    "mapa",
  );

  // Wizard
  const [step, setStep] = useState<WizardStep>("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [metadatos, setMetadatos] = useState({
    tipo_historico: "principal",
    tipo_eleccion: "ayuntamiento",
    anio: "",
    estado_id: "",
    estado_nombre: "",
    municipio_id: "",
    municipio_nombre: "",
    distrito_local_id: "",
    distrito_federal_id: "",
    saltar_lineas: "0",
    partido_principal: "",
  });
  const [mapeo, setMapeo] = useState<MapeoState>(MAPEO_VACIO);
  const [actores, setActores] = useState<ActorState[]>([]);
  const [modoSabana, setModoSabana] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [sugerencia, setSugerencia] = useState<any | null>(null);
  const [sugerenciaLoading, setSugerenciaLoading] = useState(false);
  const [rawLines, setRawLines] = useState<any | null>(null);
  const [rawLoading, setRawLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
    try {
      const guardado = sessionStorage.getItem("estrato_wizard_historico");
      if (guardado) {
        const parsed = JSON.parse(guardado);
        const stepGuardado = parsed.step || "archivo";
        if (!archivo && stepGuardado !== "archivo") {
          setStep("archivo");
        } else if (parsed.step) {
          setStep(parsed.step);
        }
        if (parsed.metadatos) setMetadatos(parsed.metadatos);
        if (parsed.mapeo) setMapeo(parsed.mapeo);
        if (parsed.actores) setActores(parsed.actores);
        if (typeof parsed.modoSabana === "boolean")
          setModoSabana(parsed.modoSabana);
      }
    } catch {
      // ignorar errores de parseo
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const data = {
      step,
      metadatos,
      mapeo,
      actores,
      modoSabana,
    };
    sessionStorage.setItem("estrato_wizard_historico", JSON.stringify(data));
  }, [step, metadatos, mapeo, actores, modoSabana]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, sum] = await Promise.all([
        resultadosHistoricosApi.getAll({}),
        resultadosHistoricosApi.getResumen(),
      ]);
      const resultadosArray = Array.isArray(res.data) ? res.data : [];
      const resumenObj =
        sum.data && typeof sum.data === "object" && "agrupados" in sum.data
          ? (sum.data as ResumenBackend)
          : null;
      setResultados(resultadosArray);
      setResumen(resumenObj);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Error al cargar datos históricos",
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarCruce = async () => {
    if (cruceData) return; // ya cargado
    try {
      setCruceLoading(true);
      setCruceError(null);
      const { data } = await resultadosHistoricosApi.getCruce({
        tipo_eleccion: "ayuntamiento",
        tipo_historico: "principal",
      });
      setCruceData(data);

      // Obtener estado/municipio del primer histórico disponible
      const referencia = (resultados || []).find(
        (r) => r.estado_id && r.municipio_id,
      );
      const estadoId = referencia?.estado_id ?? 11;
      const municipioId = referencia?.municipio_id ?? 14;
      const { data: secciones } = await mapaApi.getSeccionesINE(
        estadoId,
        municipioId,
      );
      setCruceSeccionesINE(secciones || []);
    } catch (err: any) {
      setCruceError(
        err.response?.data?.message || "Error al cargar cruce histórico",
      );
    } finally {
      setCruceLoading(false);
    }
  };

  const agrupadosFiltrados = useMemo(() => {
    if (!resumen?.agrupados) return [];
    return resumen.agrupados.filter((g) => {
      if (filtros.tipo_historico && g.tipo_historico !== filtros.tipo_historico)
        return false;
      if (filtros.tipo_eleccion && g.tipo_eleccion !== filtros.tipo_eleccion)
        return false;
      if (filtros.anio && String(g.anio) !== filtros.anio) return false;
      return true;
    });
  }, [resumen, filtros]);

  // Wizard helpers
  const buildFormData = (conMapeo = true, reemplazar = false) => {
    const formData = new FormData();
    if (archivo) formData.append("archivo", archivo);
    formData.append("tipo_historico", metadatos.tipo_historico);
    formData.append("tipo_eleccion", metadatos.tipo_eleccion);
    formData.append("anio", metadatos.anio);
    if (metadatos.estado_id) formData.append("estado_id", metadatos.estado_id);
    if (metadatos.estado_nombre)
      formData.append("estado_nombre", metadatos.estado_nombre);
    if (metadatos.municipio_id)
      formData.append("municipio_id", metadatos.municipio_id);
    if (metadatos.municipio_nombre)
      formData.append("municipio_nombre", metadatos.municipio_nombre);
    if (metadatos.distrito_local_id)
      formData.append("distrito_local_id", metadatos.distrito_local_id);
    if (metadatos.distrito_federal_id)
      formData.append("distrito_federal_id", metadatos.distrito_federal_id);
    formData.append(
      "saltar_lineas",
      String(Number(metadatos.saltar_lineas || 0) + 1),
    );
    if (metadatos.partido_principal)
      formData.append("partido_principal", metadatos.partido_principal);
    if (reemplazar) formData.append("reemplazar", "true");
    if (conMapeo) {
      const mapeoClean: any = {};
      Object.entries(mapeo).forEach(([k, v]) => {
        if (v) mapeoClean[k] = v;
      });
      formData.append("mapeo", JSON.stringify(mapeoClean));
      const actoresClean = modoSabana
        ? []
        : actores
            .filter((a) => a.nombre && a.columna)
            .map((a) => ({
              nombre: a.nombre,
              columna: a.columna,
              tipo: a.tipo,
            }));
      formData.append("actores", JSON.stringify(actoresClean));
    }
    return formData;
  };

  const ejecutarPreview = async (conMapeo = true) => {
    if (!archivo) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { data } = await resultadosHistoricosApi.preview(
        buildFormData(conMapeo),
      );
      setPreview(data);
    } catch (err: any) {
      const backendMessage =
        err.response?.data?.message || err.response?.data?.error;
      const validationErrors = Array.isArray(err.response?.data?.message)
        ? err.response?.data?.message
            .map((m: any) =>
              typeof m === "string"
                ? m
                : `${m.property}: ${Object.values(m.constraints || {}).join(", ")}`,
            )
            .join("; ")
        : null;
      const detail =
        validationErrors ||
        backendMessage ||
        err.message ||
        "Error al generar vista previa";
      setPreviewError(
        `${detail}${err.response?.status ? ` (HTTP ${err.response.status})` : ""}`,
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const cargarExploracion = async (f: File) => {
    setRawLoading(true);
    setSugerenciaLoading(true);
    setPreviewError(null);
    try {
      const formDataRaw = new FormData();
      formDataRaw.append("archivo", f);
      const [{ data: rawData }, { data: sugerenciaData }] = await Promise.all([
        resultadosHistoricosApi.previewRaw(formDataRaw),
        resultadosHistoricosApi.sugerirMapeo(formDataRaw),
      ]);

      setRawLines(rawData);
      setSugerencia(sugerenciaData);

      if (sugerenciaData?.sugerencia) {
        const s = sugerenciaData.sugerencia;
        setMapeo({
          ...MAPEO_VACIO,
          seccion: s.seccion || "",
          casilla: s.casilla || "",
          tipo_casilla: s.tipo_casilla || "",
          ext_contigua: s.ext_contigua || "",
          lista_nominal: s.lista_nominal || "",
          votos_nulos: s.votos_nulos || "",
          votos_no_reg: s.votos_no_reg || "",
          votos_validos: s.votos_validos || "",
          total_votos: s.total_votos || "",
          participacion_pct: s.participacion_pct || "",
          filtro_municipio_columna: s.filtro_municipio_columna || "",
        });
        setActores(
          (s.actores || []).map((a: any) => ({
            id: Math.random().toString(36).slice(2),
            nombre: a.nombre,
            columna: a.columna,
            tipo: a.tipo,
          })),
        );
      }

      const filaDetectada =
        rawData?.encabezadoDetectado?.fila ?? sugerenciaData?.fila;
      if (filaDetectada) {
        setMetadatos((prev) => ({
          ...prev,
          saltar_lineas: String(filaDetectada - 1),
        }));
      }
    } catch (err: any) {
      const detail =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Error al explorar archivo";
      setPreviewError(
        `${detail}${err.response?.status ? ` (HTTP ${err.response.status})` : ""}`,
      );
    } finally {
      setRawLoading(false);
      setSugerenciaLoading(false);
    }
  };

  const cargarSugerenciaMapeo = async () => {
    if (!archivo) return;
    await cargarExploracion(archivo);
  };

  const handleImportar = async (reemplazar = false) => {
    if (!archivo) return;
    setImporting(true);
    setImportResult(null);
    try {
      const { data } = await resultadosHistoricosApi.importar(
        buildFormData(true, reemplazar),
      );
      setImportResult(data);
      if (!data.error) {
        await cargarDatos();
        if (data.exitosos > 0 || reemplazar) {
          try {
            sessionStorage.removeItem("estrato_wizard_historico");
          } catch {
            // ignorar
          }
        }
      }
    } catch (err: any) {
      setImportResult({
        error: err.response?.data?.message || "Error al importar",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleEliminarLote = async (g: Agrupado) => {
    if (
      !confirm(
        `¿Eliminar permanentemente el histórico ${TIPO_ELECCION_LABEL[g.tipo_eleccion]} ${g.anio}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      const payload: any = {
        tipo_historico: g.tipo_historico,
        tipo_eleccion: g.tipo_eleccion,
        anio: g.anio,
      };
      if (g.estado_id !== undefined) payload.estado_id = g.estado_id;
      if (g.municipio_id !== undefined) payload.municipio_id = g.municipio_id;
      await resultadosHistoricosApi.eliminarLote(payload);
      await cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.message || "Error al eliminar lote");
    }
  };

  const resetWizard = () => {
    setStep("archivo");
    setArchivo(null);
    setMetadatos({
      tipo_historico: "principal",
      tipo_eleccion: "ayuntamiento",
      anio: "",
      estado_id: "",
      estado_nombre: "",
      municipio_id: "",
      municipio_nombre: "",
      distrito_local_id: "",
      distrito_federal_id: "",
      saltar_lineas: "0",
      partido_principal: "",
    });
    setMapeo(MAPEO_VACIO);
    setActores([]);
    setModoSabana(false);
    setPreview(null);
    setPreviewError(null);
    setImportResult(null);
    setImporting(false);
    setSugerencia(null);
    setRawLines(null);
    setPreview(null);
    try {
      sessionStorage.removeItem("estrato_wizard_historico");
    } catch {
      // ignorar
    }
  };

  const columnasDisponibles = useMemo(() => {
    if (rawLines?.lineas?.length) {
      const headerLine = Number(metadatos.saltar_lineas || 0) + 1;
      const linea = rawLines.lineas.find((l: any) => l.numero === headerLine);
      if (linea?.columnas?.length) return linea.columnas;
    }
    if (rawLines?.encabezadoDetectado?.columnas?.length)
      return rawLines.encabezadoDetectado.columnas;
    return preview?.columnas || [];
  }, [rawLines, metadatos.saltar_lineas, preview]);
  const columnasUsadas = useMemo(() => {
    const usadas = new Set<string>();
    Object.values(mapeo).forEach((v) => v && usadas.add(v));
    actores.forEach((a) => a.columna && usadas.add(a.columna));
    return usadas;
  }, [mapeo, actores]);

  const COLUMNAS_NO_ACTORES = new Set([
    "ID_ESTADO",
    "NOMBRE_ESTADO",
    "ID_DISTRITO_FEDERAL",
    "DISTRITO_FEDERAL",
    "ID_DISTRITO_LOCAL",
    "DISTRITO_LOCAL",
    "ID_MUNICIPIO",
    "MUNICIPIO",
    "SECCION",
    "CASILLA",
    "ID_CASILLA",
    "IDCASILLA",
    "TIPO_CASILLA",
    "UBICACION",
    "LISTA_NOMINAL",
    "LISTA_NOMINAL_CASILLA",
    "NUM_VOTOS_NULOS",
    "NUM_VOTOS_NO_REGISTRADOS",
    "NUM_VOTOS_VALIDOS",
    "TOTAL_VOTOS",
    "VOTOS_NULOS",
    "VOTOS_NO_REGISTRADOS",
    "VOTOS_VALIDOS",
    "PARTICIPACION",
    "PARTICIPACION_CONTABILIZADA",
    "PORC_PARTICIPACION",
    "ESTATUS_CASILLA",
    "ESTATUS",
    "COTEJADA",
    "RECONTADA",
    "CONTABILIZADA",
    "TRIBUNAL",
    "OBSERVACIONES",
    "RUTA_ACTA",
    "ACTA_PREP",
    "ID_CENTRO_VOTACION",
    "CENTRO_VOTACION",
    "EXT_CONTIGUA",
    "EXTCONTIGUA",
  ]);

  const PARTIDOS_CONOCIDOS = new Set([
    "PAN",
    "PRI",
    "PRD",
    "PVEM",
    "PT",
    "MC",
    "MORENA",
    "PANAL",
    "PES",
    "RSP",
    "FXM",
    "NAEM",
    "PCM",
    "PAN_PRI_PRD",
    "PRI_PRD",
    "PAN_PRI",
    "PAN_PRD",
    "PVEM_PT_MORENA",
    "PVEM_PT",
    "PT_MORENA",
    "PVEM_MORENA",
  ]);

  const normalizarNombreColumna = (nombre: string): string => {
    return nombre
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^A-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const sugerirActorDesdeColumna = (
    columna: string,
  ): { nombre: string; tipo: "individual" | "coalicion" } => {
    const norm = normalizarNombreColumna(columna);
    let tipo: "individual" | "coalicion" = "individual";
    if (PARTIDOS_CONOCIDOS.has(norm)) {
      tipo = norm.includes("_") ? "coalicion" : "individual";
    } else if (
      /^[A-Z_\-]{2,40}$/.test(norm) &&
      (norm.includes("_") || norm.includes("-"))
    ) {
      tipo = "coalicion";
    }
    const nombre = columna.replace(/^P[_\.]/i, "").trim();
    return { nombre, tipo };
  };

  const valorMuestra = (columna?: string): string | null => {
    if (!columna || !rawLines?.lineas) return null;
    const headerLine = Number(metadatos.saltar_lineas) + 1;
    for (const l of rawLines.lineas) {
      if (l.numero <= headerLine) continue;
      const idx = l.columnas?.indexOf(columna);
      if (idx === undefined || idx < 0) continue;
      const v = l.columnas[idx];
      if (v && v.trim() !== "" && v.trim() !== "\\N") return v.trim();
    }
    return null;
  };

  const valoresUnicosColumna = (columna?: string): string[] => {
    if (!columna || !rawLines?.lineas) return [];
    const headerLine = Number(metadatos.saltar_lineas) + 1;
    const unicos = new Set<string>();
    for (const l of rawLines.lineas) {
      if (l.numero <= headerLine) continue;
      const idx = l.columnas?.indexOf(columna);
      if (idx >= 0) {
        const v = l.columnas[idx]?.trim();
        if (v) unicos.add(v);
      }
    }
    return Array.from(unicos).sort((a, b) => a.localeCompare(b));
  };

  const sugerirActores = () => {
    const sugeridos = columnasDisponibles
      .filter((c: string) => {
        if (columnasUsadas.has(c)) return false;
        const u = c.toUpperCase().trim();
        if (COLUMNAS_NO_ACTORES.has(u)) return false;
        return PARTIDOS_CONOCIDOS.has(u) || /^[A-Z_]{2,25}$/.test(u);
      })
      .map((c: string) => ({
        id: Math.random().toString(36).slice(2),
        nombre: c,
        columna: c,
        tipo: c.toUpperCase().trim().includes("_")
          ? ("coalicion" as const)
          : ("individual" as const),
      }));
    setActores((prev) => [...prev, ...sugeridos]);
  };

  const addActor = () => {
    setActores((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        nombre: "",
        columna: "",
        tipo: "individual",
      },
    ]);
  };

  const updateActor = (id: string, campo: keyof ActorState, valor: string) => {
    setActores((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)),
    );
  };

  const removeActor = (id: string) => {
    setActores((prev) => prev.filter((a) => a.id !== id));
  };

  const mapeoEsValido =
    mapeo.seccion &&
    mapeo.casilla &&
    (modoSabana || actores.filter((a) => a.nombre && a.columna).length > 0);

  // Navegación a detalle
  const abrirDetalle = (g: Agrupado) => {
    setHistoricoSeleccionado(g);
    setVista("detalle");
  };

  // Render pasos
  const renderWizard = () => {
    const steps = [
      { key: "archivo", label: "Archivo" },
      { key: "metadatos", label: "Metadatos" },
      { key: "encabezado", label: "Encabezado" },
      { key: "mapeo", label: "Mapeo" },
      { key: "validacion", label: "Validación" },
      { key: "importando", label: "Importar" },
    ];

    return (
      <div className="card p-6">
        {/* Indicador de pasos */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
          {steps.map((s, idx) => (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  step === s.key
                    ? "bg-primary-600 text-white"
                    : idx < steps.findIndex((x) => x.key === step)
                      ? "bg-green-100 text-green-700"
                      : "bg-secondary-100 text-secondary-500"
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`font-medium ${
                  step === s.key
                    ? "text-primary-700"
                    : idx < steps.findIndex((x) => x.key === step)
                      ? "text-green-700"
                      : "text-secondary-400"
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && (
                <span className="text-secondary-300">/</span>
              )}
            </div>
          ))}
        </div>

        {step === "archivo" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">
                1. Selecciona la sábana
              </h3>
              <p className="text-sm text-secondary-500">
                Sube el archivo CSV tal cual lo proporciona el Instituto
                Electoral.
              </p>
            </div>

            <div className="rounded-lg border-2 border-dashed border-secondary-300 bg-secondary-50 p-8 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-secondary-400" />
              <p className="mt-3 text-sm font-medium text-secondary-700">
                {archivo
                  ? archivo.name
                  : "Arrastra un CSV o haz clic para seleccionar"}
              </p>
              <p className="mt-1 text-xs text-secondary-500">
                Formatos: CSV con encabezado en cualquier línea
              </p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-700 shadow-sm hover:bg-secondary-100">
                <Upload size={16} />
                Elegir archivo
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0] || null;
                    setArchivo(f);
                    if (f) {
                      await cargarExploracion(f);
                    }
                  }}
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                disabled={!archivo || rawLoading}
                onClick={() => setStep("metadatos")}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {rawLoading ? "Analizando..." : "Continuar"}{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "metadatos" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">
                2. Define el histórico
              </h3>
              <p className="text-sm text-secondary-500">
                Indica qué elección representa y el territorio al que pertenece.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Tipo de histórico *</label>
                <select
                  value={metadatos.tipo_historico}
                  onChange={(e) =>
                    setMetadatos({
                      ...metadatos,
                      tipo_historico: e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="principal">
                    Principal (cargo del proyecto)
                  </option>
                  <option value="complementario">
                    Complementario (otros cargos)
                  </option>
                </select>
                <p className="mt-1 text-xs text-secondary-500">
                  {metadatos.tipo_historico === "principal"
                    ? "Últimas 3 elecciones del cargo del proyecto"
                    : "Otros cargos para cruces y análisis"}
                </p>
              </div>

              <div>
                <label className="label">Tipo de elección *</label>
                <select
                  value={metadatos.tipo_eleccion}
                  onChange={(e) =>
                    setMetadatos({
                      ...metadatos,
                      tipo_eleccion: e.target.value,
                    })
                  }
                  className="input"
                >
                  {Object.entries(TIPO_ELECCION_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Año *</label>
                <input
                  type="number"
                  value={metadatos.anio}
                  onChange={(e) =>
                    setMetadatos({ ...metadatos, anio: e.target.value })
                  }
                  placeholder="2024"
                  className="input"
                />
              </div>

              <div>
                <label className="label">ID Estado</label>
                <input
                  type="number"
                  value={metadatos.estado_id}
                  onChange={(e) =>
                    setMetadatos({ ...metadatos, estado_id: e.target.value })
                  }
                  placeholder="11"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Nombre del estado</label>
                <input
                  type="text"
                  value={metadatos.estado_nombre}
                  onChange={(e) =>
                    setMetadatos({
                      ...metadatos,
                      estado_nombre: e.target.value,
                    })
                  }
                  placeholder="Guanajuato"
                  className="input"
                />
              </div>

              <div>
                <label className="label">ID Municipio</label>
                <input
                  type="number"
                  value={metadatos.municipio_id}
                  onChange={(e) =>
                    setMetadatos({ ...metadatos, municipio_id: e.target.value })
                  }
                  placeholder="14"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Nombre del municipio</label>
                <input
                  type="text"
                  value={metadatos.municipio_nombre}
                  onChange={(e) =>
                    setMetadatos({
                      ...metadatos,
                      municipio_nombre: e.target.value,
                    })
                  }
                  placeholder="Dolores Hidalgo"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Distrito local</label>
                <input
                  type="number"
                  value={metadatos.distrito_local_id}
                  onChange={(e) =>
                    setMetadatos({
                      ...metadatos,
                      distrito_local_id: e.target.value,
                    })
                  }
                  className="input"
                />
              </div>

              <div>
                <label className="label">Distrito federal</label>
                <input
                  type="number"
                  value={metadatos.distrito_federal_id}
                  onChange={(e) =>
                    setMetadatos({
                      ...metadatos,
                      distrito_federal_id: e.target.value,
                    })
                  }
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep("archivo")}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Atrás
              </button>
              <button
                disabled={!metadatos.anio}
                onClick={() => setStep("encabezado")}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "encabezado" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">
                3. Explorar archivo y elegir encabezado
              </h3>
              <p className="text-sm text-secondary-500">
                Las sábanas oficiales suelen tener metadatos antes del
                encabezado real. Buscá la primera fila con los nombres de
                columna (SECCION, ID_CASILLA, etc.) y hacé clic en "Usar como
                encabezado".
              </p>
            </div>

            {rawLoading && (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            )}

            {previewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {previewError}
              </div>
            )}

            {!rawLoading && rawLines && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border border-secondary-200 bg-white px-4 py-2 text-sm">
                    <span className="text-secondary-500">
                      Líneas significativas:
                    </span>{" "}
                    <strong className="text-secondary-900">
                      {rawLines.totalLineas?.toLocaleString()}
                    </strong>
                  </div>
                  {rawLines.encabezadoDetectado && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
                      Encabezado sugerido: fila{" "}
                      {rawLines.encabezadoDetectado.fila} (
                      {rawLines.encabezadoDetectado.columnas?.length} columnas)
                    </div>
                  )}
                  <div className="rounded-lg border border-secondary-200 bg-white px-4 py-2 text-sm">
                    <span className="text-secondary-500">
                      Encabezado elegido:
                    </span>{" "}
                    <strong className="text-secondary-900">
                      {Number(metadatos.saltar_lineas) + 1}
                    </strong>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary-100 text-secondary-700">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Contenido</th>
                        <th className="px-3 py-2 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {rawLines.lineas?.map((l: any) => {
                        const elegida =
                          Number(metadatos.saltar_lineas) + 1 === l.numero;
                        const sugerida =
                          rawLines.encabezadoDetectado?.fila === l.numero;
                        return (
                          <tr
                            key={l.numero}
                            className={`${elegida ? "bg-primary-50" : sugerida ? "bg-green-50" : ""}`}
                          >
                            <td className="px-3 py-2 align-top font-medium whitespace-nowrap">
                              {l.numero}
                              {sugerida && (
                                <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                                  Sugerida
                                </span>
                              )}
                              {elegida && (
                                <span className="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700">
                                  Elegida
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div
                                className="max-w-xl truncate text-secondary-700"
                                title={l.contenido}
                              >
                                {l.contenido}
                              </div>
                              {l.columnas?.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {l.columnas.slice(0, 12).map((c: string) => (
                                    <span
                                      key={c}
                                      className="rounded border border-secondary-200 bg-white px-1.5 py-0.5 text-[10px] text-secondary-600"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                  {l.columnas.length > 12 && (
                                    <span className="text-[10px] text-secondary-400">
                                      +{l.columnas.length - 12}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-center">
                              <button
                                onClick={() =>
                                  setMetadatos({
                                    ...metadatos,
                                    saltar_lineas: String(l.numero - 1),
                                  })
                                }
                                className={`rounded px-2.5 py-1 text-xs font-medium ${
                                  elegida
                                    ? "bg-primary-600 text-white"
                                    : "bg-white text-secondary-700 hover:bg-secondary-100 border border-secondary-200"
                                }`}
                              >
                                {elegida ? "Elegida" : "Usar como encabezado"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep("metadatos")}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Atrás
              </button>
              <button
                disabled={!rawLines?.lineas?.length}
                onClick={() => {
                  setStep("mapeo");
                  cargarSugerenciaMapeo();
                }}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "mapeo" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-secondary-900">
                  4. Revisar mapeo automático
                </h3>
                <p className="text-sm text-secondary-500">
                  Corregí columnas, filtro de municipio y actores. La vista
                  previa rápida te permite probar sin salir de este paso.
                </p>
              </div>
              <button
                disabled={!mapeo.seccion || !mapeo.casilla || previewLoading}
                onClick={() => ejecutarPreview(true)}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                <Eye size={16} />{" "}
                {previewLoading ? "Cargando..." : "Vista previa rápida"}
              </button>
            </div>

            {preview && !previewLoading && (
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Leídas</p>
                  <p className="text-lg font-bold text-secondary-900">
                    {preview.totalFilas?.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Válidas</p>
                  <p
                    className={`text-lg font-bold ${preview.exitosas > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {preview.exitosas?.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Omitidas filtro</p>
                  <p className="text-lg font-bold text-yellow-600">
                    {preview.omitidasFiltro?.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Errores</p>
                  <p
                    className={`text-lg font-bold ${preview.errores > 0 ? "text-red-600" : "text-secondary-900"}`}
                  >
                    {preview.errores?.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">
                    Actores con votos
                  </p>
                  <p className="text-lg font-bold text-secondary-900">
                    {Object.keys(preview.totales || {}).length}
                  </p>
                </div>
              </div>
            )}

            {preview?.filtroSinCoincidencias && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle size={16} /> El filtro de municipio no coincidió
                  con ninguna fila
                </p>
                <p className="mt-1">
                  Columna: <strong>{mapeo.filtro_municipio_columna}</strong> —
                  Filtro: <strong>{mapeo.filtro_municipio}</strong>
                </p>
                {preview.valoresUnicosFiltro?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-secondary-600">
                      Valores encontrados:
                    </span>
                    {preview.valoresUnicosFiltro.map((v: string) => (
                      <button
                        key={v}
                        onClick={() =>
                          setMapeo({ ...mapeo, filtro_municipio: v })
                        }
                        className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {preview?.actoresSinVotos && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-medium flex items-center gap-2">
                  <AlertCircle size={16} /> Ningún actor acumuló votos
                </p>
                <p className="mt-1">
                  Revisá que las columnas de actores sean numéricas y no de
                  porcentaje (las columnas P_ son porcentajes, no votos).
                </p>
              </div>
            )}

            {sugerenciaLoading && (
              <div className="flex h-32 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            )}

            {!sugerenciaLoading && (
              <>
                {/* Tarjeta 1: Campos de control */}
                <div className="rounded-lg border border-secondary-200 bg-white p-4">
                  <h4 className="mb-3 font-bold text-secondary-900">
                    Campos de control
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {CAMPOS_MAPEO.filter(
                      (c) => c.key !== "filtro_municipio_columna",
                    ).map((campo) => (
                      <div key={campo.key}>
                        <label className="label">
                          {campo.label}
                          {campo.required && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </label>
                        <select
                          value={mapeo[campo.key]}
                          onChange={(e) =>
                            setMapeo({ ...mapeo, [campo.key]: e.target.value })
                          }
                          className="input"
                        >
                          <option value="">— Sin mapear —</option>
                          {columnasDisponibles.map((c: string) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {mapeo[campo.key] && (
                          <p className="mt-1 text-xs text-secondary-400">
                            Ej: {valorMuestra(mapeo[campo.key]) || "—"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tarjeta 2: Filtro de municipio */}
                <div className="rounded-lg border border-secondary-200 bg-white p-4">
                  <h4 className="mb-3 font-bold text-secondary-900">
                    Filtro de municipio
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Columna de filtro</label>
                      <select
                        value={mapeo.filtro_municipio_columna}
                        onChange={(e) =>
                          setMapeo({
                            ...mapeo,
                            filtro_municipio_columna: e.target.value,
                          })
                        }
                        className="input"
                      >
                        <option value="">— Sin filtro —</option>
                        {columnasDisponibles.map((c: string) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Texto del municipio</label>
                      <input
                        type="text"
                        value={mapeo.filtro_municipio}
                        onChange={(e) =>
                          setMapeo({
                            ...mapeo,
                            filtro_municipio: e.target.value,
                          })
                        }
                        placeholder="DOLORES HIDALGO"
                        className="input"
                      />
                      <p className="mt-1 text-xs text-secondary-500">
                        Podés poner varios valores separados por coma.
                      </p>
                    </div>
                  </div>
                  {mapeo.filtro_municipio_columna && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-secondary-700">
                        Valores únicos encontrados (hacé clic para usar):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {valoresUnicosColumna(mapeo.filtro_municipio_columna)
                          .slice(0, 20)
                          .map((v: string) => (
                            <button
                              key={v}
                              onClick={() =>
                                setMapeo({ ...mapeo, filtro_municipio: v })
                              }
                              className={`rounded border px-1.5 py-0.5 text-xs ${
                                mapeo.filtro_municipio &&
                                v
                                  .toUpperCase()
                                  .includes(
                                    mapeo.filtro_municipio.toUpperCase(),
                                  )
                                  ? "border-primary-300 bg-primary-50 text-primary-700"
                                  : "border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tarjeta 3: Actores */}
                <div className="rounded-lg border border-secondary-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-secondary-900">
                      Actores (partidos / coaliciones)
                    </h4>
                    <div className="flex gap-2">
                      <button
                        onClick={sugerirActores}
                        className="btn-secondary flex items-center gap-1 text-xs"
                      >
                        <Settings2 size={14} /> Re-sugerir
                      </button>
                      <button
                        onClick={addActor}
                        className="btn-primary flex items-center gap-1 text-xs"
                      >
                        <Plus size={14} /> Agregar actor
                      </button>
                    </div>
                  </div>

                  {actores.length === 0 && (
                    <p className="text-sm text-secondary-500">
                      No hay actores seleccionados. En este modo se importará la
                      sábana completa (sin calcular ganador).
                    </p>
                  )}

                  <div className="space-y-2">
                    {columnasDisponibles
                      .filter((c: string) => !Object.values(mapeo).includes(c))
                      .map((c: string) => {
                        const actor = actores.find((a) => a.columna === c);
                        const u = c.toUpperCase().trim();
                        const esPorcentaje =
                          u.startsWith("P_") || u.startsWith("P.");
                        if (esPorcentaje) return null;
                        const sugerencia = sugerirActorDesdeColumna(c);
                        return (
                          <div
                            key={c}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary-100 bg-secondary-50 p-2"
                          >
                            <input
                              type="checkbox"
                              checked={!!actor}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActores((prev) => [
                                    ...prev,
                                    {
                                      id: Math.random().toString(36).slice(2),
                                      nombre: sugerencia.nombre,
                                      columna: c,
                                      tipo: sugerencia.tipo,
                                    },
                                  ]);
                                } else {
                                  setActores((prev) =>
                                    prev.filter((a) => a.columna !== c),
                                  );
                                }
                              }}
                              className="h-4 w-4 rounded border-secondary-300 text-primary-600"
                            />
                            <span className="min-w-[120px] text-sm font-medium text-secondary-900">
                              {c}
                            </span>
                            {actor && (
                              <>
                                <input
                                  type="text"
                                  value={actor.nombre}
                                  onChange={(e) =>
                                    updateActor(
                                      actor.id,
                                      "nombre",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Nombre"
                                  className="input w-32 text-xs"
                                />
                                <select
                                  value={actor.tipo}
                                  onChange={(e) =>
                                    updateActor(
                                      actor.id,
                                      "tipo",
                                      e.target.value,
                                    )
                                  }
                                  className="input w-32 text-xs"
                                >
                                  <option value="individual">Individual</option>
                                  <option value="coalicion">Coalición</option>
                                </select>
                              </>
                            )}
                            <span className="text-xs text-secondary-400">
                              Ej: {valorMuestra(c) || "—"}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {metadatos.tipo_historico === "principal" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-medium">
                      Partido / actor principal del proyecto
                    </p>
                    <select
                      value={metadatos.partido_principal}
                      onChange={(e) =>
                        setMetadatos({
                          ...metadatos,
                          partido_principal: e.target.value,
                        })
                      }
                      className="input mt-2"
                    >
                      <option value="">— Seleccionar actor principal —</option>
                      {actores
                        .filter((a) => a.tipo === "individual")
                        .map((a) => (
                          <option key={a.columna} value={a.nombre}>
                            {a.nombre}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-amber-700">
                      Es el partido de tu proyecto. Puede no ser el ganador ni
                      haber participado individualmente. Sirve para cruzar con
                      los demás datos.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep("encabezado")}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Atrás
              </button>
              <button
                disabled={!mapeoEsValido || sugerenciaLoading}
                onClick={() => {
                  ejecutarPreview(true);
                  setStep("validacion");
                }}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Verificar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "validacion" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">
                5. Resumen y validación
              </h3>
              <p className="text-sm text-secondary-500">
                Revisa los totales y errores antes de guardar. Nada se importa
                aún.
              </p>
            </div>

            {previewLoading && (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            )}

            {previewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {previewError}
              </div>
            )}

            {!previewLoading && preview && (
              <>
                {preview.modoSabana && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                    <p className="font-medium">Modo sábana completa</p>
                    <p className="mt-1">
                      Se guardarán todas las columnas de cada casilla. No se
                      calculará ganador.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Filas leídas</p>
                    <p className="text-2xl font-bold text-secondary-900">
                      {preview.totalFilas?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Filas válidas</p>
                    <p
                      className={`text-2xl font-bold ${preview.exitosas > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {preview.exitosas?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">
                      Omitidas por filtro
                    </p>
                    <p
                      className={`text-2xl font-bold ${preview.omitidasFiltro > 0 ? "text-yellow-600" : "text-secondary-900"}`}
                    >
                      {preview.omitidasFiltro?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Errores</p>
                    <p
                      className={`text-2xl font-bold ${preview.errores > 0 ? "text-red-600" : "text-secondary-900"}`}
                    >
                      {preview.errores?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">
                      {preview.modoSabana
                        ? "Columnas por fila"
                        : "Actores con votos"}
                    </p>
                    <p className="text-2xl font-bold text-secondary-900">
                      {preview.modoSabana
                        ? preview.preview?.[0]?.procesado?.sabana_completa
                            ?.length ||
                          preview.columnas?.length ||
                          0
                        : Object.keys(preview.totales || {}).length}
                    </p>
                  </div>
                </div>

                {preview.exitosas === 0 && preview.totalFilas > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-medium flex items-center gap-2">
                      <AlertCircle size={16} /> Ninguna fila pasó la validación
                    </p>
                    <p className="mt-1">
                      {preview.omitidasFiltro > 0
                        ? `Todas las filas (${preview.omitidasFiltro.toLocaleString()}) se omitieron por el filtro de municipio. Revisá en el paso 4 (Mapeo) la columna y el texto del filtro; probablemente el valor no coincide con los datos de este archivo.`
                        : preview.errores > 0
                          ? "Todas las filas tienen errores. Revisá la tabla de abajo para ver los detalles."
                          : "Revisá el mapeo de sección y casilla; puede que las columnas elegidas no contengan datos."}
                    </p>
                  </div>
                )}

                {preview.errores > 0 && preview.exitosas > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    <p className="font-medium flex items-center gap-2">
                      <AlertCircle size={16} /> Hay filas con error
                    </p>
                    <p className="mt-1">
                      Las filas con error no se importarán.
                    </p>
                  </div>
                )}

                {!preview.modoSabana &&
                  Object.keys(preview.totales || {}).length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-secondary-700">
                        Votos por actor (preview)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(preview.totales || {})
                          .sort((a: any, b: any) => b[1] - a[1])
                          .map(([actor, votos]: [string, any]) => (
                            <span
                              key={actor}
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white"
                              style={{
                                backgroundColor:
                                  PARTIDO_COLORS[actor.toUpperCase()] ||
                                  PARTIDO_COLORS.OTRO,
                              }}
                            >
                              {actor} {Number(votos).toLocaleString()}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                {metadatos.tipo_historico === "principal" &&
                  metadatos.partido_principal && (
                    <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">
                      <p className="font-medium">
                        Actor principal del proyecto
                      </p>
                      <p className="mt-1">
                        Se guardará destacado como:{" "}
                        <span
                          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                          style={{
                            backgroundColor:
                              PARTIDO_COLORS[
                                metadatos.partido_principal.toUpperCase()
                              ] || PARTIDO_COLORS.OTRO,
                          }}
                        >
                          {metadatos.partido_principal}
                        </span>
                      </p>
                    </div>
                  )}

                <div className="overflow-x-auto rounded-lg border border-secondary-200">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary-100 text-secondary-700">
                      <tr>
                        <th className="px-3 py-2 text-left">Fila</th>
                        <th className="px-3 py-2 text-left">Sección</th>
                        <th className="px-3 py-2 text-left">Casilla</th>
                        {mapeo.filtro_municipio_columna && (
                          <th className="px-3 py-2 text-left">
                            {mapeo.filtro_municipio_columna}
                          </th>
                        )}
                        <th className="px-3 py-2 text-left">
                          {preview.modoSabana ? "Modo" : "Ganador"}
                        </th>
                        <th className="px-3 py-2 text-left">Total votos</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {preview.preview?.slice(0, 15).map((p: any) => (
                        <tr key={p.fila}>
                          <td className="px-3 py-2 text-secondary-500">
                            {p.fila}
                          </td>
                          <td className="px-3 py-2">
                            {p.procesado?.seccion || "-"}
                          </td>
                          <td className="px-3 py-2">
                            {p.procesado?.casilla || "-"}
                          </td>
                          {mapeo.filtro_municipio_columna && (
                            <td className="px-3 py-2 text-secondary-500">
                              {p.raw?.[mapeo.filtro_municipio_columna] || "-"}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            {preview.modoSabana ? (
                              <span className="text-xs text-blue-600">
                                Sábana
                              </span>
                            ) : p.procesado?.partido_ganador ? (
                              <PartidoBadge
                                partido={p.procesado.partido_ganador}
                              />
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {p.procesado?.total_votos?.toLocaleString() || "-"}
                          </td>
                          <td className="px-3 py-2">
                            {p.error === "OMITIDO_FILTRO" ? (
                              <span className="text-yellow-600">
                                Omitida (filtro)
                              </span>
                            ) : p.error ? (
                              <span className="text-red-600">{p.error}</span>
                            ) : (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 size={14} /> OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep("mapeo")}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft size={16} /> Corregir mapeo
              </button>
              <button
                disabled={!preview || preview.exitosas === 0 || importing}
                onClick={() => setStep("importando")}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Proceder a importar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "importando" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">
                6. Importar a base de datos
              </h3>
              <p className="text-sm text-secondary-500">
                Confirma para guardar los registros. Recuerda: los históricos no
                se editan, solo se eliminan.
              </p>
            </div>

            {!importResult && (
              <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                <p className="text-sm text-secondary-700">
                  Se importará:{" "}
                  <strong>
                    {TIPO_HISTORICO_LABEL[metadatos.tipo_historico]}
                  </strong>{" "}
                  —{" "}
                  <strong>
                    {TIPO_ELECCION_LABEL[metadatos.tipo_eleccion]}{" "}
                    {metadatos.anio}
                  </strong>
                  {metadatos.municipio_nombre && (
                    <span className="ml-1">
                      en <strong>{metadatos.municipio_nombre}</strong>
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm text-secondary-500">
                  Filas válidas a guardar: {preview?.exitosas?.toLocaleString()}{" "}
                  de {preview?.totalFilas?.toLocaleString()}
                </p>
              </div>
            )}

            {!importResult && (
              <div className="flex justify-between">
                <button
                  onClick={() => setStep("validacion")}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button
                  disabled={importing}
                  onClick={() => handleImportar()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  <Upload size={18} />{" "}
                  {importing ? "Importando..." : "Importar histórico"}
                </button>
              </div>
            )}

            {importResult && (
              <div
                className={`rounded-lg border p-4 ${importResult.error ? "border-red-200 bg-red-50" : importResult.exitosos > 0 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}
              >
                <div className="flex items-start gap-3">
                  {importResult.error ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  ) : importResult.exitosos > 0 ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                  )}
                  <div className="text-sm w-full">
                    {importResult.error ? (
                      <p className="font-medium text-red-700">
                        {importResult.error}
                      </p>
                    ) : (
                      <>
                        <p
                          className={`font-medium ${importResult.exitosos > 0 ? "text-green-700" : "text-amber-700"}`}
                        >
                          Resultado de la importación
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-secondary-500">
                              Total filas CSV
                            </p>
                            <p className="font-bold text-secondary-900">
                              {importResult.totalFilas?.toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-green-600">Importadas</p>
                            <p className="font-bold text-green-700">
                              {importResult.exitosos?.toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-secondary-500">
                              Omitidas por filtro
                            </p>
                            <p className="font-bold text-secondary-900">
                              {(
                                importResult.omitidasFiltro ?? 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-secondary-500">
                              Omitidas vacías/resumen
                            </p>
                            <p className="font-bold text-secondary-900">
                              {(
                                importResult.omitidasVacias ?? 0
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-red-600">
                              Duplicadas / errores
                            </p>
                            <p className="font-bold text-red-700">
                              {(
                                (importResult.duplicados ?? 0) +
                                (importResult.errores ?? 0)
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {importResult.duplicados > 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            {importResult.duplicados} filas ya existen para este
                            mismo histórico (mismo tipo, elección, año y
                            territorio). Podés eliminar el lote existente y
                            reimportar.
                          </p>
                        )}
                        {importResult.errores > 0 && (
                          <>
                            <p className="mt-2 text-red-600">
                              Errores: {importResult.errores} filas.
                            </p>
                            {importResult.detallesErrores?.length > 0 && (
                              <div className="mt-2 max-h-32 overflow-y-auto rounded border border-red-100 bg-white p-2 text-xs text-red-700">
                                {importResult.detallesErrores
                                  .slice(0, 10)
                                  .map((e: any, idx: number) => (
                                    <div key={idx} className="py-0.5">
                                      Fila {e.fila}: {e.error}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {importResult && (
              <div className="flex justify-between">
                {importResult.duplicados > 0 && !importResult.error && (
                  <button
                    disabled={importing}
                    onClick={() => {
                      if (
                        confirm(
                          "¿Eliminar el histórico existente de este lote y volver a importar el archivo? Esta acción no se puede deshacer.",
                        )
                      ) {
                        handleImportar(true);
                      }
                    }}
                    className="btn-secondary flex items-center gap-2 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} /> Reemplazar existentes e importar
                  </button>
                )}
                <div className="ml-auto">
                  <button
                    onClick={async () => {
                      await cargarDatos();
                      resetWizard();
                      setVista("dashboard");
                    }}
                    className="btn-primary flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Cálculo de KPIs estratégicos del dashboard
  const kpis = useMemo(() => {
    const agrupados = resumen?.agrupados || [];
    const historicos = agrupados.length;
    const resultadosSafe = Array.isArray(resultados) ? resultados : [];

    // Determinar actor principal global del proyecto
    const principales = agrupados
      .filter((g) => g.tipo_historico === "principal" && g.partido_principal)
      .map((g) => g.partido_principal as string);
    const conteoPrincipal = new Map<string, number>();
    resultadosSafe.forEach((r) => {
      if (r.partido_principal) {
        conteoPrincipal.set(
          r.partido_principal,
          (conteoPrincipal.get(r.partido_principal) || 0) + 1,
        );
      }
    });
    const actorPrincipal =
      principales[0] ||
      (conteoPrincipal.size > 0
        ? Array.from(conteoPrincipal.entries()).sort(
            (a, b) => b[1] - a[1],
          )[0][0]
        : null);

    // Participación promedio: preferir promedio de agrupados; fallback a casillas con dato
    const agrupadosConParticipacion = agrupados.filter(
      (g) =>
        g.participacion_promedio != null &&
        g.lista_nominal != null &&
        g.lista_nominal > 0,
    );
    const participacionPromedio =
      agrupadosConParticipacion.length > 0
        ? agrupadosConParticipacion.reduce(
            (acc, g) => acc + (g.participacion_promedio || 0),
            0,
          ) / agrupadosConParticipacion.length
        : (() => {
            const casillasConParticipacion = resultadosSafe.filter(
              (r) =>
                typeof r.participacion_pct === "number" &&
                r.participacion_pct >= 0,
            );
            return casillasConParticipacion.length > 0
              ? casillasConParticipacion.reduce(
                  (acc, r) => acc + r.participacion_pct!,
                  0,
                ) / casillasConParticipacion.length
              : 0;
          })();

    // Métricas por sección
    const secciones = new Map<
      string,
      {
        actores: Map<string, number>;
        total_votos: number;
        actorPrincipalVotos: number;
      }
    >();

    let votosActorPrincipal = 0;
    const actoresUnicos = new Set<string>();

    resultadosSafe.forEach((r) => {
      const desglose = r.desglose_partidos || [];
      desglose.forEach((d) => {
        actoresUnicos.add(d.partido);
        if (!secciones.has(r.seccion)) {
          secciones.set(r.seccion, {
            actores: new Map(),
            total_votos: 0,
            actorPrincipalVotos: 0,
          });
        }
        const sec = secciones.get(r.seccion)!;
        const v = d.votos || 0;
        sec.actores.set(d.partido, (sec.actores.get(d.partido) || 0) + v);
        sec.total_votos += v;
        if (actorPrincipal && d.partido === actorPrincipal) {
          votosActorPrincipal += v;
          sec.actorPrincipalVotos += v;
        }
      });

      // Si no hay desglose pero hay ganador, aún contamos su voto para el total seccional
      if (desglose.length === 0 && r.total_votos) {
        if (!secciones.has(r.seccion)) {
          secciones.set(r.seccion, {
            actores: new Map(),
            total_votos: 0,
            actorPrincipalVotos: 0,
          });
        }
        secciones.get(r.seccion)!.total_votos += r.total_votos;
      }
    });

    let seccionesGanadas = 0;
    let margenAcumulado = 0;
    let seccionesConMargen = 0;
    let diferenciaVsGanador = 0;

    secciones.forEach((sec) => {
      const ordenados = Array.from(sec.actores.entries()).sort(
        (a, b) => b[1] - a[1],
      );
      const ganador = ordenados[0];
      const segundo = ordenados[1];

      if (ganador) {
        if (actorPrincipal && ganador[0] === actorPrincipal) {
          seccionesGanadas++;
        }
        if (segundo) {
          const margen =
            sec.total_votos > 0
              ? ((ganador[1] - segundo[1]) / sec.total_votos) * 100
              : 0;
          margenAcumulado += margen;
          seccionesConMargen++;
        }
        if (actorPrincipal) {
          diferenciaVsGanador += ganador[1] - sec.actorPrincipalVotos;
        }
      }
    });

    const margenPromedio =
      seccionesConMargen > 0 ? margenAcumulado / seccionesConMargen : 0;

    return {
      historicos,
      participacionPromedio,
      actorPrincipal,
      votosActorPrincipal,
      margenPromedio,
    };
  }, [resumen, resultados]);

  // Sincronizar actor predictivo con el actor principal del proyecto al cargar
  useEffect(() => {
    if (kpis.actorPrincipal && !actorPredictivo && !actorManual.nombre) {
      setActorPredictivo(kpis.actorPrincipal);
    }
  }, [kpis.actorPrincipal, actorPredictivo, actorManual.nombre]);

  // Análisis predictivo 2027
  const analisisPredictivo = useMemo(() => {
    const agrupados = resumen?.agrupados || [];
    // Actor principal manual (partido nuevo sin histórico, ej. Ballesteros)
    const actorManualVotos = modoBallesteros
      ? Math.max(0, Number(actorManual.votos2027.replace(/[^0-9]/g, "")) || 0)
      : 0;
    const actorManualItem = modoBallesteros && actorManual.nombre.trim() && actorManualVotos > 0
      ? { partido: actorManual.nombre.trim(), votos: actorManualVotos }
      : null;

    const actorPrincipal = actorManualItem
      ? actorManualItem.partido
      : actorPredictivo || kpis.actorPrincipal;

    if (!actorPrincipal || agrupados.length === 0) return null;

    // Solo históricos principales con datos completos
    const principales = agrupados
      .filter(
        (g) =>
          g.tipo_historico === "principal" &&
          g.lista_nominal &&
          g.lista_nominal > 0 &&
          g.total_votos > 0,
      )
      .sort((a, b) => a.anio - b.anio);

    if (principales.length === 0) return null;

    // Último histórico principal: base real para la proyección 2027
    const ultimoPrincipal = principales[principales.length - 1];
    const partidosUltimo = new Map(
      ultimoPrincipal?.partidos
        .filter((p) => esPartidoIndividual(p.partido))
        .map((p) => [p.partido, p.votos]) ?? [],
    );

    // Proyectamos todos los partidos individuales que aparecen en cualquier histórico principal
    // (no solo los de la última elección), para que aparezcan en cruces y simulaciones
    const partidosUnicos = Array.from(
      new Set(
        principales.flatMap((g) =>
          g.partidos
            .map((p) => p.partido)
            .filter((p): p is string => Boolean(p) && esPartidoIndividual(p)),
        ),
      ),
    ).sort();

    // Serie histórica por partido para proyección lineal
    function proyectarPartido(partido: string): number {
      const serie = principales.map((g) => {
        const actor = g.partidos.find((p) => p.partido === partido);
        return {
          anio: g.anio,
          votos: actor?.votos || 0,
          listaNominal: g.lista_nominal || 0,
        };
      });

      // Si el partido no aparece en todos los años, usamos el promedio de % sobre lista nominal
      const aniosConVotos = serie.filter((s) => s.votos > 0);
      if (aniosConVotos.length === 0) return 0;

      const sumX = serie.reduce((acc, s) => acc + s.anio, 0);
      const sumY = serie.reduce((acc, s) => acc + s.votos, 0);
      const sumXY = serie.reduce((acc, s) => acc + s.anio * s.votos, 0);
      const sumX2 = serie.reduce((acc, s) => acc + s.anio * s.anio, 0);
      const n = serie.length;
      const pendiente =
        n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
      const intercepto = n > 1 ? (sumY - pendiente * sumX) / n : sumY;
      const proyeccionLinealPartido = Math.round(pendiente * 2027 + intercepto);

      // Fallback si la proyección lineal sale negativa o cero
      if (proyeccionLinealPartido > 0) return proyeccionLinealPartido;

      const pctPromedio =
        aniosConVotos.reduce(
          (acc, s) => acc + (s.listaNominal ? s.votos / s.listaNominal : 0),
          0,
        ) / aniosConVotos.length;
      return Math.round(
        (principales[principales.length - 1]?.lista_nominal || 0) * pctPromedio,
      );
    }

    // Proyección de todos los partidos
    const proyeccionesTodos = partidosUnicos.map((p) => ({
      partido: p,
      votos: proyectarPartido(p),
    }));
    proyeccionesTodos.sort((a, b) => b.votos - a.votos);

    const proyeccionSeleccionado = actorManualItem
      ? actorManualItem.votos
      : proyeccionesTodos.find((p) => p.partido === actorPrincipal)?.votos || 0;
    const primeraProyeccion = proyeccionesTodos[0];
    const segundaProyeccion = proyeccionesTodos[1];

    // Rival a vencer (por defecto el primero, o el segundo si el actor ya es primero)
    const rivalDefault =
      primeraProyeccion?.partido === actorPrincipal
        ? segundaProyeccion?.partido
        : primeraProyeccion?.partido;

    // Modo Ballesteros/Colombia: múltiples rivales + actor nuevo manual
    const actorNuevoVotos = modoBallesteros
      ? Math.max(0, Number(actorNuevo.votos2027.replace(/[^0-9]/g, "")) || 0)
      : 0;
    const actorNuevoItem = actorNuevo.nombre.trim() && actorNuevoVotos > 0
      ? { partido: actorNuevo.nombre.trim(), votos: actorNuevoVotos }
      : null;

    // Lista completa para rankings/gráficas: partidos históricos + actor manual + actor nuevo
    const proyeccionesCompletas = [...proyeccionesTodos];
    const agregarProyeccion = (item: { partido: string; votos: number } | null) => {
      if (!item) return;
      const idx = proyeccionesCompletas.findIndex((p) => p.partido === item.partido);
      if (idx >= 0) {
        proyeccionesCompletas[idx] = item;
      } else {
        proyeccionesCompletas.push(item);
      }
    };
    agregarProyeccion(actorManualItem);
    agregarProyeccion(actorNuevoItem);
    proyeccionesCompletas.sort((a, b) => b.votos - a.votos);

    const proyeccionesConActorNuevo = proyeccionesCompletas;

    // Rivales activos en el análisis
    const rivalesActivos: { partido: string; votos: number }[] = [];
    if (modoBallesteros) {
      for (const r of rivalesPredictivo.length > 0 ? rivalesPredictivo : rivalDefault ? [rivalDefault] : []) {
        if (actorManualItem && r === actorManualItem.partido) continue;
        const v = proyeccionesTodos.find((p) => p.partido === r)?.votos || 0;
        if (v > 0) rivalesActivos.push({ partido: r, votos: v });
      }
      if (actorNuevoItem && actorNuevoItem.partido !== actorPrincipal) {
        rivalesActivos.push(actorNuevoItem);
      }
    } else {
      const r = rivalPredictivo || rivalDefault || "";
      const v = proyeccionesTodos.find((p) => p.partido === r)?.votos || 0;
      if (v > 0) rivalesActivos.push({ partido: r, votos: v });
    }

    // Rival más fuerte a vencer: el de mayor proyección entre los seleccionados
    const rivalLider = [...rivalesActivos].sort((a, b) => b.votos - a.votos)[0];
    const rivalPartido = rivalLider?.partido || rivalPredictivo || rivalDefault || "";
    const rivalProyeccion = rivalLider?.votos ||
      proyeccionesTodos.find((p) => p.partido === rivalPartido)?.votos || 0;

    // Umbral para ganar: superar al rival más fuerte seleccionado + 1
    const votosParaGanar = rivalProyeccion > 0 ? rivalProyeccion + 1 : 0;

    // Diferencia vs. ganar
    const diferenciaVsGanar = proyeccionSeleccionado - votosParaGanar;

    // Veredicto vs rival: gana si saca >= 3% sobre el rival; empate si la brecha está dentro de ±3%; pierde si no
    let veredicto: "gana" | "empate" | "pierde" = "pierde";
    if (rivalProyeccion > 0) {
      if (diferenciaVsGanar >= rivalProyeccion * 0.03) {
        veredicto = "gana";
      } else if (Math.abs(diferenciaVsGanar) <= rivalProyeccion * 0.03) {
        veredicto = "empate";
      }
    }

    // Evolución del partido seleccionado para la tabla
    const evolucion = principales.map((g) => {
      const actor = g.partidos.find((p) => p.partido === actorPrincipal);
      const ganador = g.partidos[0]; // ya viene ordenado por votos descendente
      const segundo = g.partidos[1];
      return {
        anio: g.anio,
        listaNominal: g.lista_nominal || 0,
        totalVotos: g.total_votos,
        actorVotos: actor?.votos || 0,
        actorPctLista: g.lista_nominal
          ? ((actor?.votos || 0) / g.lista_nominal) * 100
          : 0,
        actorPctVotos: g.total_votos
          ? ((actor?.votos || 0) / g.total_votos) * 100
          : 0,
        ganadorVotos: ganador?.votos || 0,
        ganadorPartido: ganador?.partido || "—",
        segundoVotos: segundo?.votos || 0,
        brechaVsGanador: (ganador?.votos || 0) - (actor?.votos || 0),
        brechaVsSegundo: (actor?.votos || 0) - (segundo?.votos || 0),
        participacion: g.participacion_promedio || 0,
        otros: g.partidos.filter((p) => p.partido !== actorPrincipal),
      };
    });

    const ultima = evolucion[evolucion.length - 1];

    // Promedios del partido seleccionado
    const n = evolucion.length;
    const promedioActorPctLista =
      evolucion.reduce((acc, e) => acc + e.actorPctLista, 0) / n;
    const promedioParticipacion =
      evolucion.reduce((acc, e) => acc + e.participacion, 0) / n;

    const proyeccionesMap = new Map(
      proyeccionesTodos.map((p) => [p.partido, p.votos]),
    );

    // Simular alianzas tanto con votos reales del último año como con proyecciones 2027
    const simularAlianzas = alianzas
      .filter((a) => a.partidos.length > 0)
      .map((a) => {
        const votos2024 = a.partidos.reduce(
          (acc, p) => acc + (partidosUltimo.get(p) || 0),
          0,
        );
        const proyeccion2027 = a.partidos.reduce(
          (acc, p) => acc + (proyeccionesMap.get(p) || 0),
          0,
        );
        return {
          id: a.id,
          nombre: a.nombre,
          partidos: a.partidos,
          votos2024,
          proyeccion2027,
        };
      });

    // Ranking combinado 2024: partidos reales + alianzas simuladas
    // Incluimos todos los partidos que aparecen en cualquier histórico, con 0 si no compitieron en el último año
    const ranking2024 = [
      ...partidosUnicos.map((p) => ({
        clave: p,
        nombre: p,
        esAlianza: false,
        votos: partidosUltimo.get(p) || 0,
        partidos: [p],
      })),
      ...simularAlianzas.map((a) => ({
        clave: `alianza-${a.id}`,
        nombre: a.nombre,
        esAlianza: true,
        votos: a.votos2024,
        partidos: a.partidos,
      })),
    ].sort((a, b) => b.votos - a.votos);

    // Ranking combinado 2027: proyecciones individuales + actor manual/nuevo + alianzas proyectadas
    const ranking2027 = [
      ...proyeccionesCompletas.map((p) => ({
        clave: p.partido,
        nombre: p.partido,
        esAlianza: false,
        votos: p.votos,
        partidos: [p.partido],
      })),
      ...simularAlianzas.map((a) => ({
        clave: `alianza-${a.id}`,
        nombre: a.nombre,
        esAlianza: true,
        votos: a.proyeccion2027,
        partidos: a.partidos,
      })),
    ].sort((a, b) => b.votos - a.votos);

    // Base 2027
    const listaNominal2027 = ultima.listaNominal;
    const votosEsperados2027 = Math.round(
      listaNominal2027 * (promedioParticipacion / 100),
    );

    // Meta por sección: votos necesarios para superar al segundo proyectado
    const seccionesTotales = ultima.listaNominal
      ? principales[principales.length - 1]?.secciones || 1
      : 1;
    const metaPorSeccion = Math.ceil(votosParaGanar / seccionesTotales);

    // Crecimiento necesario desde última elección
    const crecimientoNecesario = votosParaGanar - ultima.actorVotos;

    // Votos capturables: abstención promedio sobre lista nominal 2027
    const abstencionPromedioPct = 100 - promedioParticipacion;
    const votosCapturables = Math.round(
      listaNominal2027 * (abstencionPromedioPct / 100),
    );

    // Evolución del rival seleccionado para gráficas
    const evolucionRival = principales.map((g) => {
      const r = g.partidos.find((p) => p.partido === rivalPartido);
      return {
        anio: g.anio,
        votos: r?.votos || 0,
        pctLista: g.lista_nominal
          ? ((r?.votos || 0) / g.lista_nominal) * 100
          : 0,
      };
    });

    // Color del rival según partido
    const rivalColor = PARTIDO_COLORS[rivalPartido.toUpperCase()] || "#6b7280";

    // Rival específico para comparar alianzas
    const rivalAlianzasPartido =
      rivalAlianzas || rivalPredictivo || rivalDefault || "";
    const rivalAlianzasProyeccion =
      proyeccionesTodos.find((p) => p.partido === rivalAlianzasPartido)
        ?.votos || 0;
    const rivalAlianzasColor =
      PARTIDO_COLORS[rivalAlianzasPartido.toUpperCase()] || "#6b7280";

    return {
      actorPrincipal,
      actorManualItem,
      evolucion,
      listaNominal2027,
      votosEsperados2027,
      votosParaGanar,
      proyeccionFinal: proyeccionSeleccionado,
      diferenciaVsGanar,
      veredicto,
      metaPorSeccion,
      seccionesTotales,
      crecimientoNecesario,
      votosCapturables,
      abstencionPromedioPct,
      proyeccionesTodos,
      proyeccionesConActorNuevo,
      primeraProyeccion,
      segundaProyeccion,
      rivalPartido,
      rivalProyeccion,
      rivalColor,
      evolucionRival,
      rivalAlianzasPartido,
      rivalAlianzasProyeccion,
      rivalAlianzasColor,
      promedioParticipacion,
      promedioActorPctLista,
      ultimoPrincipal,
      simularAlianzas,
      ranking2024,
      ranking2027,
    };
  }, [
    resumen,
    kpis.actorPrincipal,
    actorPredictivo,
    rivalPredictivo,
    rivalAlianzas,
    alianzas,
    modoBallesteros,
    rivalesPredictivo.join(","),
    actorNuevo.nombre,
    actorNuevo.votos2027,
    actorManual.nombre,
    actorManual.votos2027,
  ]);

  // Sincronizar rival predictivo con el primer lugar proyectado al cargar
  useEffect(() => {
    if (!modoBallesteros && analisisPredictivo?.primeraProyeccion?.partido && !rivalPredictivo) {
      // Evitar que el rival sea el mismo actor seleccionado
      const primero = analisisPredictivo.primeraProyeccion.partido;
      const actor = analisisPredictivo.actorPrincipal;
      if (primero !== actor) {
        setRivalPredictivo(primero);
      } else if (analisisPredictivo.segundaProyeccion?.partido) {
        setRivalPredictivo(analisisPredictivo.segundaProyeccion.partido);
      }
    }
  }, [
    modoBallesteros,
    analisisPredictivo?.primeraProyeccion?.partido,
    analisisPredictivo?.actorPrincipal,
    analisisPredictivo?.segundaProyeccion?.partido,
    rivalPredictivo,
  ]);

  // Sincronizar rival de alianzas con el rival principal cuando cambie
  useEffect(() => {
    if (rivalPredictivo && !rivalAlianzas) {
      setRivalAlianzas(rivalPredictivo);
    }
  }, [rivalPredictivo, rivalAlianzas]);

  const renderDashboard = () => {
    const agrupados = resumen?.agrupados || [];

    return (
      <div className="space-y-6">
        {/* KPIs globales — una sola fila compacta */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            title="Históricos cargados"
            value={kpis.historicos}
            subtitle="Por tipo, elección y año"
            icon={BarChart3}
            color="text-primary-600"
          />
          <KpiCard
            title="Participación promedio"
            value={`${kpis.participacionPromedio.toFixed(2)}%`}
            subtitle="Casillas con dato"
            icon={Percent}
            color="text-blue-600"
          />
          <KpiCard
            title="Votos actor principal"
            value={kpis.votosActorPrincipal}
            subtitle={kpis.actorPrincipal || "Sin actor principal"}
            icon={Target}
            color="text-green-600"
          />
          <KpiCard
            title="Margen promedio"
            value={`${kpis.margenPromedio.toFixed(2)}%`}
            subtitle="Ganador vs 2° lugar"
            icon={TrendingUp}
            color="text-amber-600"
          />
        </div>

        {/* Grilla de tarjetas */}
        <div className="card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Table2 size={20} className="text-primary-600" />
            <h3 className="text-lg font-bold text-secondary-900">
              Históricos cargados
            </h3>
          </div>

          {agrupadosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-10 text-center">
              <BarChart3 size={40} className="text-secondary-300" />
              <p className="mt-3 text-sm font-medium text-secondary-700">
                Aún no hay históricos cargados
              </p>
              <p className="text-xs text-secondary-500">
                Subí tu primera sábana electoral para empezar a analizar.
              </p>
              <button
                onClick={() => {
                  resetWizard();
                  setVista("wizard");
                }}
                className="btn-primary mt-4 flex items-center gap-2"
              >
                <Upload size={16} /> Subir primer histórico
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {agrupadosFiltrados.map((g, idx) => {
                const principalVotos = g.partido_principal
                  ? g.partidos.find((p) => p.partido === g.partido_principal)
                      ?.votos
                  : undefined;
                return (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-xl border border-secondary-200 bg-white p-0 shadow-sm transition hover:shadow-md"
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                                g.tipo_historico === "principal"
                                  ? "bg-slate-700"
                                  : "bg-secondary-500"
                              }`}
                            >
                              {TIPO_HISTORICO_LABEL[g.tipo_historico] ||
                                g.tipo_historico}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-secondary-500">
                              <MapPin size={10} />
                              {g.municipio_id
                                ? `Mun. ${g.municipio_id}`
                                : g.estado_id
                                  ? `Edo. ${g.estado_id}`
                                  : "Sin territorio"}
                            </span>
                          </div>
                          <h4 className="text-lg font-bold leading-tight text-secondary-900">
                            {TIPO_ELECCION_LABEL[g.tipo_eleccion] ||
                              g.tipo_eleccion}
                          </h4>
                          <span className="text-2xl font-black text-secondary-300">
                            {g.anio}
                          </span>
                        </div>

                        {g.partido_principal && (
                          <div className="text-right">
                            <p className="text-[10px] text-secondary-500">
                              Actor principal
                            </p>
                            <span
                              className="inline-block rounded-md px-2 py-0.5 text-sm font-bold text-white"
                              style={{
                                backgroundColor:
                                  PARTIDO_COLORS[
                                    g.partido_principal.toUpperCase()
                                  ] || PARTIDO_COLORS.OTRO,
                              }}
                            >
                              {g.partido_principal}
                            </span>
                            {principalVotos != null ? (
                              <p className="mt-0.5 text-xs font-semibold text-secondary-700">
                                {principalVotos.toLocaleString()}
                              </p>
                            ) : (
                              <p className="mt-0.5 text-[10px] text-secondary-500">
                                Sin votos en esta elección
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Métricas clave */}
                      {(() => {
                        const metaCol = g.sabana;
                        const hasColombiaData =
                          metaCol?.mesas_instaladas != null ||
                          metaCol?.mesas_informadas != null ||
                          metaCol?.potential_sufragantes != null ||
                          metaCol?.votos_nulos != null ||
                          metaCol?.votos_no_marcados != null ||
                          metaCol?.votos_blanco != null;
                        return (
                          <div className="mb-4 grid grid-cols-2 gap-2">
                            {hasColombiaData ? (
                              <>
                                <div className="rounded-lg border border-secondary-200 bg-white p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-secondary-500">
                                      Mesas instaladas
                                    </span>
                                    <MapPin
                                      size={14}
                                      className="text-secondary-400"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {metaCol.mesas_instaladas != null
                                      ? metaCol.mesas_instaladas.toLocaleString()
                                      : "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-secondary-200 bg-white p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-secondary-500">
                                      Mesas informadas
                                    </span>
                                    <CheckCircle2
                                      size={14}
                                      className="text-secondary-400"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {metaCol.mesas_informadas != null
                                      ? String(metaCol.mesas_informadas)
                                      : "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-secondary-200 bg-white p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-secondary-500">
                                      Votos nulos
                                    </span>
                                    <AlertCircle
                                      size={14}
                                      className="text-secondary-400"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {metaCol.votos_nulos != null
                                      ? metaCol.votos_nulos.toLocaleString()
                                      : "—"}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-amber-700">
                                      Potencial sufragantes
                                    </span>
                                    <Users
                                      size={14}
                                      className="text-amber-600"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {metaCol.potential_sufragantes != null
                                      ? metaCol.potential_sufragantes.toLocaleString()
                                      : metaCol.censo != null
                                        ? metaCol.censo.toLocaleString()
                                        : (g.lista_nominal ?? 0).toLocaleString()}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="rounded-lg border border-secondary-200 bg-white p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-secondary-500">
                                      Registros
                                    </span>
                                    <FileSpreadsheet
                                      size={14}
                                      className="text-secondary-400"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {(g.registros ?? 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-secondary-200 bg-white p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-secondary-500">
                                      Secciones
                                    </span>
                                    <MapIcon
                                      size={14}
                                      className="text-secondary-400"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {(g.secciones ?? 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-secondary-200 bg-white p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-secondary-500">
                                      Casillas
                                    </span>
                                    <Vote
                                      size={14}
                                      className="text-secondary-400"
                                    />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {(g.casillas ?? 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-amber-700">
                                      Lista nominal
                                    </span>
                                    <Users size={14} className="text-amber-600" />
                                  </div>
                                  <p className="mt-1 text-sm font-bold text-secondary-900">
                                    {(g.lista_nominal ?? 0).toLocaleString()}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Votos + participación */}
                      <div className="mb-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-secondary-100 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-wide text-secondary-500">
                              Total votos
                            </p>
                            <Vote size={14} className="text-slate-400" />
                          </div>
                          <p className="text-xl font-black text-secondary-900">
                            {(g.total_votos ?? 0).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-secondary-500">
                            {g.lista_nominal
                              ? `${(
                                  ((g.total_votos ?? 0) / g.lista_nominal) *
                                  100
                                ).toFixed(1)}% de la lista nominal`
                              : "Sin lista nominal"}
                          </p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary-100">
                            <div
                              className="h-2 rounded-full bg-slate-500"
                              style={{
                                width: `${Math.min(
                                  ((g.total_votos ?? 0) /
                                    Math.max(g.lista_nominal ?? 1, 1)) *
                                    100,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="rounded-lg border border-secondary-100 p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-[10px] uppercase tracking-wide text-secondary-500">
                              Participación
                            </p>
                            <Percent size={14} className="text-teal-500" />
                          </div>
                          <p className="text-xl font-black text-secondary-900">
                            {g.participacion_promedio != null
                              ? `${g.participacion_promedio.toFixed(2)}%`
                              : "-"}
                          </p>
                          <p className="text-[10px] text-secondary-500">
                            {g.participacion_promedio != null
                              ? g.participacion_promedio >= 50
                                ? "Alta"
                                : g.participacion_promedio >= 40
                                  ? "Media"
                                  : "Baja"
                              : "Sin dato"}
                          </p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary-100">
                            <div
                              className="h-2 rounded-full bg-teal-500"
                              style={{
                                width: `${Math.min(
                                  g.participacion_promedio ?? 0,
                                  100,
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Top actores con barras */}
                      <div className="mb-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-secondary-500">
                          Top actores
                        </p>
                        {(() => {
                          const sorted = [...g.partidos]
                            .filter(
                              (a) =>
                                a &&
                                typeof a.votos === "number" &&
                                a.partido,
                            )
                            .sort((a, b) => b.votos - a.votos);
                          const maxVotos = Math.max(
                            ...sorted.map((a) => a.votos),
                            1,
                          );
                          return (
                            <div className="space-y-2">
                              {sorted.slice(0, 4).map((actor, i) => {
                                const color =
                                  PARTIDO_COLORS[actor.partido.toUpperCase()] ||
                                  PARTIDO_COLORS.OTRO;
                                return (
                                  <div
                                    key={actor.partido}
                                    className="space-y-0.5"
                                  >
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="flex items-center gap-1.5 font-semibold">
                                        <span
                                          className="inline-block h-2.5 w-2.5 rounded-full"
                                          style={{ backgroundColor: color }}
                                        />
                                        {actor.partido}
                                        {actor.partido ===
                                          g.partido_principal && (
                                          <span className="rounded bg-primary-100 px-1 py-0 text-[9px] text-primary-700">
                                            Principal
                                          </span>
                                        )}
                                      </span>
                                      <span className="font-bold text-secondary-900">
                                        {actor.votos.toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-100">
                                      <div
                                        className="h-2 rounded-full"
                                        style={{
                                          backgroundColor: color,
                                          width: `${(actor.votos / maxVotos) * 100}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => abrirDetalle(g)}
                          className="btn-secondary flex items-center gap-1 text-xs"
                        >
                          <Eye size={14} /> Ver detalle
                        </button>
                        <button
                          onClick={() => handleEliminarLote(g)}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50"
                          title="Eliminar histórico"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Análisis predictivo 2027 */}
        {analisisPredictivo && (
          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <BrainCircuit size={20} className="text-primary-600" />
              <h3 className="text-lg font-bold text-secondary-900">
                Proyección electoral 2027
              </h3>
              <span
                className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  analisisPredictivo.veredicto === "gana"
                    ? "bg-green-100 text-green-700"
                    : analisisPredictivo.veredicto === "empate"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {analisisPredictivo.veredicto === "gana" && "Proyección: GANA"}
                {analisisPredictivo.veredicto === "empate" &&
                  "Proyección: EMPATE TÉCNICO"}
                {analisisPredictivo.veredicto === "pierde" &&
                  "Proyección: PIERDE"}
              </span>
            </div>

            <p className="mb-4 text-sm text-secondary-600">
              Proyección para {" "}
              <span className="font-bold text-primary-700">
                {analisisPredictivo.actorPrincipal}
              </span>{" "}
              en la elección de 2027. Base: lista nominal{" "}
              {analisisPredictivo.listaNominal2027.toLocaleString()} de la
              última elección cargada y participación histórica promedio del{" "}
              {analisisPredictivo.promedioParticipacion.toFixed(2)}%.
            </p>

            {modoBallesteros && actorManual.nombre.trim() && !Number(actorManual.votos2027.replace(/[^0-9]/g, "")) && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                <strong>Actor principal nuevo detectado:</strong>{" "}
                {actorManual.nombre.trim()}. Para verlo en el análisis, ingresa
                sus votos proyectados 2027 en el campo de arriba.
              </div>
            )}

            {/* Mini tarjeta de base electoral */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-secondary-200 bg-white p-3">
                <p className="text-xs text-secondary-500">Lista nominal 2027</p>
                <p className="text-lg font-bold text-secondary-900">
                  {analisisPredictivo.listaNominal2027.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-secondary-200 bg-white p-3">
                <p className="text-xs text-secondary-500">
                  Votos esperados 2027
                </p>
                <p className="text-lg font-bold text-secondary-900">
                  {analisisPredictivo.votosEsperados2027.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-secondary-200 bg-white p-3">
                <p className="text-xs text-secondary-500">
                  Participación promedio
                </p>
                <p className="text-lg font-bold text-secondary-900">
                  {analisisPredictivo.promedioParticipacion.toFixed(2)}%
                </p>
              </div>
              <div className="rounded-lg border border-secondary-200 bg-white p-3">
                <p className="text-xs text-secondary-500">Votos capturables</p>
                <p className="text-lg font-bold text-secondary-900">
                  {analisisPredictivo.votosCapturables.toLocaleString()}
                </p>
                <p className="text-[10px] text-secondary-500">
                  {analisisPredictivo.abstencionPromedioPct.toFixed(2)}%
                  abstención promedio
                </p>
              </div>
            </div>

            {/* Selectores de actor y rival */}
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
              <div className="sm:w-56">
                <label className="label text-xs">Partido a analizar</label>
                <select
                  value={actorPredictivo}
                  onChange={(e) => {
                    const nuevo = e.target.value;
                    setActorPredictivo(nuevo);
                    if (actorManual.nombre || actorManual.votos2027) {
                      setActorManual({ nombre: "", votos2027: "" });
                    }
                    if (rivalPredictivo === nuevo) {
                      setRivalPredictivo("");
                    }
                    if (modoBallesteros) {
                      setRivalesPredictivo((prev) =>
                        prev.filter((r) => r !== nuevo),
                      );
                    }
                  }}
                  className="input text-sm"
                >
                  <option value="">— Seleccionar actor existente —</option>
                  {Array.from(
                    new Set(
                      (resumen?.agrupados || [])
                        .flatMap((g) => g.partidos.map((p) => p.partido))
                        .filter(
                          (p): p is string =>
                            Boolean(p) && esPartidoIndividual(p),
                        ),
                    ),
                  )
                    .sort()
                    .map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                </select>
              </div>

              {/* Modo Colombia: selección múltiple de rivales */}
              {modoBallesteros ? (
                <div className="sm:w-64">
                  <label className="label text-xs">
                    Enemigos a vencer (selección múltiple)
                  </label>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-secondary-200 bg-white p-2 text-sm shadow-sm">
                    {Array.from(
                      new Set(
                        (resumen?.agrupados || [])
                          .flatMap((g) => g.partidos.map((p) => p.partido))
                          .filter(
                            (p): p is string =>
                              Boolean(p) &&
                              esPartidoIndividual(p) &&
                              p !== actorPredictivo,
                          ),
                      ),
                    )
                      .sort()
                      .map((p) => {
                        const checked = rivalesPredictivo.includes(p);
                        return (
                          <label
                            key={p}
                            className="flex cursor-pointer items-center gap-2 px-1 py-1 hover:bg-secondary-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setRivalesPredictivo((prev) =>
                                  e.target.checked
                                    ? [...prev, p]
                                    : prev.filter((r) => r !== p),
                                );
                              }}
                              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-xs">{p}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="sm:w-56">
                  <label className="label text-xs">Enemigo a vencer</label>
                  <select
                    value={rivalPredictivo}
                    onChange={(e) => setRivalPredictivo(e.target.value)}
                    className="input text-sm"
                  >
                    <option value="">— Seleccionar rival —</option>
                    {Array.from(
                      new Set(
                        (resumen?.agrupados || [])
                          .flatMap((g) => g.partidos.map((p) => p.partido))
                          .filter(
                            (p): p is string =>
                              Boolean(p) &&
                              esPartidoIndividual(p) &&
                              p !== actorPredictivo,
                          ),
                      ),
                    )
                      .sort()
                      .map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Modo Colombia: actor principal manual (partido nuevo sin histórico) */}
              {modoBallesteros && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-3 sm:flex-row sm:items-end">
                  <div>
                    <label className="label text-xs">
                      Actor principal nuevo (sin histórico)
                    </label>
                    <input
                      type="text"
                      value={actorManual.nombre}
                      onChange={(e) => {
                        const nombre = e.target.value;
                        setActorManual((prev) => ({
                          ...prev,
                          nombre,
                        }));
                        if (nombre.trim()) {
                          setActorPredictivo("");
                        }
                      }}
                      placeholder="Ej. Movimiento de Salvación Nacional"
                      className="input text-sm sm:w-56"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">
                      Votos proyectados 2027
                    </label>
                    <input
                      type="text"
                      value={actorManual.votos2027}
                      onChange={(e) =>
                        setActorManual((prev) => ({
                          ...prev,
                          votos2027: e.target.value,
                        }))
                      }
                      placeholder="Votos estimados"
                      className={`input text-sm sm:w-40 ${
                        actorManual.nombre.trim() && !Number(actorManual.votos2027.replace(/[^0-9]/g, ""))
                          ? "border-red-300 ring-1 ring-red-300"
                          : ""
                      }`}
                    />
                    {actorManual.nombre.trim() && !Number(actorManual.votos2027.replace(/[^0-9]/g, "")) && (
                      <span className="text-[10px] text-red-600">
                        Ingresa votos proyectados para activar el análisis
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Modo Colombia: calcular votos del actor nuevo desde base presidencial 2026 */}
              {modoBallesteros && (
                <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50 p-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-primary-900">
                      Base presidencial Capitanejo 2026
                    </p>
                    <p className="text-[10px] text-primary-700">
                      Abelardo de la Espriella: 2,538 votos (2da vuelta). Aplicar
                      descuento del 30% por participación intermedia ={" "}
                      <strong>1,777 votos</strong>.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActorManual((prev) => ({
                        nombre: prev.nombre || "Movimiento de Salvación Nacional",
                        votos2027: String(Math.round(2538 * 0.7)),
                      }));
                      setActorPredictivo("");
                    }}
                    className="btn-primary h-fit whitespace-nowrap text-xs"
                  >
                    Aplicar base presidencial
                  </button>
                </div>
              )}

              {/* Modo Colombia: actor nuevo que no aparece en históricos */}
              {modoBallesteros && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div>
                    <label className="label text-xs">
                      Actor nuevo (no aparece en históricos)
                    </label>
                    <input
                      type="text"
                      value={actorNuevo.nombre}
                      onChange={(e) =>
                        setActorNuevo((prev) => ({
                          ...prev,
                          nombre: e.target.value,
                        }))
                      }
                      placeholder="Nombre del actor nuevo"
                      className="input text-sm sm:w-48"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">
                      Votos proyectados 2027
                    </label>
                    <input
                      type="text"
                      value={actorNuevo.votos2027}
                      onChange={(e) =>
                        setActorNuevo((prev) => ({
                          ...prev,
                          votos2027: e.target.value,
                        }))
                      }
                      placeholder="0"
                      className="input text-sm sm:w-40"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setActorPredictivo(kpis.actorPrincipal || "");
                  setRivalPredictivo("");
                  setActorManual({ nombre: "", votos2027: "" });
                  if (modoBallesteros) {
                    setRivalesPredictivo([]);
                    setActorNuevo({ nombre: "", votos2027: "" });
                  }
                }}
                className="btn-secondary h-fit text-xs"
              >
                Volver a actor principal
              </button>
            </div>

            {/* KPIs predictivos */}
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                title="Votos para vencer al rival"
                value={analisisPredictivo.votosParaGanar.toLocaleString()}
                subtitle={`Rival: ${analisisPredictivo.rivalPartido || "—"}`}
                icon={Award}
                color="text-amber-600"
              />
              <KpiCard
                title="Proyección 2027"
                value={analisisPredictivo.proyeccionFinal.toLocaleString()}
                subtitle="Votos proyectados"
                icon={TrendingUp}
                color="text-primary-600"
              />
              <KpiCard
                title="Diferencia vs ganar"
                value={
                  analisisPredictivo.diferenciaVsGanar >= 0
                    ? `+${analisisPredictivo.diferenciaVsGanar.toLocaleString()}`
                    : analisisPredictivo.diferenciaVsGanar.toLocaleString()
                }
                subtitle="Sobre votos necesarios"
                icon={Target}
                color={
                  analisisPredictivo.diferenciaVsGanar >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }
              />
              <KpiCard
                title="Meta por sección"
                value={analisisPredictivo.metaPorSeccion.toLocaleString()}
                subtitle={`En ${analisisPredictivo.seccionesTotales} secciones`}
                icon={MapPin}
                color="text-blue-600"
              />
            </div>

            {/* Veredicto explicado */}
            <div
              className={`mb-6 rounded-lg border p-4 ${
                analisisPredictivo.veredicto === "gana"
                  ? "border-green-200 bg-green-50"
                  : analisisPredictivo.veredicto === "empate"
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
              }`}
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-secondary-900">
                    {analisisPredictivo.veredicto === "gana" &&
                      `Según la tendencia histórica, ${analisisPredictivo.actorPrincipal} vencería a ${analisisPredictivo.rivalPartido || "el rival"} en 2027.`}
                    {analisisPredictivo.veredicto === "empate" &&
                      `La proyección queda dentro del margen de empate técnico (±3%) respecto a ${analisisPredictivo.rivalPartido || "el rival"}. ${analisisPredictivo.actorPrincipal} necesita reforzar operación.`}
                    {analisisPredictivo.veredicto === "pierde" &&
                      `Con la tendencia actual, ${analisisPredictivo.actorPrincipal} perdería contra ${analisisPredictivo.rivalPartido || "el rival"} en 2027.`}
                  </p>
                  <p className="text-xs text-secondary-600">
                    Proyección {analisisPredictivo.actorPrincipal}:{" "}
                    {analisisPredictivo.proyeccionFinal.toLocaleString()} votos
                    · Rival {analisisPredictivo.rivalPartido || "—"}:{" "}
                    {analisisPredictivo.rivalProyeccion.toLocaleString()} votos
                    {" · "}Brecha:{" "}
                    {analisisPredictivo.diferenciaVsGanar >= 0
                      ? `+${analisisPredictivo.diferenciaVsGanar.toLocaleString()}`
                      : analisisPredictivo.diferenciaVsGanar.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Ranking compacto + duelo visual */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                <h4 className="mb-2 text-sm font-bold text-secondary-900">
                  Ranking proyectado 2027
                </h4>
                <div className="space-y-1">
                  {(
                    modoBallesteros
                      ? analisisPredictivo.proyeccionesConActorNuevo || analisisPredictivo.proyeccionesTodos
                      : analisisPredictivo.proyeccionesTodos
                  )
                    .slice(0, 8)
                    .map((p, idx) => {
                      const esActor =
                        p.partido === analisisPredictivo.actorPrincipal;
                      const esRival = modoBallesteros
                        ? rivalesPredictivo.includes(p.partido) ||
                          p.partido === actorNuevo.nombre.trim()
                        : p.partido === analisisPredictivo.rivalPartido;
                      const esActorManual =
                        analisisPredictivo.actorManualItem?.partido === p.partido;
                      const color =
                        PARTIDO_COLORS[p.partido.toUpperCase()] || "#6b7280";
                      return (
                        <div
                          key={p.partido}
                          className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${
                            esActor
                              ? "bg-primary-50 font-semibold text-primary-900"
                              : esRival
                                ? "font-semibold text-secondary-900"
                                : "bg-secondary-50 text-secondary-700"
                          }`}
                          style={
                            esRival
                              ? {
                                  backgroundColor: `${analisisPredictivo.rivalColor}22`,
                                }
                              : undefined
                          }
                        >
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="w-4 text-right">{idx + 1}.</span>
                            {p.partido}
                            {esActor && (
                              <span className="rounded bg-primary-200 px-1 py-0 text-[10px]">
                                TÚ
                              </span>
                            )}
                            {esActorManual && (
                              <span className="rounded bg-primary-200 px-1 py-0 text-[10px]">
                                PARTIDO NUEVO
                              </span>
                            )}
                            {esRival && (
                              <span
                                className="rounded px-1 py-0 text-[10px] text-white"
                                style={{
                                  backgroundColor:
                                    analisisPredictivo.rivalColor,
                                }}
                              >
                                RIVAL
                              </span>
                            )}
                          </span>
                          <span>{p.votos.toLocaleString()}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="rounded-lg border border-secondary-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-secondary-900">
                    Proyección electoral 2027
                  </h4>
                  <span className="text-xs text-secondary-500">
                    Resultado proyectado
                  </span>
                </div>
                {(() => {
                  const datosBase = modoBallesteros
                    ? (analisisPredictivo.proyeccionesConActorNuevo || analisisPredictivo.proyeccionesTodos)
                    : analisisPredictivo.proyeccionesTodos;
                  const datos = datosBase.slice(0, 8);
                  const total = datosBase.reduce(
                    (acc, p) => acc + p.votos,
                    0,
                  );
                  const radius = 72;
                  const cx = 110;
                  const cy = 90;
                  let acc = 0;
                  const slices = datos.map((d) => {
                    const pct = total > 0 ? d.votos / total : 0;
                    const start = acc;
                    const end = acc + pct;
                    acc = end;
                    return { ...d, pct, start, end };
                  });
                  function coord(a: number) {
                    const angle = (a - 0.25) * Math.PI * 2;
                    return [
                      cx + radius * Math.cos(angle),
                      cy + radius * Math.sin(angle),
                    ];
                  }
                  return (
                    <div className="flex flex-col items-center gap-4 sm:flex-row">
                      <div className="relative">
                        <svg width={220} height={180} viewBox="0 0 220 180">
                          {slices.map((s) => {
                            const color =
                              PARTIDO_COLORS[s.partido.toUpperCase()] ||
                              "#6b7280";
                            const [x1, y1] = coord(s.start);
                            const [x2, y2] = coord(s.end);
                            const large = s.end - s.start > 0.5 ? 1 : 0;
                            return (
                              <path
                                key={s.partido}
                                d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`}
                                fill={color}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            );
                          })}
                          <text
                            x={cx}
                            y={cy - 4}
                            textAnchor="middle"
                            className="fill-secondary-900 text-[11px] font-bold"
                          >
                            2027
                          </text>
                          <text
                            x={cx}
                            y={cy + 12}
                            textAnchor="middle"
                            className="fill-secondary-500 text-[9px]"
                          >
                            {total.toLocaleString()} votos
                          </text>
                        </svg>
                        {slices[0] && (
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-base">
                            👑
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-2">
                          {slices.map((s) => {
                            const color =
                              PARTIDO_COLORS[s.partido.toUpperCase()] ||
                              "#6b7280";
                            return (
                              <div
                                key={s.partido}
                                className="flex items-center gap-2 rounded-lg border border-secondary-100 bg-white p-2"
                              >
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: color }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="truncate text-xs font-bold">
                                      {s.partido}
                                    </span>
                                    <span className="text-[10px] text-secondary-500">
                                      {(s.pct * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-secondary-600">
                                    {s.votos.toLocaleString()} votos
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Gráfica de proyección final 2027 */}
            <div className="mb-6 rounded-lg border border-secondary-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-secondary-900">
                  Simulación del resultado 2027
                </h4>
                <span className="text-xs text-secondary-500">
                  {analisisPredictivo.proyeccionesTodos
                    .reduce((acc, p) => acc + p.votos, 0)
                    .toLocaleString()}{" "}
                  votos proyectados totales
                </span>
              </div>
              {(() => {
                const datosBase = modoBallesteros
                  ? (analisisPredictivo.proyeccionesConActorNuevo || analisisPredictivo.proyeccionesTodos)
                  : analisisPredictivo.proyeccionesTodos;
                const total = datosBase.reduce(
                  (acc, p) => acc + p.votos,
                  0,
                );
                const maxVotos = Math.max(
                  ...datosBase.map((p) => p.votos),
                  1,
                );
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {datosBase
                        .slice(0, 8)
                        .map((p) => {
                          const esActor =
                            p.partido === analisisPredictivo.actorPrincipal;
                          const esRival = modoBallesteros
                            ? rivalesPredictivo.includes(p.partido) ||
                              p.partido === actorNuevo.nombre.trim()
                            : p.partido === analisisPredictivo.rivalPartido;
                          const color =
                            PARTIDO_COLORS[p.partido.toUpperCase()] ||
                            "#6b7280";
                          const pctTotal =
                            total > 0 ? (p.votos / total) * 100 : 0;
                          return (
                            <div
                              key={p.partido}
                              className={`rounded-lg border p-2 ${
                                esActor || esRival
                                  ? "border-primary-200 bg-primary-50"
                                  : "border-secondary-200 bg-white"
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-xs font-bold">
                                  {p.partido}
                                </span>
                                {esActor && (
                                  <span className="rounded bg-primary-200 px-1 py-0 text-[10px]">
                                    TÚ
                                  </span>
                                )}
                                {esRival && (
                                  <span
                                    className="rounded px-1 py-0 text-[10px] text-white"
                                    style={{
                                      backgroundColor:
                                        analisisPredictivo.rivalColor,
                                    }}
                                  >
                                    RIVAL
                                  </span>
                                )}
                              </div>
                              <p className="text-lg font-bold text-secondary-900">
                                {p.votos.toLocaleString()}
                              </p>
                              <p className="text-[10px] text-secondary-500">
                                {pctTotal.toFixed(1)}% del total proyectado
                              </p>
                              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary-100">
                                <div
                                  className="h-2 rounded-full"
                                  style={{
                                    backgroundColor: color,
                                    width: `${(p.votos / maxVotos) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    <div className="mt-2 rounded-lg bg-secondary-50 p-3">
                      <div className="mb-2 text-xs font-semibold text-secondary-700">
                        Distribución de votos 2027
                      </div>
                      <div className="flex h-6 w-full overflow-hidden rounded-md">
                        {datosBase
                          .slice(0, 8)
                          .map((p) => {
                            const color =
                              PARTIDO_COLORS[p.partido.toUpperCase()] ||
                              "#6b7280";
                            const width =
                              total > 0 ? (p.votos / total) * 100 : 0;
                            return (
                              <div
                                key={p.partido}
                                className="relative h-full"
                                style={{
                                  width: `${width}%`,
                                  backgroundColor: color,
                                }}
                                title={`${p.partido}: ${p.votos.toLocaleString()} (${width.toFixed(1)}%)`}
                              >
                                {width > 8 && (
                                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                                    {p.partido}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Gráfica de tendencia histórica actor vs rival */}
            <div className="mb-6 rounded-lg border border-secondary-200 bg-white p-4">
              <h4 className="mb-3 text-sm font-bold text-secondary-900">
                Tendencia histórica {analisisPredictivo.actorPrincipal} vs{" "}
                {modoBallesteros
                  ? (rivalesPredictivo.join(", ") || "rivales")
                  : (analisisPredictivo.rivalPartido || "rival")}
              </h4>
              {(() => {
                const rivalesTendencia = modoBallesteros
                  ? (rivalesPredictivo.length > 0 ? rivalesPredictivo : [analisisPredictivo.rivalPartido]).filter(Boolean)
                  : [analisisPredictivo.rivalPartido].filter(Boolean);
                const datos = analisisPredictivo.evolucion.map((e) => ({
                  anio: e.anio,
                  actor: e.actorVotos,
                  rivales: rivalesTendencia.map((r) => ({
                    partido: r,
                    votos: e.anio === 2027
                      ? (analisisPredictivo.proyeccionesConActorNuevo || analisisPredictivo.proyeccionesTodos).find((p) => p.partido === r)?.votos || 0
                      : e.otros.find((o) => o.partido === r)?.votos || 0,
                  })),
                }));
                const maxVotos = Math.max(
                  ...datos.flatMap((d) => [d.actor, ...d.rivales.map((r) => r.votos)]),
                  1,
                );
                return (
                  <div className="space-y-2">
                    <div
                      className="flex items-end gap-2"
                      style={{ height: 150 }}
                    >
                      {datos.map((d) => (
                        <div
                          key={d.anio}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <div className="relative flex w-full items-end justify-center gap-1">
                            <div
                              className="w-4 rounded-t"
                              style={{
                                backgroundColor: "#16a34a",
                                height: `${(d.actor / maxVotos) * 120}px`,
                              }}
                              title={`${analisisPredictivo.actorPrincipal} ${d.anio}: ${d.actor.toLocaleString()}`}
                            />
                            {d.rivales.map((r, i) => {
                              const rivalColor = PARTIDO_COLORS[r.partido?.toUpperCase() || ""] || `hsl(${(i * 60 + 30) % 360}, 60%, 45%)`;
                              return (
                                <div
                                  key={r.partido}
                                  className="w-3 rounded-t"
                                  style={{
                                    backgroundColor: rivalColor,
                                    height: `${(r.votos / maxVotos) * 120}px`,
                                  }}
                                  title={`${r.partido} ${d.anio}: ${r.votos.toLocaleString()}`}
                                />
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-secondary-600">
                            {d.anio}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                      <span className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: "#16a34a" }}
                        />{" "}
                        {analisisPredictivo.actorPrincipal}
                      </span>
                      {rivalesTendencia.map((r, i) => (
                        <span key={r} className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor:
                                PARTIDO_COLORS[r?.toUpperCase() || ""] || `hsl(${(i * 60 + 30) % 360}, 60%, 45%)`,
                            }}
                          />{" "}
                          {r || "Rival"}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Simulador de alianzas */}
            {analisisPredictivo.ultimoPrincipal && (
              <div className="mb-6 rounded-lg border border-secondary-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-secondary-900">
                    Simulador de alianzas
                  </h4>
                  <span className="text-xs text-secondary-500">
                    Base: {analisisPredictivo.ultimoPrincipal.anio} —{" "}
                    {analisisPredictivo.ultimoPrincipal.total_votos.toLocaleString()}{" "}
                    votos
                  </span>
                </div>
                <p className="mb-3 text-xs text-secondary-600">
                  Armá combinaciones de partidos usando los votos reales de la
                  última elección. El ranking combinado muestra dónde quedaría
                  cada alianza tanto en{" "}
                  {analisisPredictivo.ultimoPrincipal.anio} como proyectada a
                  2027.
                </p>

                {/* Selector de rival para alianzas */}
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
                  <div className="sm:w-64">
                    <label className="label text-xs">
                      Rival a vencer con alianzas
                    </label>
                    <select
                      value={rivalAlianzas}
                      onChange={(e) => setRivalAlianzas(e.target.value)}
                      className="input text-sm"
                    >
                      <option value="">— Igual que el rival principal —</option>
                      {Array.from(
                        new Set(
                          (resumen?.agrupados || [])
                            .flatMap((g) => g.partidos.map((p) => p.partido))
                            .filter(
                              (p): p is string =>
                                Boolean(p) && esPartidoIndividual(p),
                            ),
                        ),
                      )
                        .sort()
                        .map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setRivalAlianzas(rivalPredictivo)}
                    className="btn-secondary h-fit text-xs"
                  >
                    Usar rival principal
                  </button>
                </div>

                <div className="space-y-3">
                  {alianzas.map((alianza) => (
                    <div
                      key={alianza.id}
                      className="rounded-lg border border-secondary-200 bg-secondary-50 p-3"
                    >
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={alianza.nombre}
                          placeholder="Nombre de la alianza"
                          onChange={(e) =>
                            setAlianzas((prev) =>
                              prev.map((a) =>
                                a.id === alianza.id
                                  ? { ...a, nombre: e.target.value }
                                  : a,
                              ),
                            )
                          }
                          className="input text-sm sm:w-64"
                        />
                        <button
                          onClick={() =>
                            setAlianzas((prev) =>
                              prev.filter((a) => a.id !== alianza.id),
                            )
                          }
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analisisPredictivo.ultimoPrincipal.partidos
                          .filter((p) => esPartidoIndividual(p.partido))
                          .map((p) => (
                            <label
                              key={p.partido}
                              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                                alianza.partidos.includes(p.partido)
                                  ? "border-primary-300 bg-primary-50 text-primary-800"
                                  : "border-secondary-200 bg-white text-secondary-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-secondary-300 text-primary-600"
                                checked={alianza.partidos.includes(p.partido)}
                                onChange={(e) => {
                                  setAlianzas((prev) =>
                                    prev.map((a) =>
                                      a.id === alianza.id
                                        ? {
                                            ...a,
                                            partidos: e.target.checked
                                              ? [...a.partidos, p.partido]
                                              : a.partidos.filter(
                                                  (x: string) =>
                                                    x !== p.partido,
                                                ),
                                          }
                                        : a,
                                    ),
                                  );
                                }}
                              />
                              {p.partido}
                            </label>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setAlianzas((prev) => [
                      ...prev,
                      {
                        id: Math.random().toString(36).slice(2),
                        nombre: "",
                        partidos: [],
                      },
                    ])
                  }
                  className="btn-secondary mt-3 flex items-center gap-1 text-xs"
                >
                  <Plus size={14} /> Agregar alianza
                </button>

                {/* Ranking combinado 2024 vs 2027 */}
                {alianzas.some((a) => a.partidos.length > 0) && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-secondary-200 bg-white p-3">
                      <h5 className="mb-2 text-xs font-bold text-secondary-900">
                        Ranking combinado{" "}
                        {analisisPredictivo.ultimoPrincipal.anio} (con alianzas)
                      </h5>
                      <div className="space-y-1.5">
                        {analisisPredictivo.ranking2024
                          .slice(0, 7)
                          .map((p, idx) => (
                            <div
                              key={p.clave}
                              className={`flex items-center justify-between rounded-md p-1.5 text-xs ${
                                p.esAlianza
                                  ? "bg-primary-50 font-medium text-primary-900"
                                  : "bg-secondary-50 text-secondary-700"
                              }`}
                            >
                              <span className="truncate pr-2">
                                {idx + 1}. {p.nombre}{" "}
                                {p.esAlianza && `(${p.partidos.join("+")})`}
                              </span>
                              <span className="whitespace-nowrap">
                                {p.votos.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-secondary-200 bg-white p-3">
                      <h5 className="mb-2 text-xs font-bold text-secondary-900">
                        Ranking proyectado 2027 (con alianzas)
                      </h5>
                      <div className="space-y-1.5">
                        {analisisPredictivo.ranking2027
                          .slice(0, 7)
                          .map((p, idx) => (
                            <div
                              key={p.clave}
                              className={`flex items-center justify-between rounded-md p-1.5 text-xs ${
                                p.esAlianza
                                  ? "bg-primary-50 font-medium text-primary-900"
                                  : "bg-secondary-50 text-secondary-700"
                              }`}
                            >
                              <span className="truncate pr-2">
                                {idx + 1}. {p.nombre}{" "}
                                {p.esAlianza && `(${p.partidos.join("+")})`}
                              </span>
                              <span className="whitespace-nowrap">
                                {p.votos.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Análisis detallado por alianza */}
                {alianzas.some((a) => a.partidos.length > 0) && (
                  <div className="mt-6 space-y-4">
                    {alianzas
                      .filter((a) => a.partidos.length > 0)
                      .map((alianza) => {
                        const votos2024 = alianza.partidos.reduce(
                          (acc, p) =>
                            acc +
                            (analisisPredictivo.ultimoPrincipal?.partidos.find(
                              (x) => x.partido === p,
                            )?.votos || 0),
                          0,
                        );
                        const proyeccion2027 = alianza.partidos.reduce(
                          (acc, p) =>
                            acc +
                            (analisisPredictivo.proyeccionesTodos.find(
                              (x) => x.partido === p,
                            )?.votos || 0),
                          0,
                        );
                        const rivalVotos =
                          analisisPredictivo.rivalAlianzasProyeccion;
                        const rivalNombre =
                          analisisPredictivo.rivalAlianzasPartido;
                        const rivalColorAlianza =
                          analisisPredictivo.rivalAlianzasColor;
                        const maxDuelo = Math.max(
                          proyeccion2027,
                          rivalVotos,
                          1,
                        );
                        const difVsRival = proyeccion2027 - rivalVotos;
                        const votosParaVencerRival =
                          rivalVotos > 0 ? rivalVotos + 1 : 0;
                        const veredictoAlianza: "gana" | "empate" | "pierde" =
                          rivalVotos > 0
                            ? difVsRival >= rivalVotos * 0.03
                              ? "gana"
                              : Math.abs(difVsRival) <= rivalVotos * 0.03
                                ? "empate"
                                : "pierde"
                            : "pierde";

                        return (
                          <div
                            key={alianza.id}
                            className="rounded-lg border border-secondary-200 bg-white p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-secondary-900">
                                  {alianza.nombre || "Alianza sin nombre"}
                                </h5>
                                <span className="text-xs text-secondary-500">
                                  {alianza.partidos.join(" + ")}
                                </span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  veredictoAlianza === "gana"
                                    ? "bg-green-100 text-green-700"
                                    : veredictoAlianza === "empate"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-red-100 text-red-700"
                                }`}
                              >
                                {veredictoAlianza === "gana"
                                  ? "Vencería al rival"
                                  : veredictoAlianza === "empate"
                                    ? "Empate técnico"
                                    : "Perdería vs rival"}
                              </span>
                            </div>

                            <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-2">
                                <p className="text-[10px] text-secondary-500">
                                  Votos{" "}
                                  {analisisPredictivo.ultimoPrincipal.anio}
                                </p>
                                <p className="text-sm font-bold text-secondary-900">
                                  {votos2024.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-2">
                                <p className="text-[10px] text-secondary-500">
                                  Proyección 2027
                                </p>
                                <p className="text-sm font-bold text-secondary-900">
                                  {proyeccion2027.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-2">
                                <p className="text-[10px] text-secondary-500">
                                  Votos para vencer a {rivalNombre || "rival"}
                                </p>
                                <p className="text-sm font-bold text-secondary-900">
                                  {votosParaVencerRival.toLocaleString()}
                                </p>
                              </div>
                              <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-2">
                                <p className="text-[10px] text-secondary-500">
                                  Diferencia vs rival
                                </p>
                                <p
                                  className={`text-sm font-bold ${
                                    difVsRival >= 0
                                      ? "text-green-700"
                                      : "text-red-700"
                                  }`}
                                >
                                  {difVsRival >= 0
                                    ? `+${difVsRival.toLocaleString()}`
                                    : difVsRival.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="mb-2 text-xs font-semibold text-secondary-700">
                              Duelo 2027: alianza vs {rivalNombre || "rival"}
                            </div>
                            <div className="space-y-2">
                              <div>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-primary-900">
                                    {alianza.nombre || "Alianza"}
                                  </span>
                                  <span className="font-medium">
                                    {proyeccion2027.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-4 w-full overflow-hidden rounded-full bg-secondary-100">
                                  <div
                                    className="h-4 rounded-full bg-primary-500"
                                    style={{
                                      width: `${(proyeccion2027 / maxDuelo) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 flex items-center justify-between text-xs">
                                  <span className="font-semibold text-secondary-900">
                                    {rivalNombre || "Rival"}
                                  </span>
                                  <span className="font-medium">
                                    {rivalVotos.toLocaleString()}
                                  </span>
                                </div>
                                <div className="h-4 w-full overflow-hidden rounded-full bg-secondary-100">
                                  <div
                                    className="h-4 rounded-full transition-all"
                                    style={{
                                      backgroundColor: rivalColorAlianza,
                                      width: `${(rivalVotos / maxDuelo) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Ranking combinado 2024 vs 2027 */}
                {alianzas.some((a) => a.partidos.length > 0) && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-secondary-200 bg-white p-3">
                      <h5 className="mb-2 text-xs font-bold text-secondary-900">
                        Ranking combinado{" "}
                        {analisisPredictivo.ultimoPrincipal.anio} (con alianzas)
                      </h5>
                      <div className="space-y-1.5">
                        {analisisPredictivo.ranking2024
                          .slice(0, 7)
                          .map((p, idx) => (
                            <div
                              key={p.clave}
                              className={`flex items-center justify-between rounded-md p-1.5 text-xs ${
                                p.esAlianza
                                  ? "bg-primary-50 font-medium text-primary-900"
                                  : "bg-secondary-50 text-secondary-700"
                              }`}
                            >
                              <span className="truncate pr-2">
                                {idx + 1}. {p.nombre}{" "}
                                {p.esAlianza && `(${p.partidos.join("+")})`}
                              </span>
                              <span className="whitespace-nowrap">
                                {p.votos.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <div className="rounded-lg border border-secondary-200 bg-white p-3">
                      <h5 className="mb-2 text-xs font-bold text-secondary-900">
                        Ranking proyectado 2027 (con alianzas)
                      </h5>
                      <div className="space-y-1.5">
                        {analisisPredictivo.ranking2027
                          .slice(0, 7)
                          .map((p, idx) => (
                            <div
                              key={p.clave}
                              className={`flex items-center justify-between rounded-md p-1.5 text-xs ${
                                p.esAlianza
                                  ? "bg-primary-50 font-medium text-primary-900"
                                  : "bg-secondary-50 text-secondary-700"
                              }`}
                            >
                              <span className="truncate pr-2">
                                {idx + 1}. {p.nombre}{" "}
                                {p.esAlianza && `(${p.partidos.join("+")})`}
                              </span>
                              <span className="whitespace-nowrap">
                                {p.votos.toLocaleString()}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tabla de evolución histórica */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-secondary-200 text-left text-secondary-500">
                  <tr>
                    <th className="py-2 pr-4">Año</th>
                    <th className="py-2 pr-4">
                      {analisisPredictivo.actorPrincipal}
                    </th>
                    <th className="py-2 pr-4">% sobre lista nominal</th>
                    <th className="py-2 pr-4">Ganador real</th>
                    <th className="py-2 pr-4">Brecha vs ganador</th>
                    <th className="py-2 pr-4">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {analisisPredictivo.evolucion.map((e) => (
                    <tr key={e.anio}>
                      <td className="py-2 pr-4 font-medium text-secondary-900">
                        {e.anio}
                      </td>
                      <td className="py-2 pr-4 font-semibold text-secondary-900">
                        {e.actorVotos.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-secondary-700">
                        {e.actorPctLista.toFixed(2)}%
                      </td>
                      <td className="py-2 pr-4 text-secondary-700">
                        {e.ganadorPartido} {e.ganadorVotos.toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 text-secondary-700">
                        {e.brechaVsGanador > 0
                          ? `-${e.brechaVsGanador.toLocaleString()}`
                          : "Ganó"}
                      </td>
                      <td className="py-2 pr-4 text-secondary-700">
                        {e.participacion.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-secondary-200 bg-secondary-50 p-3 text-sm text-secondary-600">
              <strong>Votos capturables históricos:</strong> aproximadamente{" "}
              {analisisPredictivo.votosCapturables.toLocaleString()} votos (
              {analisisPredictivo.abstencionPromedioPct.toFixed(2)}% de
              abstención promedio) que no acudieron a votar en elecciones
              pasadas.
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderListado = () => {
    return (
      <div className="space-y-6">
        {/* Filtros */}
        <div className="card p-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label">Tipo histórico</label>
              <select
                value={filtros.tipo_historico}
                onChange={(e) =>
                  setFiltros({ ...filtros, tipo_historico: e.target.value })
                }
                className="input"
              >
                <option value="">Todos</option>
                <option value="principal">Principal</option>
                <option value="complementario">Complementario</option>
              </select>
            </div>
            <div>
              <label className="label">Tipo elección</label>
              <select
                value={filtros.tipo_eleccion}
                onChange={(e) =>
                  setFiltros({ ...filtros, tipo_eleccion: e.target.value })
                }
                className="input"
              >
                <option value="">Todas</option>
                {Object.entries(TIPO_ELECCION_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <select
                value={filtros.anio}
                onChange={(e) =>
                  setFiltros({ ...filtros, anio: e.target.value })
                }
                className="input"
              >
                <option value="">Todos</option>
                {Array.from(new Set((resultados || []).map((r) => r.anio)))
                  .sort((a, b) => b - a)
                  .map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="label">Sección</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                <input
                  type="text"
                  value={filtros.seccion}
                  onChange={(e) =>
                    setFiltros({ ...filtros, seccion: e.target.value })
                  }
                  placeholder="Ej. 0123"
                  className="input pl-9"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabla compacta */}
        <div className="card p-4">
          {agrupadosFiltrados.length === 0 ? (
            <p className="text-sm text-secondary-500">
              No hay históricos cargados para los filtros seleccionados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50 text-secondary-700">
                  <tr>
                    <th className="px-4 py-3 text-left">Histórico</th>
                    <th className="px-4 py-3 text-left">Elección</th>
                    <th className="px-4 py-3 text-left">Año</th>
                    <th className="px-4 py-3 text-left">Territorio</th>
                    <th className="px-4 py-3 text-right">Registros</th>
                    <th className="px-4 py-3 text-right">Secciones</th>
                    <th className="px-4 py-3 text-right">Casillas</th>
                    <th className="px-4 py-3 text-right">Total votos</th>
                    <th className="px-4 py-3 text-left">Actor principal</th>
                    <th className="px-4 py-3 text-left">Top actores</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {agrupadosFiltrados.map((g, idx) => (
                    <tr
                      key={idx}
                      onClick={() => abrirDetalle(g)}
                      className="cursor-pointer hover:bg-secondary-50"
                    >
                      <td className="px-4 py-3 font-medium text-secondary-900">
                        {TIPO_HISTORICO_LABEL[g.tipo_historico] ||
                          g.tipo_historico}
                      </td>
                      <td className="px-4 py-3 text-secondary-700">
                        {TIPO_ELECCION_LABEL[g.tipo_eleccion] ||
                          g.tipo_eleccion}
                      </td>
                      <td className="px-4 py-3 text-secondary-700">{g.anio}</td>
                      <td className="px-4 py-3 text-secondary-700">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-secondary-400" />
                          {g.municipio_id
                            ? `Municipio ${g.municipio_id}`
                            : g.estado_id
                              ? `Estado ${g.estado_id}`
                              : "Sin territorio"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(g.registros ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(g.secciones ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(g.casillas ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(g.total_votos ?? 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {g.partido_principal ? (
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                            style={{
                              backgroundColor:
                                PARTIDO_COLORS[
                                  g.partido_principal.toUpperCase()
                                ] || PARTIDO_COLORS.OTRO,
                            }}
                          >
                            {g.partido_principal}{" "}
                            {(
                              g.partidos.find(
                                (p) => p.partido === g.partido_principal,
                              )?.votos || 0
                            ).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-secondary-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DesglosePreview
                          desglose={g.partidos}
                          principal={g.partido_principal}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminarLote(g);
                          }}
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                          title="Eliminar histórico"
                        >
                          <Trash2 size={18} />
                        </button>
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
  };

  const renderDetalle = () => {
    if (!historicoSeleccionado) return null;
    return (
      <DetalleView
        h={historicoSeleccionado}
        onDashboard={() => setVista("dashboard")}
        onListado={() => setVista("listado")}
      />
    );
  };

  const renderAnalisis = () => {
    if (cruceLoading) {
      return (
        <div className="flex h-96 items-center justify-center rounded-lg border border-secondary-200 bg-white">
          <div className="flex flex-col items-center gap-2 text-secondary-500">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
            <span className="text-sm">Cargando análisis territorial...</span>
          </div>
        </div>
      );
    }
    if (cruceError) {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={16} />
            Error al cargar el análisis
          </div>
          <p className="mt-1">{cruceError}</p>
        </div>
      );
    }
    if (
      !cruceData ||
      !cruceData.secciones ||
      cruceData.secciones.length === 0
    ) {
      return (
        <div className="rounded-lg border border-secondary-200 bg-white px-6 py-8 text-center text-secondary-500">
          <MapIcon size={32} className="mx-auto mb-2 text-secondary-300" />
          <p>No hay datos suficientes para el análisis territorial cruzado.</p>
          <p className="mt-1 text-xs">
            Se requieren al menos dos elecciones históricas del mismo tipo.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-secondary-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">
                Análisis territorial cruzado
              </h3>
              <p className="text-sm text-secondary-500">
                Bloque {cruceData.metadata?.bloque || "PRI"} · Elecciones:{" "}
                {(cruceData.metadata?.anios || []).join(", ")} ·{" "}
                {cruceData.secciones.length} secciones
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSubVistaAnalisis("mapa")}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  subVistaAnalisis === "mapa"
                    ? "bg-primary-600 text-white"
                    : "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                }`}
              >
                <MapIcon size={16} /> Mapa
              </button>
              <button
                onClick={() => setSubVistaAnalisis("tabla")}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  subVistaAnalisis === "tabla"
                    ? "bg-primary-600 text-white"
                    : "bg-secondary-100 text-secondary-700 hover:bg-secondary-200"
                }`}
              >
                <Table2 size={16} /> Tabla
              </button>
            </div>
          </div>

          {subVistaAnalisis === "mapa" && (
            <div className="mt-4">
              <MapaCruceHistorico
                cruce={cruceData.secciones}
                seccionesINE={cruceSeccionesINE}
                bloque={cruceData.metadata?.bloque || []}
              />
            </div>
          )}
          {subVistaAnalisis === "tabla" && (
            <div className="mt-4">
              <TablaCruceHistorico
                cruce={cruceData.secciones}
                anios={cruceData.metadata?.anios || []}
                bloque={cruceData.metadata?.bloque || []}
              />
            </div>
          )}
        </div>
      </div>
    );
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary-900">
            <Icon name="historico" size={28} className="text-primary-600" />
            Histórico Electoral
          </h1>
          <p className="text-sm text-secondary-500">
            Históricos principales y complementarios por casilla para
            inteligencia electoral.
          </p>
        </div>

        <div className="flex gap-2">
          {vista !== "dashboard" && (
            <button
              onClick={() => setVista("dashboard")}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
          )}
          {vista !== "listado" && (
            <button
              onClick={() => setVista("listado")}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            >
              <Table2 size={16} /> Listado
            </button>
          )}
          {vista !== "analisis" && (
            <button
              onClick={() => {
                cargarCruce();
                setVista("analisis");
              }}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            >
              <MapIcon size={16} /> Análisis territorial
            </button>
          )}
          <button
            onClick={() => {
              resetWizard();
              setVista("wizard");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              vista === "wizard"
                ? "bg-primary-600 text-white"
                : "bg-white text-secondary-700 hover:bg-secondary-50"
            }`}
          >
            <Upload size={16} /> Subir histórico
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {vista === "dashboard" && renderDashboard()}
      {vista === "listado" && renderListado()}
      {vista === "detalle" && renderDetalle()}
      {vista === "analisis" && renderAnalisis()}
      {vista === "wizard" && renderWizard()}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: IconComp,
  color = "text-primary-600",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  color?: string;
}) {
  const displayValue =
    value === null || value === undefined
      ? "—"
      : typeof value === "number"
        ? value.toLocaleString()
        : String(value);
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-secondary-500">
            {title}
          </p>
          <p className="text-xl font-bold text-secondary-900 sm:text-2xl">
            {displayValue}
          </p>
          {subtitle && (
            <p className="truncate text-xs text-secondary-500">{subtitle}</p>
          )}
        </div>
        {IconComp && <IconComp size={32} className={`shrink-0 ${color}`} />}
      </div>
    </div>
  );
}

function MiniBar({
  value,
  max,
  color,
  label,
  width,
}: {
  value: number;
  max: number;
  color?: string;
  label?: string;
  width?: number;
}) {
  const safeValue = typeof value === "number" ? value : 0;
  const safeMax = typeof max === "number" && max > 0 ? max : 1;
  const pct =
    width !== undefined
      ? Math.min(100, Math.max(0, width))
      : Math.min(100, Math.max(0, (safeValue / safeMax) * 100));
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        {label && (
          <span className="font-medium text-secondary-700">{label}</span>
        )}
        <span className="text-secondary-500">{safeValue.toLocaleString()}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color || "#4f46e5" }}
        />
      </div>
    </div>
  );
}

function ActoresChart({
  actores,
  principal,
  consolidado,
}: {
  actores: { partido: string; votos: number; candidato?: string }[];
  principal?: string;
  consolidado?: boolean;
}) {
  const sorted = [...actores]
    .filter((a) => a && a.partido && typeof a.votos === "number")
    .sort((a, b) => b.votos - a.votos);
  const max = sorted[0]?.votos || 1;
  return (
    <div className="space-y-2">
      {sorted.map((a) => {
        const isPrincipal = principal && a.partido === principal;
        return (
          <div
            key={a.partido}
            className={`rounded-lg ${isPrincipal ? "border border-primary-300 bg-primary-50 p-2" : "p-2"}`}
          >
            <MiniBar
              label={
                a.candidato
                  ? `${a.candidato} (${a.partido})`
                  : a.partido
              }
              value={a.votos}
              max={max}
              color={
                PARTIDO_COLORS[a.partido.toUpperCase()] || PARTIDO_COLORS.OTRO
              }
            />
          </div>
        );
      })}
      {consolidado && sorted.length === 0 && (
        <p className="text-sm text-secondary-500">
          No hay partidos individuales para consolidar.
        </p>
      )}
    </div>
  );
}

function ActoresConsolidadosChart({
  actores,
  detalle,
  principal,
}: {
  actores: { partido: string; votos: number; candidato?: string }[];
  detalle: Record<
    string,
    { individual: number; coaliciones: { nombre: string; votos: number }[] }
  >;
  principal?: string;
}) {
  const sorted = [...actores]
    .filter((a) => a && a.partido && typeof a.votos === "number")
    .sort((a, b) => b.votos - a.votos);
  const max = sorted[0]?.votos || 1;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((a) => {
        const isPrincipal = principal && a.partido === principal;
        const desglose = detalle[a.partido] || {
          individual: 0,
          coaliciones: [],
        };
        const totalCoaliciones = desglose.coaliciones.reduce(
          (acc, c) => acc + c.votos,
          0,
        );
        return (
          <div
            key={a.partido}
            className={`flex flex-col justify-between rounded-lg border p-3 ${isPrincipal ? "border-primary-300 bg-primary-50" : "border-secondary-200 bg-white"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                    style={{
                      backgroundColor:
                        PARTIDO_COLORS[a.partido.toUpperCase()] ||
                        PARTIDO_COLORS.OTRO,
                    }}
                  >
                    {a.partido}
                  </span>
                  {isPrincipal && (
                    <span className="text-xs font-semibold text-primary-700">
                      Principal
                    </span>
                  )}
                </div>
                {a.candidato && a.candidato !== a.partido && (
                  <p className="text-[11px] font-medium text-secondary-600">
                    {a.candidato}
                  </p>
                )}
              </div>
              <span className="text-lg font-bold text-secondary-900">
                {a.votos.toLocaleString()}
              </span>
            </div>
            <MiniBar
              value={a.votos}
              max={max}
              color={
                PARTIDO_COLORS[a.partido.toUpperCase()] || PARTIDO_COLORS.OTRO
              }
            />
            <div className="mt-3 space-y-1 text-xs text-secondary-600">
              <div className="flex justify-between rounded bg-secondary-50 px-2 py-1">
                <span>Voto individual</span>
                <strong className="text-secondary-900">
                  {desglose.individual.toLocaleString()}
                </strong>
              </div>
              {desglose.coaliciones.map((c) => (
                <div
                  key={c.nombre}
                  className="flex justify-between rounded bg-secondary-50 px-2 py-1"
                >
                  <span>Coalición {c.nombre}</span>
                  <strong className="text-secondary-900">
                    +{c.votos.toLocaleString()}
                  </strong>
                </div>
              ))}
              {totalCoaliciones === 0 && (
                <div className="rounded bg-secondary-50 px-2 py-1 italic text-secondary-400">
                  Sin coaliciones
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CasillasTable({
  casillas,
  principal,
}: {
  casillas: Resultado[];
  principal?: string;
}) {
  if (casillas.length === 0) {
    return (
      <p className="text-sm text-secondary-500">
        No hay casillas para mostrar.
      </p>
    );
  }
  const sorted = [...casillas].sort((a, b) => {
    const sec = String(a.seccion).localeCompare(String(b.seccion));
    if (sec !== 0) return sec;
    return String(a.casilla).localeCompare(String(b.casilla));
  });
  return (
    <div className="overflow-x-auto rounded-lg border border-secondary-200">
      <table className="w-full text-sm">
        <thead className="bg-secondary-100 text-secondary-700">
          <tr>
            <th className="px-3 py-2 text-left">Sección</th>
            <th className="px-3 py-2 text-left">Casilla</th>
            <th className="px-3 py-2 text-left">Ganador</th>
            <th className="px-3 py-2 text-right">Votos ganador</th>
            <th className="px-3 py-2 text-right">Lista nominal</th>
            <th className="px-3 py-2 text-right">Total votos</th>
            <th className="px-3 py-2 text-right">Participación</th>
            <th className="px-3 py-2 text-left">Desglose</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-secondary-50">
              <td className="px-3 py-2 font-medium text-secondary-900">
                {r.seccion}
              </td>
              <td className="px-3 py-2 text-secondary-700">{r.casilla}</td>
              <td className="px-3 py-2">
                <PartidoBadge partido={r.partido_ganador} />
              </td>
              <td className="px-3 py-2 text-right text-secondary-700">
                {r.votos_ganador?.toLocaleString() || "-"}
              </td>
              <td className="px-3 py-2 text-right text-secondary-700">
                {r.lista_nominal?.toLocaleString() || "-"}
              </td>
              <td className="px-3 py-2 text-right text-secondary-700">
                {r.total_votos?.toLocaleString() || "-"}
              </td>
              <td className="px-3 py-2 text-right text-secondary-700">
                {typeof r.participacion_pct === "number"
                  ? `${r.participacion_pct.toFixed(2)}%`
                  : r.total_votos != null &&
                      r.lista_nominal != null &&
                      r.lista_nominal > 0
                    ? `${((Number(r.total_votos) / Number(r.lista_nominal)) * 100).toFixed(2)}%`
                    : "-"}
              </td>
              <td className="px-3 py-2">
                <DesglosePreview
                  desglose={r.desglose_partidos}
                  principal={principal || r.partido_principal}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleView({
  h,
  onDashboard,
  onListado,
}: {
  h: Agrupado;
  onDashboard: () => void;
  onListado: () => void;
}) {
  const [casillas, setCasillas] = useState<Resultado[]>([]);
  const [detalleLoading, setDetalleLoading] = useState(true);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [consolidarCoaliciones, setConsolidarCoaliciones] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setDetalleLoading(true);
      setDetalleError(null);
      try {
        const params: any = {
          tipo_historico: h.tipo_historico,
          tipo_eleccion: h.tipo_eleccion,
          anio: String(h.anio),
        };
        if (h.estado_id !== undefined) params.estado_id = String(h.estado_id);
        if (h.municipio_id !== undefined)
          params.municipio_id = String(h.municipio_id);
        const { data } = await resultadosHistoricosApi.getAll(params);
        setCasillas(data || []);
      } catch (err: any) {
        setDetalleError(
          err.response?.data?.message ||
            "Error al cargar el detalle del histórico",
        );
      } finally {
        setDetalleLoading(false);
      }
    };
    cargar();
  }, [h]);

  const actores = h.partidos || [];
  const { consolidado: actoresConsolidados, detalle } = useMemo(
    () => consolidarCoalicionesActores(actores),
    [actores],
  );
  const actoresMostrados = consolidarCoaliciones
    ? actoresConsolidados
    : actores;
  const sortedActores = [...actoresMostrados]
    .filter((a) => a && typeof a.votos === "number" && a.partido)
    .sort((a, b) => b.votos - a.votos);
  const ganador = sortedActores[0];
  const principalVotos = h.partido_principal
    ? actoresMostrados.find((p) => p.partido === h.partido_principal)?.votos
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header de detalle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onDashboard}
            className="text-secondary-500 hover:text-primary-600"
          >
            Histórico Electoral
          </button>
          <ChevronRight size={14} className="text-secondary-400" />
          <span className="font-medium text-secondary-900">
            {TIPO_ELECCION_LABEL[h.tipo_eleccion] || h.tipo_eleccion} {h.anio}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onListado}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <ArrowLeft size={14} /> Volver al listado
          </button>
          <button
            onClick={onDashboard}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <LayoutDashboard size={14} /> Volver al dashboard
          </button>
        </div>
      </div>

      {/* KPIs del histórico */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Registros"
          value={h.registros}
          icon={BarChart3}
          color="text-primary-600"
        />
        <KpiCard
          title="Casillas"
          value={h.casillas}
          icon={MapPin}
          color="text-blue-600"
        />
        <KpiCard
          title="Secciones"
          value={h.secciones}
          icon={Users}
          color="text-green-600"
        />
        <KpiCard
          title="Lista nominal"
          value={casillas.reduce((acc, r) => acc + (r.lista_nominal || 0), 0)}
          subtitle="Electores registrados"
          icon={Percent}
          color="text-orange-600"
        />
        <KpiCard
          title="Total votos"
          value={h.total_votos}
          icon={Vote}
          color="text-purple-600"
        />
        <KpiCard
          title="Actor principal"
          value={
            h.partido_principal
              ? `${h.partido_principal} ${principalVotos !== undefined ? principalVotos.toLocaleString() : ""}`
              : "—"
          }
          subtitle={h.partido_principal ? "Votos del proyecto" : undefined}
          icon={BarChart3}
          color="text-primary-600"
        />
      </div>

      {/* Detalle electoral Colombia (solo si hay metadata de sabana completa) */}
      {(() => {
        const meta = casillas.find((c) => c.sabana_completa)?.sabana_completa;
        if (!meta) return null;
        const hasColombiaData =
          meta.mesas_instaladas != null ||
          meta.mesas_informadas != null ||
          meta.potential_sufragantes != null ||
          meta.votos_no_marcados != null ||
          meta.votos_blanco != null;
        if (!hasColombiaData) return null;
        return (
          <div className="card p-4">
            <div className="mb-4 flex items-center gap-2">
              <MapPin size={20} className="text-primary-600" />
              <h3 className="text-lg font-bold text-secondary-900">
                Detalle electoral (Colombia)
              </h3>
              <span className="ml-auto text-xs text-secondary-500">
                Datos del boletín oficial
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meta.mesas_instaladas != null && (
                <KpiCard
                  title="Mesas instaladas"
                  value={meta.mesas_instaladas}
                  subtitle="Puestos de votación"
                  icon={MapPin}
                  color="text-blue-600"
                />
              )}
              {meta.mesas_informadas != null && (
                <KpiCard
                  title="Mesas informadas"
                  value={meta.mesas_informadas}
                  subtitle="100% reportadas"
                  icon={CheckCircle2}
                  color="text-green-600"
                />
              )}
              {meta.potential_sufragantes != null && (
                <KpiCard
                  title="Potencial sufragantes"
                  value={meta.potential_sufragantes}
                  subtitle="Censo habilitado"
                  icon={Users}
                  color="text-orange-600"
                />
              )}
              {meta.votos_nulos != null && (
                <KpiCard
                  title="Votos nulos"
                  value={meta.votos_nulos}
                  icon={AlertCircle}
                  color="text-red-600"
                />
              )}
              {meta.votos_no_marcados != null && (
                <KpiCard
                  title="Votos no marcados"
                  value={meta.votos_no_marcados}
                  icon={FileSpreadsheet}
                  color="text-amber-600"
                />
              )}
              {meta.votos_blanco != null && (
                <KpiCard
                  title="Votos en blanco"
                  value={meta.votos_blanco}
                  icon={CheckCircle2}
                  color="text-slate-600"
                />
              )}
            </div>
          </div>
        );
      })()}

      {/* Gráfico de actores */}
      <div className="card p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-primary-600" />
            <h3 className="text-lg font-bold text-secondary-900">
              {consolidarCoaliciones
                ? "Votos por partido (coaliciones consolidadas)"
                : "Votos por actor"}
            </h3>
            {consolidarCoaliciones && (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                Cada coalición suma a sus partidos
              </span>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-secondary-700">
            <input
              type="checkbox"
              checked={consolidarCoaliciones}
              onChange={(e) => setConsolidarCoaliciones(e.target.checked)}
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
            />
            Consolidar coaliciones
          </label>
        </div>
        <p className="mb-3 text-xs text-secondary-500">
          {consolidarCoaliciones
            ? "A continuación se muestra el total de votos de cada partido incluyendo su aporte individual más las coaliciones a las que pertenece."
            : "Distribución directa de votos según los actores registrados (partidos y coaliciones)."}
        </p>
        {consolidarCoaliciones ? (
          <ActoresConsolidadosChart
            actores={actoresMostrados}
            detalle={detalle}
            principal={h.partido_principal}
          />
        ) : (
          <ActoresChart
            actores={actoresMostrados}
            principal={h.partido_principal}
          />
        )}
      </div>

      {/* Tabla de casillas */}
      <div className="card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Table2 size={20} className="text-primary-600" />
          <h3 className="text-lg font-bold text-secondary-900">Casillas</h3>
          <span className="ml-auto text-xs text-secondary-500">
            {casillas.length.toLocaleString()} registros
          </span>
        </div>
        {detalleLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : detalleError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {detalleError}
          </div>
        ) : (
          <CasillasTable casillas={casillas} principal={h.partido_principal} />
        )}
      </div>
    </div>
  );
}

function PartidoBadge({ partido }: { partido: string }) {
  const color = PARTIDO_COLORS[partido?.toUpperCase()] || PARTIDO_COLORS.OTRO;
  return (
    <span
      className="inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {partido || "—"}
    </span>
  );
}

function DesglosePreview({
  desglose,
  principal,
}: {
  desglose?: {
    partido: string;
    votos: number;
    tipo?: "individual" | "coalicion";
    candidato?: string;
  }[];
  principal?: string;
}) {
  if (!desglose || desglose.length === 0)
    return <span className="text-secondary-400">-</span>;
  const sorted = [...desglose]
    .filter((a) => a && typeof a.votos === "number" && a.partido)
    .sort((a, b) => b.votos - a.votos);
  const top = sorted.slice(0, 3);
  const principalEnTop = principal && top.some((a) => a.partido === principal);
  const principalActor = principal
    ? sorted.find((a) => a.partido === principal)
    : null;
  const entries =
    principalEnTop || !principalActor
      ? top
      : [...top.slice(0, 2), principalActor];
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((actor, idx) => (
        <span
          key={`${actor.partido || "X"}-${idx}`}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
            actor.partido === principal
              ? "border-primary-300 bg-primary-50 text-primary-800 font-semibold"
              : "border-secondary-200 bg-white text-secondary-700"
          }`}
          title={
            actor.candidato
              ? `${actor.candidato} — ${actor.tipo === "coalicion" ? "Coalición" : "Individual"}`
              : actor.tipo === "coalicion"
                ? "Coalición"
                : "Individual"
          }
        >
          <span
            className={
              actor.partido === principal ? "font-bold" : "font-semibold"
            }
          >
            {actor.candidato
              ? `${actor.candidato} (${actor.partido})`
              : actor.partido || "?"}
          </span>{" "}
          {actor.votos.toLocaleString()}
          {actor.tipo === "coalicion" && (
            <span className="text-[10px] text-secondary-400">C</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Error boundary para capturar errores de renderizado y mostrar el detalle real
class HistoricoErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[HistoricoElectoral] Error Boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-4 p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-bold">Error al mostrar el histórico electoral</p>
            <p className="mt-1 font-mono text-xs">
              {this.state.error?.name}: {this.state.error?.message}
            </p>
            {this.state.error?.stack && (
              <pre className="mt-2 max-h-64 overflow-auto rounded border border-red-100 bg-white p-2 text-[11px]">
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function HistoricoElectoralPage() {
  return (
    <HistoricoErrorBoundary>
      <HistoricoElectoralPageInner />
    </HistoricoErrorBoundary>
  );
}
