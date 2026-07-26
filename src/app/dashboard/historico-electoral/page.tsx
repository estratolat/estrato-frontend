'use client';

import { useEffect, useMemo, useState } from 'react';
import { resultadosHistoricosApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
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
} from 'lucide-react';

// Tipos
interface Agrupado {
  tipo_historico: string;
  tipo_eleccion: string;
  anio: number;
  estado_id?: number;
  municipio_id?: number;
  registros: number;
  casillas: number;
  secciones: number;
  total_votos: number;
  partidos: { partido: string; votos: number }[];
  partido_principal?: string;
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
  participacion_pct?: number;
  desglose_partidos?: { partido: string; votos: number; tipo: 'individual' | 'coalicion' }[];
  partido_principal?: string;
}

const TIPO_HISTORICO_LABEL: Record<string, string> = {
  principal: 'Histórico principal',
  complementario: 'Histórico complementario',
};

const TIPO_ELECCION_LABEL: Record<string, string> = {
  ayuntamiento: 'Ayuntamiento / Presidencia municipal',
  diputado_local: 'Diputado local',
  diputado_federal: 'Diputado federal',
  senador: 'Senador',
  gobernador: 'Gobernador',
  presidente_republica: 'Presidente de la República',
};

const PARTIDO_COLORS: Record<string, string> = {
  MORENA: '#b91c1c',
  PAN: '#2563eb',
  PRI: '#16a34a',
  PRD: '#facc15',
  MC: '#f97316',
  PVEM: '#65a30d',
  PT: '#dc2626',
  PANAL: '#06b6d4',
  ROJA: '#b91c1c',
  'AZUL MARINO': '#1e3a8a',
  BLANCA: '#374151',
  AZUL: '#2563eb',
  VERDE: '#16a34a',
  OTRO: '#6b7280',
};

type WizardStep = 'archivo' | 'metadatos' | 'encabezado' | 'mapeo' | 'validacion' | 'importando';
type Vista = 'dashboard' | 'listado' | 'detalle' | 'wizard';

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
  tipo: 'individual' | 'coalicion';
}

const MAPEO_VACIO: MapeoState = {
  seccion: '',
  casilla: '',
  tipo_casilla: '',
  ext_contigua: '',
  lista_nominal: '',
  votos_nulos: '',
  votos_no_reg: '',
  votos_validos: '',
  total_votos: '',
  participacion_pct: '',
  filtro_municipio_columna: '',
  filtro_municipio: '',
};

const CAMPOS_MAPEO: { key: keyof MapeoState; label: string; required?: boolean }[] = [
  { key: 'seccion', label: 'Sección', required: true },
  { key: 'casilla', label: 'Casilla', required: true },
  { key: 'tipo_casilla', label: 'Tipo de casilla' },
  { key: 'ext_contigua', label: 'Ext. contigua' },
  { key: 'lista_nominal', label: 'Lista nominal' },
  { key: 'votos_nulos', label: 'Votos nulos' },
  { key: 'votos_no_reg', label: 'Votos no registrados' },
  { key: 'votos_validos', label: 'Votos válidos' },
  { key: 'total_votos', label: 'Total de votos' },
  { key: 'participacion_pct', label: 'Participación %' },
  { key: 'filtro_municipio_columna', label: 'Columna filtro municipio' },
];

export default function HistoricoElectoralPage() {
  // Listado / resumen
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [resumen, setResumen] = useState<ResumenBackend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>('dashboard');
  const [historicoSeleccionado, setHistoricoSeleccionado] = useState<Agrupado | null>(null);
  const [filtros, setFiltros] = useState({ tipo_historico: '', tipo_eleccion: '', anio: '', seccion: '' });

  // Wizard
  const [step, setStep] = useState<WizardStep>('archivo');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [metadatos, setMetadatos] = useState({
    tipo_historico: 'principal',
    tipo_eleccion: 'ayuntamiento',
    anio: '',
    estado_id: '',
    estado_nombre: '',
    municipio_id: '',
    municipio_nombre: '',
    distrito_local_id: '',
    distrito_federal_id: '',
    saltar_lineas: '0',
    partido_principal: '',
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
      const guardado = sessionStorage.getItem('estrato_wizard_historico');
      if (guardado) {
        const parsed = JSON.parse(guardado);
        const stepGuardado = parsed.step || 'archivo';
        if (!archivo && stepGuardado !== 'archivo') {
          setStep('archivo');
        } else if (parsed.step) {
          setStep(parsed.step);
        }
        if (parsed.metadatos) setMetadatos(parsed.metadatos);
        if (parsed.mapeo) setMapeo(parsed.mapeo);
        if (parsed.actores) setActores(parsed.actores);
        if (typeof parsed.modoSabana === 'boolean') setModoSabana(parsed.modoSabana);
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
    sessionStorage.setItem('estrato_wizard_historico', JSON.stringify(data));
  }, [step, metadatos, mapeo, actores, modoSabana]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, sum] = await Promise.all([
        resultadosHistoricosApi.getAll({}),
        resultadosHistoricosApi.getResumen(),
      ]);
      setResultados(res.data || []);
      setResumen(sum.data || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos históricos');
    } finally {
      setLoading(false);
    }
  };

  const agrupadosFiltrados = useMemo(() => {
    if (!resumen) return [];
    return resumen.agrupados.filter((g) => {
      if (filtros.tipo_historico && g.tipo_historico !== filtros.tipo_historico) return false;
      if (filtros.tipo_eleccion && g.tipo_eleccion !== filtros.tipo_eleccion) return false;
      if (filtros.anio && String(g.anio) !== filtros.anio) return false;
      return true;
    });
  }, [resumen, filtros]);

  // Wizard helpers
  const buildFormData = (conMapeo = true, reemplazar = false) => {
    const formData = new FormData();
    if (archivo) formData.append('archivo', archivo);
    formData.append('tipo_historico', metadatos.tipo_historico);
    formData.append('tipo_eleccion', metadatos.tipo_eleccion);
    formData.append('anio', metadatos.anio);
    if (metadatos.estado_id) formData.append('estado_id', metadatos.estado_id);
    if (metadatos.estado_nombre) formData.append('estado_nombre', metadatos.estado_nombre);
    if (metadatos.municipio_id) formData.append('municipio_id', metadatos.municipio_id);
    if (metadatos.municipio_nombre) formData.append('municipio_nombre', metadatos.municipio_nombre);
    if (metadatos.distrito_local_id) formData.append('distrito_local_id', metadatos.distrito_local_id);
    if (metadatos.distrito_federal_id) formData.append('distrito_federal_id', metadatos.distrito_federal_id);
    formData.append('saltar_lineas', String(Number(metadatos.saltar_lineas || 0) + 1));
    if (metadatos.partido_principal) formData.append('partido_principal', metadatos.partido_principal);
    if (reemplazar) formData.append('reemplazar', 'true');
    if (conMapeo) {
      const mapeoClean: any = {};
      Object.entries(mapeo).forEach(([k, v]) => {
        if (v) mapeoClean[k] = v;
      });
      formData.append('mapeo', JSON.stringify(mapeoClean));
      const actoresClean = modoSabana
        ? []
        : actores
            .filter((a) => a.nombre && a.columna)
            .map((a) => ({ nombre: a.nombre, columna: a.columna, tipo: a.tipo }));
      formData.append('actores', JSON.stringify(actoresClean));
    }
    return formData;
  };

  const ejecutarPreview = async (conMapeo = true) => {
    if (!archivo) return;
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { data } = await resultadosHistoricosApi.preview(buildFormData(conMapeo));
      setPreview(data);
    } catch (err: any) {
      const backendMessage = err.response?.data?.message || err.response?.data?.error;
      const validationErrors = Array.isArray(err.response?.data?.message)
        ? err.response?.data?.message.map((m: any) => (typeof m === 'string' ? m : `${m.property}: ${Object.values(m.constraints || {}).join(', ')}`)).join('; ')
        : null;
      const detail = validationErrors || backendMessage || err.message || 'Error al generar vista previa';
      setPreviewError(`${detail}${err.response?.status ? ` (HTTP ${err.response.status})` : ''}`);
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
      formDataRaw.append('archivo', f);
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
          seccion: s.seccion || '',
          casilla: s.casilla || '',
          tipo_casilla: s.tipo_casilla || '',
          ext_contigua: s.ext_contigua || '',
          lista_nominal: s.lista_nominal || '',
          votos_nulos: s.votos_nulos || '',
          votos_no_reg: s.votos_no_reg || '',
          votos_validos: s.votos_validos || '',
          total_votos: s.total_votos || '',
          participacion_pct: s.participacion_pct || '',
          filtro_municipio_columna: s.filtro_municipio_columna || '',
        });
        setActores(
          (s.actores || []).map((a: any) => ({
            id: Math.random().toString(36).slice(2),
            nombre: a.nombre,
            columna: a.columna,
            tipo: a.tipo,
          }))
        );
      }

      const filaDetectada = rawData?.encabezadoDetectado?.fila ?? sugerenciaData?.fila;
      if (filaDetectada) {
        setMetadatos((prev) => ({ ...prev, saltar_lineas: String(filaDetectada - 1) }));
      }
    } catch (err: any) {
      const detail = err.response?.data?.message || err.response?.data?.error || err.message || 'Error al explorar archivo';
      setPreviewError(`${detail}${err.response?.status ? ` (HTTP ${err.response.status})` : ''}`);
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
      const { data } = await resultadosHistoricosApi.importar(buildFormData(true, reemplazar));
      setImportResult(data);
      if (!data.error) {
        await cargarDatos();
        if (data.exitosos > 0 || reemplazar) {
          try {
            sessionStorage.removeItem('estrato_wizard_historico');
          } catch {
            // ignorar
          }
        }
      }
    } catch (err: any) {
      setImportResult({ error: err.response?.data?.message || 'Error al importar' });
    } finally {
      setImporting(false);
    }
  };

  const handleEliminarLote = async (g: Agrupado) => {
    if (!confirm(`¿Eliminar permanentemente el histórico ${TIPO_ELECCION_LABEL[g.tipo_eleccion]} ${g.anio}? Esta acción no se puede deshacer.`)) return;
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
      alert(err.response?.data?.message || 'Error al eliminar lote');
    }
  };

  const resetWizard = () => {
    setStep('archivo');
    setArchivo(null);
    setMetadatos({
      tipo_historico: 'principal',
      tipo_eleccion: 'ayuntamiento',
      anio: '',
      estado_id: '',
      estado_nombre: '',
      municipio_id: '',
      municipio_nombre: '',
      distrito_local_id: '',
      distrito_federal_id: '',
      saltar_lineas: '0',
      partido_principal: '',
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
      sessionStorage.removeItem('estrato_wizard_historico');
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
    if (rawLines?.encabezadoDetectado?.columnas?.length) return rawLines.encabezadoDetectado.columnas;
    return preview?.columnas || [];
  }, [rawLines, metadatos.saltar_lineas, preview]);
  const columnasUsadas = useMemo(() => {
    const usadas = new Set<string>();
    Object.values(mapeo).forEach((v) => v && usadas.add(v));
    actores.forEach((a) => a.columna && usadas.add(a.columna));
    return usadas;
  }, [mapeo, actores]);

  const COLUMNAS_NO_ACTORES = new Set([
    'ID_ESTADO',
    'NOMBRE_ESTADO',
    'ID_DISTRITO_FEDERAL',
    'DISTRITO_FEDERAL',
    'ID_DISTRITO_LOCAL',
    'DISTRITO_LOCAL',
    'ID_MUNICIPIO',
    'MUNICIPIO',
    'SECCION',
    'CASILLA',
    'ID_CASILLA',
    'IDCASILLA',
    'TIPO_CASILLA',
    'UBICACION',
    'LISTA_NOMINAL',
    'LISTA_NOMINAL_CASILLA',
    'NUM_VOTOS_NULOS',
    'NUM_VOTOS_NO_REGISTRADOS',
    'NUM_VOTOS_VALIDOS',
    'TOTAL_VOTOS',
    'VOTOS_NULOS',
    'VOTOS_NO_REGISTRADOS',
    'VOTOS_VALIDOS',
    'PARTICIPACION',
    'PARTICIPACION_CONTABILIZADA',
    'PORC_PARTICIPACION',
    'ESTATUS_CASILLA',
    'ESTATUS',
    'COTEJADA',
    'RECONTADA',
    'CONTABILIZADA',
    'TRIBUNAL',
    'OBSERVACIONES',
    'RUTA_ACTA',
    'ACTA_PREP',
    'ID_CENTRO_VOTACION',
    'CENTRO_VOTACION',
    'EXT_CONTIGUA',
    'EXTCONTIGUA',
  ]);

  const PARTIDOS_CONOCIDOS = new Set([
    'PAN', 'PRI', 'PRD', 'PVEM', 'PT', 'MC', 'MORENA', 'PANAL', 'PES', 'RSP', 'FXM', 'NAEM', 'PCM',
    'PAN_PRI_PRD', 'PRI_PRD', 'PAN_PRI', 'PAN_PRD', 'PVEM_PT_MORENA', 'PVEM_PT', 'PT_MORENA', 'PVEM_MORENA',
  ]);

  const normalizarNombreColumna = (nombre: string): string => {
    return nombre
      .toUpperCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const sugerirActorDesdeColumna = (columna: string): { nombre: string; tipo: 'individual' | 'coalicion' } => {
    const norm = normalizarNombreColumna(columna);
    let tipo: 'individual' | 'coalicion' = 'individual';
    if (PARTIDOS_CONOCIDOS.has(norm)) {
      tipo = norm.includes('_') ? 'coalicion' : 'individual';
    } else if (/^[A-Z_\-]{2,40}$/.test(norm) && (norm.includes('_') || norm.includes('-'))) {
      tipo = 'coalicion';
    }
    const nombre = columna.replace(/^P[_\.]/i, '').trim();
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
      if (v && v.trim() !== '' && v.trim() !== '\\N') return v.trim();
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
        tipo: c.toUpperCase().trim().includes('_') ? ('coalicion' as const) : ('individual' as const),
      }));
    setActores((prev) => [...prev, ...sugeridos]);
  };

  const addActor = () => {
    setActores((prev) => [...prev, { id: Math.random().toString(36).slice(2), nombre: '', columna: '', tipo: 'individual' }]);
  };

  const updateActor = (id: string, campo: keyof ActorState, valor: string) => {
    setActores((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)));
  };

  const removeActor = (id: string) => {
    setActores((prev) => prev.filter((a) => a.id !== id));
  };

  const mapeoEsValido = mapeo.seccion && mapeo.casilla && (modoSabana || actores.filter((a) => a.nombre && a.columna).length > 0);

  // Navegación a detalle
  const abrirDetalle = (g: Agrupado) => {
    setHistoricoSeleccionado(g);
    setVista('detalle');
  };

  // Render pasos
  const renderWizard = () => {
    const steps = [
      { key: 'archivo', label: 'Archivo' },
      { key: 'metadatos', label: 'Metadatos' },
      { key: 'encabezado', label: 'Encabezado' },
      { key: 'mapeo', label: 'Mapeo' },
      { key: 'validacion', label: 'Validación' },
      { key: 'importando', label: 'Importar' },
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
                    ? 'bg-primary-600 text-white'
                    : idx < steps.findIndex((x) => x.key === step)
                    ? 'bg-green-100 text-green-700'
                    : 'bg-secondary-100 text-secondary-500'
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`font-medium ${
                  step === s.key ? 'text-primary-700' : idx < steps.findIndex((x) => x.key === step) ? 'text-green-700' : 'text-secondary-400'
                }`}
              >
                {s.label}
              </span>
              {idx < steps.length - 1 && <span className="text-secondary-300">/</span>}
            </div>
          ))}
        </div>

        {step === 'archivo' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">1. Selecciona la sábana</h3>
              <p className="text-sm text-secondary-500">Sube el archivo CSV tal cual lo proporciona el Instituto Electoral.</p>
            </div>

            <div className="rounded-lg border-2 border-dashed border-secondary-300 bg-secondary-50 p-8 text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-secondary-400" />
              <p className="mt-3 text-sm font-medium text-secondary-700">
                {archivo ? archivo.name : 'Arrastra un CSV o haz clic para seleccionar'}
              </p>
              <p className="mt-1 text-xs text-secondary-500">Formatos: CSV con encabezado en cualquier línea</p>
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
                onClick={() => setStep('metadatos')}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {rawLoading ? 'Analizando...' : 'Continuar'} <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 'metadatos' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">2. Define el histórico</h3>
              <p className="text-sm text-secondary-500">Indica qué elección representa y el territorio al que pertenece.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="label">Tipo de histórico *</label>
                <select
                  value={metadatos.tipo_historico}
                  onChange={(e) => setMetadatos({ ...metadatos, tipo_historico: e.target.value })}
                  className="input"
                >
                  <option value="principal">Principal (cargo del proyecto)</option>
                  <option value="complementario">Complementario (otros cargos)</option>
                </select>
                <p className="mt-1 text-xs text-secondary-500">
                  {metadatos.tipo_historico === 'principal' ? 'Últimas 3 elecciones del cargo del proyecto' : 'Otros cargos para cruces y análisis'}
                </p>
              </div>

              <div>
                <label className="label">Tipo de elección *</label>
                <select
                  value={metadatos.tipo_eleccion}
                  onChange={(e) => setMetadatos({ ...metadatos, tipo_eleccion: e.target.value })}
                  className="input"
                >
                  {Object.entries(TIPO_ELECCION_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Año *</label>
                <input
                  type="number"
                  value={metadatos.anio}
                  onChange={(e) => setMetadatos({ ...metadatos, anio: e.target.value })}
                  placeholder="2024"
                  className="input"
                />
              </div>

              <div>
                <label className="label">ID Estado</label>
                <input
                  type="number"
                  value={metadatos.estado_id}
                  onChange={(e) => setMetadatos({ ...metadatos, estado_id: e.target.value })}
                  placeholder="11"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Nombre del estado</label>
                <input
                  type="text"
                  value={metadatos.estado_nombre}
                  onChange={(e) => setMetadatos({ ...metadatos, estado_nombre: e.target.value })}
                  placeholder="Guanajuato"
                  className="input"
                />
              </div>

              <div>
                <label className="label">ID Municipio</label>
                <input
                  type="number"
                  value={metadatos.municipio_id}
                  onChange={(e) => setMetadatos({ ...metadatos, municipio_id: e.target.value })}
                  placeholder="14"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Nombre del municipio</label>
                <input
                  type="text"
                  value={metadatos.municipio_nombre}
                  onChange={(e) => setMetadatos({ ...metadatos, municipio_nombre: e.target.value })}
                  placeholder="Dolores Hidalgo"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Distrito local</label>
                <input
                  type="number"
                  value={metadatos.distrito_local_id}
                  onChange={(e) => setMetadatos({ ...metadatos, distrito_local_id: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Distrito federal</label>
                <input
                  type="number"
                  value={metadatos.distrito_federal_id}
                  onChange={(e) => setMetadatos({ ...metadatos, distrito_federal_id: e.target.value })}
                  className="input"
                />
              </div>

            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep('archivo')} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Atrás
              </button>
              <button
                disabled={!metadatos.anio}
                onClick={() => setStep('encabezado')}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 'encabezado' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">3. Explorar archivo y elegir encabezado</h3>
              <p className="text-sm text-secondary-500">
                Las sábanas oficiales suelen tener metadatos antes del encabezado real. Buscá la primera fila con los nombres de columna (SECCION, ID_CASILLA, etc.) y hacé clic en "Usar como encabezado".
              </p>
            </div>

            {rawLoading && (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            )}

            {previewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{previewError}</div>
            )}

            {!rawLoading && rawLines && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="rounded-lg border border-secondary-200 bg-white px-4 py-2 text-sm">
                    <span className="text-secondary-500">Líneas significativas:</span>{' '}
                    <strong className="text-secondary-900">{rawLines.totalLineas?.toLocaleString()}</strong>
                  </div>
                  {rawLines.encabezadoDetectado && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">
                      Encabezado sugerido: fila {rawLines.encabezadoDetectado.fila} ({rawLines.encabezadoDetectado.columnas?.length} columnas)
                    </div>
                  )}
                  <div className="rounded-lg border border-secondary-200 bg-white px-4 py-2 text-sm">
                    <span className="text-secondary-500">Encabezado elegido:</span>{' '}
                    <strong className="text-secondary-900">{Number(metadatos.saltar_lineas) + 1}</strong>
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
                        const elegida = Number(metadatos.saltar_lineas) + 1 === l.numero;
                        const sugerida = rawLines.encabezadoDetectado?.fila === l.numero;
                        return (
                          <tr
                            key={l.numero}
                            className={`${elegida ? 'bg-primary-50' : sugerida ? 'bg-green-50' : ''}`}
                          >
                            <td className="px-3 py-2 align-top font-medium whitespace-nowrap">
                              {l.numero}
                              {sugerida && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">Sugerida</span>}
                              {elegida && <span className="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-[10px] text-primary-700">Elegida</span>}
                            </td>
                            <td className="px-3 py-2 align-top">
                              <div className="max-w-xl truncate text-secondary-700" title={l.contenido}>
                                {l.contenido}
                              </div>
                              {l.columnas?.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {l.columnas.slice(0, 12).map((c: string) => (
                                    <span key={c} className="rounded border border-secondary-200 bg-white px-1.5 py-0.5 text-[10px] text-secondary-600">
                                      {c}
                                    </span>
                                  ))}
                                  {l.columnas.length > 12 && (
                                    <span className="text-[10px] text-secondary-400">+{l.columnas.length - 12}</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 align-top text-center">
                              <button
                                onClick={() => setMetadatos({ ...metadatos, saltar_lineas: String(l.numero - 1) })}
                                className={`rounded px-2.5 py-1 text-xs font-medium ${
                                  elegida
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-white text-secondary-700 hover:bg-secondary-100 border border-secondary-200'
                                }`}
                              >
                                {elegida ? 'Elegida' : 'Usar como encabezado'}
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
              <button onClick={() => setStep('metadatos')} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Atrás
              </button>
              <button
                disabled={!rawLines?.lineas?.length}
                onClick={() => {
                  setStep('mapeo');
                  cargarSugerenciaMapeo();
                }}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Continuar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 'mapeo' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-secondary-900">4. Revisar mapeo automático</h3>
                <p className="text-sm text-secondary-500">
                  Corregí columnas, filtro de municipio y actores. La vista previa rápida te permite probar sin salir de este paso.
                </p>
              </div>
              <button
                disabled={!mapeo.seccion || !mapeo.casilla || previewLoading}
                onClick={() => ejecutarPreview(true)}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50"
              >
                <Eye size={16} /> {previewLoading ? 'Cargando...' : 'Vista previa rápida'}
              </button>
            </div>

            {preview && !previewLoading && (
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Leídas</p>
                  <p className="text-lg font-bold text-secondary-900">{preview.totalFilas?.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Válidas</p>
                  <p className={`text-lg font-bold ${preview.exitosas > 0 ? 'text-green-600' : 'text-red-600'}`}>{preview.exitosas?.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Omitidas filtro</p>
                  <p className="text-lg font-bold text-yellow-600">{preview.omitidasFiltro?.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Errores</p>
                  <p className={`text-lg font-bold ${preview.errores > 0 ? 'text-red-600' : 'text-secondary-900'}`}>{preview.errores?.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-secondary-200 bg-white p-3">
                  <p className="text-xs text-secondary-500">Actores con votos</p>
                  <p className="text-lg font-bold text-secondary-900">{Object.keys(preview.totales || {}).length}</p>
                </div>
              </div>
            )}

            {preview?.filtroSinCoincidencias && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-medium flex items-center gap-2"><AlertCircle size={16} /> El filtro de municipio no coincidió con ninguna fila</p>
                <p className="mt-1">Columna: <strong>{mapeo.filtro_municipio_columna}</strong> — Filtro: <strong>{mapeo.filtro_municipio}</strong></p>
                {preview.valoresUnicosFiltro?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-secondary-600">Valores encontrados:</span>
                    {preview.valoresUnicosFiltro.map((v: string) => (
                      <button
                        key={v}
                        onClick={() => setMapeo({ ...mapeo, filtro_municipio: v })}
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
                <p className="font-medium flex items-center gap-2"><AlertCircle size={16} /> Ningún actor acumuló votos</p>
                <p className="mt-1">Revisá que las columnas de actores sean numéricas y no de porcentaje (las columnas P_ son porcentajes, no votos).</p>
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
                  <h4 className="mb-3 font-bold text-secondary-900">Campos de control</h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {CAMPOS_MAPEO.filter((c) => c.key !== 'filtro_municipio_columna').map((campo) => (
                      <div key={campo.key}>
                        <label className="label">
                          {campo.label}
                          {campo.required && <span className="ml-1 text-red-500">*</span>}
                        </label>
                        <select
                          value={mapeo[campo.key]}
                          onChange={(e) => setMapeo({ ...mapeo, [campo.key]: e.target.value })}
                          className="input"
                        >
                          <option value="">— Sin mapear —</option>
                          {columnasDisponibles.map((c: string) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {mapeo[campo.key] && (
                          <p className="mt-1 text-xs text-secondary-400">
                            Ej: {valorMuestra(mapeo[campo.key]) || '—'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tarjeta 2: Filtro de municipio */}
                <div className="rounded-lg border border-secondary-200 bg-white p-4">
                  <h4 className="mb-3 font-bold text-secondary-900">Filtro de municipio</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Columna de filtro</label>
                      <select
                        value={mapeo.filtro_municipio_columna}
                        onChange={(e) => setMapeo({ ...mapeo, filtro_municipio_columna: e.target.value })}
                        className="input"
                      >
                        <option value="">— Sin filtro —</option>
                        {columnasDisponibles.map((c: string) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Texto del municipio</label>
                      <input
                        type="text"
                        value={mapeo.filtro_municipio}
                        onChange={(e) => setMapeo({ ...mapeo, filtro_municipio: e.target.value })}
                        placeholder="DOLORES HIDALGO"
                        className="input"
                      />
                      <p className="mt-1 text-xs text-secondary-500">Podés poner varios valores separados por coma.</p>
                    </div>
                  </div>
                  {mapeo.filtro_municipio_columna && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-secondary-700">Valores únicos encontrados (hacé clic para usar):</p>
                      <div className="flex flex-wrap gap-1">
                        {valoresUnicosColumna(mapeo.filtro_municipio_columna).slice(0, 20).map((v: string) => (
                          <button
                            key={v}
                            onClick={() => setMapeo({ ...mapeo, filtro_municipio: v })}
                            className={`rounded border px-1.5 py-0.5 text-xs ${
                              mapeo.filtro_municipio && v.toUpperCase().includes(mapeo.filtro_municipio.toUpperCase())
                                ? 'border-primary-300 bg-primary-50 text-primary-700'
                                : 'border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50'
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
                    <h4 className="font-bold text-secondary-900">Actores (partidos / coaliciones)</h4>
                    <div className="flex gap-2">
                      <button onClick={sugerirActores} className="btn-secondary flex items-center gap-1 text-xs">
                        <Settings2 size={14} /> Re-sugerir
                      </button>
                      <button onClick={addActor} className="btn-primary flex items-center gap-1 text-xs">
                        <Plus size={14} /> Agregar actor
                      </button>
                    </div>
                  </div>

                  {actores.length === 0 && (
                    <p className="text-sm text-secondary-500">
                      No hay actores seleccionados. En este modo se importará la sábana completa (sin calcular ganador).
                    </p>
                  )}

                  <div className="space-y-2">
                    {columnasDisponibles
                      .filter((c: string) => !Object.values(mapeo).includes(c))
                      .map((c: string) => {
                        const actor = actores.find((a) => a.columna === c);
                        const u = c.toUpperCase().trim();
                        const esPorcentaje = u.startsWith('P_') || u.startsWith('P.');
                        if (esPorcentaje) return null;
                        const sugerencia = sugerirActorDesdeColumna(c);
                        return (
                          <div key={c} className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary-100 bg-secondary-50 p-2">
                            <input
                              type="checkbox"
                              checked={!!actor}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setActores((prev) => [...prev, { id: Math.random().toString(36).slice(2), nombre: sugerencia.nombre, columna: c, tipo: sugerencia.tipo }]);
                                } else {
                                  setActores((prev) => prev.filter((a) => a.columna !== c));
                                }
                              }}
                              className="h-4 w-4 rounded border-secondary-300 text-primary-600"
                            />
                            <span className="min-w-[120px] text-sm font-medium text-secondary-900">{c}</span>
                            {actor && (
                              <>
                                <input
                                  type="text"
                                  value={actor.nombre}
                                  onChange={(e) => updateActor(actor.id, 'nombre', e.target.value)}
                                  placeholder="Nombre"
                                  className="input w-32 text-xs"
                                />
                                <select
                                  value={actor.tipo}
                                  onChange={(e) => updateActor(actor.id, 'tipo', e.target.value)}
                                  className="input w-32 text-xs"
                                >
                                  <option value="individual">Individual</option>
                                  <option value="coalicion">Coalición</option>
                                </select>
                              </>
                            )}
                            <span className="text-xs text-secondary-400">Ej: {valorMuestra(c) || '—'}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {metadatos.tipo_historico === 'principal' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-medium">Partido / actor principal del proyecto</p>
                    <select
                      value={metadatos.partido_principal}
                      onChange={(e) => setMetadatos({ ...metadatos, partido_principal: e.target.value })}
                      className="input mt-2"
                    >
                      <option value="">— Seleccionar actor principal —</option>
                      {actores
                        .filter((a) => a.tipo === 'individual')
                        .map((a) => (
                          <option key={a.columna} value={a.nombre}>{a.nombre}</option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-amber-700">
                      Es el partido de tu proyecto. Puede no ser el ganador ni haber participado individualmente. Sirve para cruzar con los demás datos.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between">
              <button onClick={() => setStep('encabezado')} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Atrás
              </button>
              <button
                disabled={!mapeoEsValido || sugerenciaLoading}
                onClick={() => {
                  ejecutarPreview(true);
                  setStep('validacion');
                }}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Verificar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 'validacion' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">5. Resumen y validación</h3>
              <p className="text-sm text-secondary-500">Revisa los totales y errores antes de guardar. Nada se importa aún.</p>
            </div>

            {previewLoading && (
              <div className="flex h-40 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            )}

            {previewError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{previewError}</div>
            )}

            {!previewLoading && preview && (
              <>
                {preview.modoSabana && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                    <p className="font-medium">Modo sábana completa</p>
                    <p className="mt-1">Se guardarán todas las columnas de cada casilla. No se calculará ganador.</p>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Filas leídas</p>
                    <p className="text-2xl font-bold text-secondary-900">{preview.totalFilas?.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Filas válidas</p>
                    <p className={`text-2xl font-bold ${preview.exitosas > 0 ? 'text-green-600' : 'text-red-600'}`}>{preview.exitosas?.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Omitidas por filtro</p>
                    <p className={`text-2xl font-bold ${preview.omitidasFiltro > 0 ? 'text-yellow-600' : 'text-secondary-900'}`}>
                      {preview.omitidasFiltro?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">Errores</p>
                    <p className={`text-2xl font-bold ${preview.errores > 0 ? 'text-red-600' : 'text-secondary-900'}`}>
                      {preview.errores?.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-secondary-200 bg-white p-4">
                    <p className="text-xs text-secondary-500">{preview.modoSabana ? 'Columnas por fila' : 'Actores con votos'}</p>
                    <p className="text-2xl font-bold text-secondary-900">
                      {preview.modoSabana
                        ? preview.preview?.[0]?.procesado?.sabana_completa?.length || preview.columnas?.length || 0
                        : Object.keys(preview.totales || {}).length}
                    </p>
                  </div>
                </div>

                {preview.exitosas === 0 && preview.totalFilas > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-medium flex items-center gap-2"><AlertCircle size={16} /> Ninguna fila pasó la validación</p>
                    <p className="mt-1">
                      {preview.omitidasFiltro > 0
                        ? `Todas las filas (${preview.omitidasFiltro.toLocaleString()}) se omitieron por el filtro de municipio. Revisá en el paso 4 (Mapeo) la columna y el texto del filtro; probablemente el valor no coincide con los datos de este archivo.`
                        : preview.errores > 0
                        ? 'Todas las filas tienen errores. Revisá la tabla de abajo para ver los detalles.'
                        : 'Revisá el mapeo de sección y casilla; puede que las columnas elegidas no contengan datos.'}
                    </p>
                  </div>
                )}

                {preview.errores > 0 && preview.exitosas > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                    <p className="font-medium flex items-center gap-2"><AlertCircle size={16} /> Hay filas con error</p>
                    <p className="mt-1">Las filas con error no se importarán.</p>
                  </div>
                )}

                {!preview.modoSabana && Object.keys(preview.totales || {}).length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-secondary-700">Votos por actor (preview)</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(preview.totales || {})
                        .sort((a: any, b: any) => b[1] - a[1])
                        .map(([actor, votos]: [string, any]) => (
                          <span
                            key={actor}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold text-white"
                            style={{ backgroundColor: PARTIDO_COLORS[actor.toUpperCase()] || PARTIDO_COLORS.OTRO }}
                          >
                            {actor} {Number(votos).toLocaleString()}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {metadatos.tipo_historico === 'principal' && metadatos.partido_principal && (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">
                    <p className="font-medium">Actor principal del proyecto</p>
                    <p className="mt-1">
                      Se guardará destacado como:{' '}
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                        style={{ backgroundColor: PARTIDO_COLORS[metadatos.partido_principal.toUpperCase()] || PARTIDO_COLORS.OTRO }}
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
                        {mapeo.filtro_municipio_columna && <th className="px-3 py-2 text-left">{mapeo.filtro_municipio_columna}</th>}
                        <th className="px-3 py-2 text-left">{preview.modoSabana ? 'Modo' : 'Ganador'}</th>
                        <th className="px-3 py-2 text-left">Total votos</th>
                        <th className="px-3 py-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {preview.preview?.slice(0, 15).map((p: any) => (
                        <tr key={p.fila}>
                          <td className="px-3 py-2 text-secondary-500">{p.fila}</td>
                          <td className="px-3 py-2">{p.procesado?.seccion || '-'}</td>
                          <td className="px-3 py-2">{p.procesado?.casilla || '-'}</td>
                          {mapeo.filtro_municipio_columna && (
                            <td className="px-3 py-2 text-secondary-500">
                              {p.raw?.[mapeo.filtro_municipio_columna] || '-'}
                            </td>
                          )}
                          <td className="px-3 py-2">
                            {preview.modoSabana
                              ? <span className="text-xs text-blue-600">Sábana</span>
                              : p.procesado?.partido_ganador
                              ? <PartidoBadge partido={p.procesado.partido_ganador} />
                              : '-'}
                          </td>
                          <td className="px-3 py-2">{p.procesado?.total_votos?.toLocaleString() || '-'}</td>
                          <td className="px-3 py-2">
                            {p.error === 'OMITIDO_FILTRO' ? (
                              <span className="text-yellow-600">Omitida (filtro)</span>
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
              <button onClick={() => setStep('mapeo')} className="btn-secondary flex items-center gap-2">
                <ArrowLeft size={16} /> Corregir mapeo
              </button>
              <button
                disabled={!preview || preview.exitosas === 0 || importing}
                onClick={() => setStep('importando')}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Proceder a importar <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 'importando' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-secondary-900">6. Importar a base de datos</h3>
              <p className="text-sm text-secondary-500">Confirma para guardar los registros. Recuerda: los históricos no se editan, solo se eliminan.</p>
            </div>

            {!importResult && (
              <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-4">
                <p className="text-sm text-secondary-700">
                  Se importará: <strong>{TIPO_HISTORICO_LABEL[metadatos.tipo_historico]}</strong> —{' '}
                  <strong>{TIPO_ELECCION_LABEL[metadatos.tipo_eleccion]} {metadatos.anio}</strong>
                  {metadatos.municipio_nombre && (
                    <span className="ml-1">en <strong>{metadatos.municipio_nombre}</strong></span>
                  )}
                </p>
                <p className="mt-2 text-sm text-secondary-500">
                  Filas válidas a guardar: {preview?.exitosas?.toLocaleString()} de {preview?.totalFilas?.toLocaleString()}
                </p>
              </div>
            )}

            {!importResult && (
              <div className="flex justify-between">
                <button onClick={() => setStep('validacion')} className="btn-secondary flex items-center gap-2">
                  <ArrowLeft size={16} /> Atrás
                </button>
                <button
                  disabled={importing}
                  onClick={() => handleImportar()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  <Upload size={18} /> {importing ? 'Importando...' : 'Importar histórico'}
                </button>
              </div>
            )}

            {importResult && (
              <div className={`rounded-lg border p-4 ${importResult.error ? 'border-red-200 bg-red-50' : importResult.exitosos > 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
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
                      <p className="font-medium text-red-700">{importResult.error}</p>
                    ) : (
                      <>
                        <p className={`font-medium ${importResult.exitosos > 0 ? 'text-green-700' : 'text-amber-700'}`}>
                          Resultado de la importación
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-secondary-500">Total filas CSV</p>
                            <p className="font-bold text-secondary-900">{importResult.totalFilas?.toLocaleString()}</p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-green-600">Importadas</p>
                            <p className="font-bold text-green-700">{importResult.exitosos?.toLocaleString()}</p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-secondary-500">Omitidas por filtro</p>
                            <p className="font-bold text-secondary-900">{(importResult.omitidasFiltro ?? 0).toLocaleString()}</p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-secondary-500">Omitidas vacías/resumen</p>
                            <p className="font-bold text-secondary-900">{(importResult.omitidasVacias ?? 0).toLocaleString()}</p>
                          </div>
                          <div className="rounded border border-white bg-white/60 p-2">
                            <p className="text-xs text-red-600">Duplicadas / errores</p>
                            <p className="font-bold text-red-700">{((importResult.duplicados ?? 0) + (importResult.errores ?? 0)).toLocaleString()}</p>
                          </div>
                        </div>
                        {importResult.duplicados > 0 && (
                          <p className="mt-2 text-xs text-amber-700">
                            {importResult.duplicados} filas ya existen para este mismo histórico (mismo tipo, elección, año y territorio). Podés eliminar el lote existente y reimportar.
                          </p>
                        )}
                        {importResult.errores > 0 && (
                          <>
                            <p className="mt-2 text-red-600">Errores: {importResult.errores} filas.</p>
                            {importResult.detallesErrores?.length > 0 && (
                              <div className="mt-2 max-h-32 overflow-y-auto rounded border border-red-100 bg-white p-2 text-xs text-red-700">
                                {importResult.detallesErrores.slice(0, 10).map((e: any, idx: number) => (
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
                      if (confirm('¿Eliminar el histórico existente de este lote y volver a importar el archivo? Esta acción no se puede deshacer.')) {
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
                      setVista('dashboard');
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

    // Determinar actor principal global del proyecto
    const principales = agrupados
      .filter((g) => g.tipo_historico === 'principal' && g.partido_principal)
      .map((g) => g.partido_principal as string);
    const conteoPrincipal = new Map<string, number>();
    resultados.forEach((r) => {
      if (r.partido_principal) {
        conteoPrincipal.set(r.partido_principal, (conteoPrincipal.get(r.partido_principal) || 0) + 1);
      }
    });
    const actorPrincipal =
      principales[0] ||
      (conteoPrincipal.size > 0
        ? Array.from(conteoPrincipal.entries()).sort((a, b) => b[1] - a[1])[0][0]
        : null);

    // Participación promedio (simple de casillas con dato)
    const casillasConParticipacion = resultados.filter(
      (r) => typeof r.participacion_pct === 'number' && r.participacion_pct >= 0
    );
    const participacionPromedio =
      casillasConParticipacion.length > 0
        ? casillasConParticipacion.reduce((acc, r) => acc + r.participacion_pct!, 0) /
          casillasConParticipacion.length
        : 0;

    // Métricas por sección
    const secciones = new Map<
      string,
      { actores: Map<string, number>; total_votos: number; actorPrincipalVotos: number }
    >();

    let votosActorPrincipal = 0;
    const actoresUnicos = new Set<string>();

    resultados.forEach((r) => {
      const desglose = r.desglose_partidos || [];
      desglose.forEach((d) => {
        actoresUnicos.add(d.partido);
        if (!secciones.has(r.seccion)) {
          secciones.set(r.seccion, { actores: new Map(), total_votos: 0, actorPrincipalVotos: 0 });
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
          secciones.set(r.seccion, { actores: new Map(), total_votos: 0, actorPrincipalVotos: 0 });
        }
        secciones.get(r.seccion)!.total_votos += r.total_votos;
      }
    });

    let seccionesGanadas = 0;
    let margenAcumulado = 0;
    let seccionesConMargen = 0;
    let diferenciaVsGanador = 0;

    secciones.forEach((sec) => {
      const ordenados = Array.from(sec.actores.entries()).sort((a, b) => b[1] - a[1]);
      const ganador = ordenados[0];
      const segundo = ordenados[1];

      if (ganador) {
        if (actorPrincipal && ganador[0] === actorPrincipal) {
          seccionesGanadas++;
        }
        if (segundo) {
          const margen =
            sec.total_votos > 0 ? ((ganador[1] - segundo[1]) / sec.total_votos) * 100 : 0;
          margenAcumulado += margen;
          seccionesConMargen++;
        }
        if (actorPrincipal) {
          diferenciaVsGanador += ganador[1] - sec.actorPrincipalVotos;
        }
      }
    });

    const margenPromedio = seccionesConMargen > 0 ? margenAcumulado / seccionesConMargen : 0;

    return {
      historicos,
      participacionPromedio,
      actorPrincipal,
      votosActorPrincipal,
      seccionesGanadas,
      margenPromedio,
      actoresDistintos: actoresUnicos.size,
      diferenciaVsGanador,
      totalSecciones: secciones.size,
    };
  }, [resumen, resultados]);

  const renderDashboard = () => {
    const agrupados = resumen?.agrupados || [];

    return (
      <div className="space-y-6">
        {/* KPIs globales */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Históricos cargados"
            value={kpis.historicos.toLocaleString()}
            subtitle="Agrupados por tipo, elección y año"
            icon={BarChart3}
            color="text-primary-600"
          />
          <KpiCard
            title="Participación promedio"
            value={`${kpis.participacionPromedio.toFixed(2)}%`}
            subtitle="Promedio de casillas con dato"
            icon={Percent}
            color="text-blue-600"
          />
          <KpiCard
            title="Votos del actor principal"
            value={kpis.votosActorPrincipal.toLocaleString()}
            subtitle={kpis.actorPrincipal ? `Actor: ${kpis.actorPrincipal}` : 'Sin actor principal definido'}
            icon={Target}
            color="text-green-600"
          />
          <KpiCard
            title="Secciones ganadas"
            value={kpis.seccionesGanadas.toLocaleString()}
            subtitle={kpis.totalSecciones > 0 ? `De ${kpis.totalSecciones} secciones cargadas` : 'Sin secciones'}
            icon={Award}
            color="text-purple-600"
          />
          <KpiCard
            title="Margen promedio de victoria"
            value={`${kpis.margenPromedio.toFixed(2)}%`}
            subtitle="Diferencia ganador vs segundo lugar"
            icon={TrendingUp}
            color="text-amber-600"
          />
          <KpiCard
            title="Actores distintos"
            value={kpis.actoresDistintos.toLocaleString()}
            subtitle="Partidos / coaliciones registrados"
            icon={Users}
            color="text-cyan-600"
          />
          <KpiCard
            title="Diferencia actor vs ganador"
            value={kpis.diferenciaVsGanador.toLocaleString()}
            subtitle={kpis.actorPrincipal ? `Votos: ganador − ${kpis.actorPrincipal}` : 'Sin actor principal'}
            icon={Vote}
            color="text-rose-600"
          />
        </div>

        {/* Grilla de tarjetas */}
        <div className="card p-4">
          <div className="mb-4 flex items-center gap-2">
            <Table2 size={20} className="text-primary-600" />
            <h3 className="text-lg font-bold text-secondary-900">Históricos cargados</h3>
          </div>

          {agrupadosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-secondary-300 bg-secondary-50 p-10 text-center">
              <BarChart3 size={40} className="text-secondary-300" />
              <p className="mt-3 text-sm font-medium text-secondary-700">Aún no hay históricos cargados</p>
              <p className="text-xs text-secondary-500">Subí tu primera sábana electoral para empezar a analizar.</p>
              <button
                onClick={() => {
                  resetWizard();
                  setVista('wizard');
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
                  ? g.partidos.find((p) => p.partido === g.partido_principal)?.votos
                  : undefined;
                return (
                  <div key={idx} className="rounded-lg border border-secondary-200 bg-white p-4 transition hover:shadow-sm">
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <span className="text-xs font-medium text-secondary-500">
                          {TIPO_HISTORICO_LABEL[g.tipo_historico] || g.tipo_historico}
                        </span>
                        <h4 className="text-base font-bold text-secondary-900">
                          {TIPO_ELECCION_LABEL[g.tipo_eleccion] || g.tipo_eleccion} {g.anio}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-secondary-500">
                        <MapPin size={12} />
                        {g.municipio_id ? `Municipio ${g.municipio_id}` : g.estado_id ? `Estado ${g.estado_id}` : 'Sin territorio'}
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-secondary-50 p-2">
                        <p className="text-secondary-500">Registros</p>
                        <p className="font-bold text-secondary-900">{g.registros.toLocaleString()}</p>
                      </div>
                      <div className="rounded bg-secondary-50 p-2">
                        <p className="text-secondary-500">Secciones</p>
                        <p className="font-bold text-secondary-900">{g.secciones.toLocaleString()}</p>
                      </div>
                      <div className="rounded bg-secondary-50 p-2">
                        <p className="text-secondary-500">Casillas</p>
                        <p className="font-bold text-secondary-900">{g.casillas.toLocaleString()}</p>
                      </div>
                      <div className="rounded bg-secondary-50 p-2">
                        <p className="text-secondary-500">Total votos</p>
                        <p className="font-bold text-secondary-900">{g.total_votos.toLocaleString()}</p>
                      </div>
                    </div>

                    {g.partido_principal && (
                      <div className="mb-2 flex items-center gap-2 text-xs">
                        <span className="text-secondary-500">Actor principal:</span>
                        <PartidoBadge partido={g.partido_principal} />
                        <span className="font-medium text-secondary-700">{principalVotos !== undefined ? principalVotos.toLocaleString() : '—'}</span>
                      </div>
                    )}

                    <div className="mb-4">
                      <p className="mb-1 text-xs text-secondary-500">Top actores</p>
                      <DesglosePreview desglose={g.partidos} principal={g.partido_principal} />
                    </div>

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
                );
              })}
            </div>
          )}
        </div>
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
                onChange={(e) => setFiltros({ ...filtros, tipo_historico: e.target.value })}
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
                onChange={(e) => setFiltros({ ...filtros, tipo_eleccion: e.target.value })}
                className="input"
              >
                <option value="">Todas</option>
                {Object.entries(TIPO_ELECCION_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Año</label>
              <select
                value={filtros.anio}
                onChange={(e) => setFiltros({ ...filtros, anio: e.target.value })}
                className="input"
              >
                <option value="">Todos</option>
                {Array.from(new Set(resultados.map((r) => r.anio))).sort((a, b) => b - a).map((a) => (
                  <option key={a} value={a}>{a}</option>
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
                  onChange={(e) => setFiltros({ ...filtros, seccion: e.target.value })}
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
            <p className="text-sm text-secondary-500">No hay históricos cargados para los filtros seleccionados.</p>
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
                        {TIPO_HISTORICO_LABEL[g.tipo_historico] || g.tipo_historico}
                      </td>
                      <td className="px-4 py-3 text-secondary-700">{TIPO_ELECCION_LABEL[g.tipo_eleccion] || g.tipo_eleccion}</td>
                      <td className="px-4 py-3 text-secondary-700">{g.anio}</td>
                      <td className="px-4 py-3 text-secondary-700">
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-secondary-400" />
                          {g.municipio_id ? `Municipio ${g.municipio_id}` : g.estado_id ? `Estado ${g.estado_id}` : 'Sin territorio'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{g.registros.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{g.secciones.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{g.casillas.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium">{g.total_votos.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {g.partido_principal ? (
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: PARTIDO_COLORS[g.partido_principal.toUpperCase()] || PARTIDO_COLORS.OTRO }}
                          >
                            {g.partido_principal} {(g.partidos.find((p) => p.partido === g.partido_principal)?.votos || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-secondary-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <DesglosePreview desglose={g.partidos} principal={g.partido_principal} />
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
        onDashboard={() => setVista('dashboard')}
        onListado={() => setVista('listado')}
      />
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
            Históricos principales y complementarios por casilla para inteligencia electoral.
          </p>
        </div>

        <div className="flex gap-2">
          {vista !== 'dashboard' && (
            <button
              onClick={() => setVista('dashboard')}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            >
              <LayoutDashboard size={16} /> Dashboard
            </button>
          )}
          {vista !== 'listado' && (
            <button
              onClick={() => setVista('listado')}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
            >
              <Table2 size={16} /> Listado
            </button>
          )}
          <button
            onClick={() => {
              resetWizard();
              setVista('wizard');
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              vista === 'wizard' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'
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

      {vista === 'dashboard' && renderDashboard()}
      {vista === 'listado' && renderListado()}
      {vista === 'detalle' && renderDetalle()}
      {vista === 'wizard' && renderWizard()}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: IconComp,
  color = 'text-primary-600',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  color?: string;
}) {
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-secondary-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-secondary-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-secondary-500">{subtitle}</p>}
        </div>
        {IconComp && <IconComp size={22} className={color} />}
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
  const pct = width !== undefined ? Math.min(100, Math.max(0, width)) : max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-xs">
        {label && <span className="font-medium text-secondary-700">{label}</span>}
        <span className="text-secondary-500">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary-200">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color || '#4f46e5' }}
        />
      </div>
    </div>
  );
}

function ActoresChart({
  actores,
  principal,
}: {
  actores: { partido: string; votos: number }[];
  principal?: string;
}) {
  const sorted = [...actores].sort((a, b) => b.votos - a.votos);
  const max = sorted[0]?.votos || 1;
  return (
    <div className="space-y-2">
      {sorted.map((a) => {
        const isPrincipal = principal && a.partido === principal;
        return (
          <div
            key={a.partido}
            className={`rounded-lg ${isPrincipal ? 'border border-primary-300 bg-primary-50 p-2' : 'p-2'}`}
          >
            <MiniBar
              label={a.partido}
              value={a.votos}
              max={max}
              color={PARTIDO_COLORS[a.partido.toUpperCase()] || PARTIDO_COLORS.OTRO}
            />
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
    return <p className="text-sm text-secondary-500">No hay casillas para mostrar.</p>;
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
            <th className="px-3 py-2 text-right">Total votos</th>
            <th className="px-3 py-2 text-right">Participación</th>
            <th className="px-3 py-2 text-left">Desglose</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-secondary-100">
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-secondary-50">
              <td className="px-3 py-2 font-medium text-secondary-900">{r.seccion}</td>
              <td className="px-3 py-2 text-secondary-700">{r.casilla}</td>
              <td className="px-3 py-2">
                <PartidoBadge partido={r.partido_ganador} />
              </td>
              <td className="px-3 py-2 text-right text-secondary-700">{r.votos_ganador?.toLocaleString() || '-'}</td>
              <td className="px-3 py-2 text-right text-secondary-700">{r.total_votos?.toLocaleString() || '-'}</td>
              <td className="px-3 py-2 text-right text-secondary-700">
                {r.participacion_pct !== undefined ? `${r.participacion_pct.toFixed(2)}%` : '-'}
              </td>
              <td className="px-3 py-2">
                <DesglosePreview desglose={r.desglose_partidos} principal={principal || r.partido_principal} />
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
        if (h.municipio_id !== undefined) params.municipio_id = String(h.municipio_id);
        const { data } = await resultadosHistoricosApi.getAll(params);
        setCasillas(data || []);
      } catch (err: any) {
        setDetalleError(err.response?.data?.message || 'Error al cargar el detalle del histórico');
      } finally {
        setDetalleLoading(false);
      }
    };
    cargar();
  }, [h]);

  const actores = h.partidos || [];
  const sortedActores = [...actores].sort((a, b) => b.votos - a.votos);
  const ganador = sortedActores[0];
  const principalVotos = h.partido_principal ? actores.find((p) => p.partido === h.partido_principal)?.votos : undefined;

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
        <KpiCard title="Registros" value={h.registros.toLocaleString()} icon={BarChart3} color="text-primary-600" />
        <KpiCard title="Casillas" value={h.casillas.toLocaleString()} icon={MapPin} color="text-blue-600" />
        <KpiCard title="Secciones" value={h.secciones.toLocaleString()} icon={Users} color="text-green-600" />
        <KpiCard title="Total votos" value={h.total_votos.toLocaleString()} icon={Vote} color="text-purple-600" />
        <KpiCard
          title="Actor principal"
          value={h.partido_principal ? `${h.partido_principal} ${principalVotos !== undefined ? principalVotos.toLocaleString() : ''}` : '—'}
          subtitle={h.partido_principal ? 'Votos del proyecto' : undefined}
          icon={BarChart3}
          color="text-primary-600"
        />
        <KpiCard
          title="Ganador"
          value={ganador ? `${ganador.partido} ${ganador.votos.toLocaleString()}` : '—'}
          subtitle={ganador ? 'Primer lugar en votos' : undefined}
          icon={Vote}
          color="text-green-600"
        />
      </div>

      {/* Gráfico de actores */}
      <div className="card p-4">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-primary-600" />
          <h3 className="text-lg font-bold text-secondary-900">Votos por actor</h3>
        </div>
        <ActoresChart actores={actores} principal={h.partido_principal} />
      </div>

      {/* Tabla de casillas */}
      <div className="card p-4">
        <div className="mb-4 flex items-center gap-2">
          <Table2 size={20} className="text-primary-600" />
          <h3 className="text-lg font-bold text-secondary-900">Casillas</h3>
          <span className="ml-auto text-xs text-secondary-500">{casillas.length.toLocaleString()} registros</span>
        </div>
        {detalleLoading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
          </div>
        ) : detalleError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{detalleError}</div>
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
      {partido || '—'}
    </span>
  );
}

function DesglosePreview({
  desglose,
  principal,
}: {
  desglose?: { partido: string; votos: number; tipo?: 'individual' | 'coalicion' }[];
  principal?: string;
}) {
  if (!desglose || desglose.length === 0) return <span className="text-secondary-400">-</span>;
  const sorted = [...desglose].sort((a, b) => b.votos - a.votos);
  const top = sorted.slice(0, 3);
  const principalEnTop = principal && top.some((a) => a.partido === principal);
  const principalActor = principal ? sorted.find((a) => a.partido === principal) : null;
  const entries = principalEnTop || !principalActor ? top : [...top.slice(0, 2), principalActor];
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map((actor) => (
        <span
          key={`${actor.partido}-${actor.tipo}`}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
            actor.partido === principal
              ? 'border-primary-300 bg-primary-50 text-primary-800 font-semibold'
              : 'border-secondary-200 bg-white text-secondary-700'
          }`}
          title={actor.tipo === 'coalicion' ? 'Coalición' : 'Individual'}
        >
          <span className={actor.partido === principal ? 'font-bold' : 'font-semibold'}>{actor.partido}</span> {actor.votos.toLocaleString()}
          {actor.tipo === 'coalicion' && <span className="text-[10px] text-secondary-400">C</span>}
        </span>
      ))}
    </div>
  );
}
