'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { inteligenciaElectoralApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
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
} from 'lucide-react';

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
  tipo_voto: 'TOTAL' | 'DIFERENCIADO';
  tipo_actor: 'PARTIDO' | 'CANDIDATO' | 'COALICION' | 'INDEPENDIENTE';
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

const MapaSecciones = dynamic(() => import('./MapaSecciones'), { ssr: false });

export default function InteligenciaElectoralPage() {
  const [elecciones, setElecciones] = useState<Eleccion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [eleccionId, setEleccionId] = useState<string>('');
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);
  const [actores, setActores] = useState<Actor[]>([]);
  const [secciones, setSecciones] = useState<SeccionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalogos' | 'carga' | 'analisis' | 'mapa' | 'consultor'>('catalogos');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [analizando, setAnalizando] = useState<string | null>(null);
  const [analisisResult, setAnalisisResult] = useState<any>(null);
  const [geojsonMapa, setGeojsonMapa] = useState<any>(null);
  const [cargandoMapa, setCargandoMapa] = useState(false);

  // Consultor IA
  const [pregunta, setPregunta] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [respuestaIA, setRespuestaIA] = useState<string | null>(null);
  const [contextoCampana, setContextoCampana] = useState<Record<string, string>>({
    objetivo: '',
    escenario: '',
    preocupaciones: '',
    oportunidades: '',
    instrucciones: '',
  });
  const [fuentesIA, setFuentesIA] = useState<Record<string, boolean>>({
    proyeccion: true,
    historico: true,
    votantes: true,
    sedes: true,
    eleccion: true,
  });
  const [filtroTerritorialIA, setFiltroTerritorialIA] = useState<{ tipo: 'todos' | 'zona' | 'seccion' | 'municipio'; valor: string }>({ tipo: 'todos', valor: '' });
  const [zonasDisponibles, setZonasDisponibles] = useState<Array<{ id: string; nombre: string }>>([]);

  // Formularios
  const [partidoForm, setPartidoForm] = useState<Partial<Partido>>({});
  const [partidoEdit, setPartidoEdit] = useState<string | null>(null);
  const [eleccionForm, setEleccionForm] = useState<Partial<Eleccion>>({ anio: new Date().getFullYear(), activa: true });
  const [eleccionEdit, setEleccionEdit] = useState<string | null>(null);
  const [actorForm, setActorForm] = useState<Partial<Actor>>({});
  const [actorEdit, setActorEdit] = useState<string | null>(null);

  useEffect(() => {
    cargarInicial();
    cargarZonas();
  }, []);

  useEffect(() => {
    if (eleccionId) {
      cargarEleccion(eleccionId);
    } else {
      setEleccion(null);
      setActores([]);
      setSecciones([]);
      setGeojsonMapa(null);
    }
  }, [eleccionId]);

  useEffect(() => {
    if (activeTab === 'mapa' && eleccionId) {
      cargarMapaSecciones(eleccionId);
    }
  }, [activeTab, eleccionId]);

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
      setError(err.response?.data?.message || 'Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const cargarZonas = async () => {
    try {
      const { data } = await import('@/lib/api').then((m) => m.zonasApi.getAll());
      setZonasDisponibles((data || []).map((z: any) => ({ id: z.id, nombre: z.nombre })));
    } catch (err) {
      // No crítico: algunos tenants no usan zonas
    }
  };

  const cargarEleccion = async (id: string) => {
    try {
      const { data } = await inteligenciaElectoralApi.getEleccion(id);
      setEleccion(data);
      setActores(data.actores || []);
      const [sec] = await Promise.all([
        inteligenciaElectoralApi.getSecciones(id),
      ]);
      setSecciones(sec.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar elección');
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
      setError(err.response?.data?.message || 'Error al guardar partido');
    }
  };

  const eliminarPartido = async (id: string) => {
    if (!confirm('¿Eliminar partido?')) return;
    try {
      await inteligenciaElectoralApi.deletePartido(id);
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar partido');
    }
  };

  const guardarEleccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eleccionForm.nombre || !eleccionForm.anio || !eleccionForm.puesto) return;
    try {
      if (eleccionEdit) {
        await inteligenciaElectoralApi.updateEleccion(eleccionEdit, eleccionForm);
      } else {
        await inteligenciaElectoralApi.createEleccion(eleccionForm);
      }
      setEleccionForm({ anio: new Date().getFullYear(), activa: true });
      setEleccionEdit(null);
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar elección');
    }
  };

  const eliminarEleccion = async (id: string) => {
    if (!confirm('¿Eliminar elección? Se borrarán todos sus resultados y análisis.')) return;
    try {
      await inteligenciaElectoralApi.deleteEleccion(id);
      if (eleccionId === id) setEleccionId('');
      cargarInicial();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar elección');
    }
  };

  const guardarActor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actorForm.nombre_visual || !actorForm.columna_excel_alias || !eleccionId) return;
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
      setError(err.response?.data?.message || 'Error al guardar actor');
    }
  };

  const eliminarActor = async (id: string) => {
    if (!confirm('¿Eliminar actor/coalición?')) return;
    try {
      await inteligenciaElectoralApi.deleteActor(id);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar actor');
    }
  };

  const descargarPlantilla = async () => {
    if (!eleccionId) return;
    try {
      const res = await inteligenciaElectoralApi.descargarPlantilla(eleccionId);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plantilla_${eleccion?.nombre?.replace(/\s+/g, '_') || 'eleccion'}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al descargar plantilla');
    }
  };

  const descargarSabana = async () => {
    if (!eleccionId) return;
    try {
      const res = await inteligenciaElectoralApi.descargarSabana(eleccionId);
      const blob = new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sabana_${eleccion?.nombre?.replace(/\s+/g, '_') || 'eleccion'}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al descargar sábana');
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
      formData.append('archivo', file);
      const { data } = await inteligenciaElectoralApi.cargarExcel(eleccionId, formData);
      setImportResult(data);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setImportResult({ error: err.response?.data?.message || 'Error al cargar Excel' });
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
      setError(err.response?.data?.message || 'Error al cargar mapa de secciones');
    } finally {
      setCargandoMapa(false);
    }
  };

  const analizarSeccion = async (seccion: string) => {
    if (!eleccionId) return;
    setAnalizando(seccion);
    setAnalisisResult(null);
    try {
      const { data } = await inteligenciaElectoralApi.analizarSeccion(eleccionId, seccion);
      setAnalisisResult(data);
      cargarEleccion(eleccionId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al analizar sección');
    } finally {
      setAnalizando(null);
    }
  };

  const colorClasificacion = (c: string) => {
    switch (c) {
      case 'BASTION': return 'bg-green-100 text-green-700 border-green-200';
      case 'PRIORITARIA_RIESGO': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-secondary-900">
            <Icon name="ia" size={28} className="text-primary-600" />
            Inteligencia Electoral
          </h1>
          <p className="text-sm text-secondary-500">
            Cuarto de guerra digital: sábanas, mapa y proyección con IA
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
            onClick={() => setActiveTab('catalogos')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'catalogos' ? 'bg-primary-600 text-white' : 'bg-white text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <Users size={16} /> Catálogos
          </button>
          <button
            onClick={() => setActiveTab('carga')}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50"
          >
            <Upload size={16} /> Cargar
          </button>
          <button
            onClick={() => setActiveTab('analisis')}
            disabled={!eleccionId}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-secondary-700 transition hover:bg-secondary-50 disabled:opacity-50"
          >
            <BrainCircuit size={16} /> Análisis
          </button>
          <button
            onClick={() => setActiveTab('consultor')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              activeTab === 'consultor'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <Sparkles size={16} /> Consultor IA
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'catalogos' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Partidos */}
          <div className="card p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-secondary-900">
              <Award size={20} className="text-primary-600" /> Partidos Políticos
            </h2>

            <form onSubmit={guardarPartido} className="mb-4 grid gap-3 sm:grid-cols-4">
              <input
                placeholder="Nombre"
                value={partidoForm.nombre || ''}
                onChange={(e) => setPartidoForm({ ...partidoForm, nombre: e.target.value })}
                className="input"
                required
              />
              <input
                placeholder="Siglas"
                value={partidoForm.siglas || ''}
                onChange={(e) => setPartidoForm({ ...partidoForm, siglas: e.target.value })}
                className="input"
                required
              />
              <input
                type="color"
                placeholder="Color"
                value={partidoForm.color_hex || '#3B82F6'}
                onChange={(e) => setPartidoForm({ ...partidoForm, color_hex: e.target.value })}
                className="input h-10 px-2"
              />
              <button type="submit" className="btn-primary flex items-center justify-center gap-1">
                <Plus size={16} /> {partidoEdit ? 'Actualizar' : 'Agregar'}
              </button>
            </form>

            <div className="divide-y divide-gray-100">
              {partidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: p.color_hex || '#ccc' }} />
                    <span className="font-medium">{p.nombre}</span>
                    <span className="text-xs text-secondary-500">({p.siglas})</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setPartidoEdit(p.id); setPartidoForm(p); }}
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
              <Calendar size={20} className="text-primary-600" /> Eventos Electorales
            </h2>

            <form onSubmit={guardarEleccion} className="mb-4 grid gap-3 sm:grid-cols-5">
              <input
                placeholder="Nombre (opcional)"
                value={eleccionForm.nombre || ''}
                onChange={(e) => setEleccionForm({ ...eleccionForm, nombre: e.target.value })}
                className="input"
              />
              <input
                type="number"
                placeholder="Año"
                value={eleccionForm.anio || ''}
                onChange={(e) => setEleccionForm({ ...eleccionForm, anio: Number(e.target.value) })}
                className="input"
                required
              />
              <select
                value={eleccionForm.puesto || ''}
                onChange={(e) => setEleccionForm({ ...eleccionForm, puesto: e.target.value })}
                className="input"
                required
              >
                <option value="">Seleccionar cargo...</option>
                <option value="Presidente República">Presidente República</option>
                <option value="Diputaciones Federales">Diputaciones Federales</option>
                <option value="Diputaciones Locales">Diputaciones Locales</option>
                <option value="Alcalde">Alcalde</option>
                <option value="Otro">Otro</option>
              </select>
              <select
                value={eleccionForm.activa ? 'true' : 'false'}
                onChange={(e) => setEleccionForm({ ...eleccionForm, activa: e.target.value === 'true' })}
                className="input"
              >
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
              <button type="submit" className="btn-primary flex items-center justify-center gap-1">
                <Plus size={16} /> {eleccionEdit ? 'Actualizar' : 'Agregar'}
              </button>
            </form>

            <div className="divide-y divide-gray-100">
              {elecciones.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{e.nombre}</span>
                    <span className="ml-2 text-xs text-secondary-500">{e.anio} · {e.puesto} · {e._count?.actores || 0} actores</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setEleccionEdit(e.id); setEleccionForm(e); }}
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
              <Users size={20} className="text-primary-600" /> Actores y Coaliciones
              {eleccion && <span className="text-sm font-normal text-secondary-500">· {eleccion.nombre}</span>}
            </h2>

            {eleccionId ? (
              <>
                <form onSubmit={guardarActor} className="mb-4 grid gap-3 sm:grid-cols-8">
                  <select
                    value={actorForm.partido_id || ''}
                    onChange={(e) => setActorForm({ ...actorForm, partido_id: e.target.value || undefined })}
                    className="input"
                  >
                    <option value="">Sin partido</option>
                    {partidos.map((p) => (
                      <option key={p.id} value={p.id}>{p.siglas}</option>
                    ))}
                  </select>
                  <select
                    value={actorForm.tipo_actor || 'PARTIDO'}
                    onChange={(e) => setActorForm({ ...actorForm, tipo_actor: e.target.value as any })}
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
                    value={actorForm.nombre_visual || ''}
                    onChange={(e) => setActorForm({ ...actorForm, nombre_visual: e.target.value })}
                    className="input"
                    required
                  />
                  <input
                    placeholder="Nombre coalición"
                    value={actorForm.nombre_coalicion || ''}
                    onChange={(e) => setActorForm({ ...actorForm, nombre_coalicion: e.target.value })}
                    className="input"
                    title="Solo si es coalición"
                  />
                  <input
                    type="color"
                    value={actorForm.color_hex || '#3B82F6'}
                    onChange={(e) => setActorForm({ ...actorForm, color_hex: e.target.value })}
                    className="input h-10 px-2"
                  />
                  <input
                    placeholder="Alias Excel"
                    value={actorForm.columna_excel_alias || ''}
                    onChange={(e) => setActorForm({ ...actorForm, columna_excel_alias: e.target.value })}
                    className="input"
                    required
                  />
                  <select
                    value={actorForm.tipo_voto || 'TOTAL'}
                    onChange={(e) => setActorForm({ ...actorForm, tipo_voto: e.target.value as any })}
                    className="input"
                    title="¿Voto total o diferenciado?"
                  >
                    <option value="TOTAL">Voto total</option>
                    <option value="DIFERENCIADO">Voto diferenciado</option>
                  </select>
                  <button type="submit" className="btn-primary flex items-center justify-center gap-1">
                    <Plus size={16} /> {actorEdit ? 'Actualizar' : 'Agregar'}
                  </button>
                </form>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {actores.map((a) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full" style={{ backgroundColor: a.color_hex || a.partido?.color_hex || '#ccc' }} />
                        <div>
                          <p className="font-medium">{a.nombre_visual}</p>
                          <p className="text-xs text-secondary-500">
                            {a.tipo_actor === 'COALICION' ? `Coalición: ${a.nombre_coalicion || '—'}` : a.partido?.siglas || a.tipo_actor} · {a.tipo_voto === 'DIFERENCIADO' ? 'Voto diferenciado' : 'Voto total'} · Excel: {a.columna_excel_alias}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setActorEdit(a.id); setActorForm(a); }}
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
              <p className="text-sm text-secondary-500">Selecciona una elección arriba para configurar sus actores.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'carga' && (
        <div className="card p-6">
          {!eleccion ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>Paso 1:</strong> selecciona o crea una elección arriba para poder cargar sábanas.
            </div>
          ) : (
            <>
              <h3 className="mb-2 text-lg font-bold text-secondary-900">Cargar sábanas de votación</h3>
              <p className="mb-4 text-sm text-secondary-500">
                Elección: <strong>{eleccion.nombre}</strong> · {actores.length} actores configurados · {secciones.length} secciones cargadas
              </p>

              <div className="mb-6 flex flex-wrap gap-3">
                <button onClick={descargarPlantilla} className="btn-secondary flex items-center gap-2">
                  <Download size={16} /> Plantilla para carga
                </button>
                <button onClick={descargarSabana} disabled={secciones.length === 0} className="btn-secondary flex items-center gap-2 disabled:opacity-50" title={secciones.length === 0 ? 'Carga resultados primero' : ''}>
                  <Download size={16} /> Sábana completa
                </button>
              </div>

              <form onSubmit={cargarExcel} className="space-y-4">
                <div>
                  <label className="label">Archivo Excel (.xlsx, .xls o .csv)</label>
                  <input type="file" name="archivo" accept=".xlsx,.xls,.csv" className="input" required />
                </div>
                <button
                  type="submit"
                  disabled={importing || actores.length === 0}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                  title={actores.length === 0 ? 'Configura actores antes de cargar' : ''}
                >
                  <Upload size={18} />
                  {importing ? 'Procesando...' : 'Cargar sábanas'}
                </button>
                {actores.length === 0 && (
                  <p className="text-sm text-amber-700">Configura al menos un actor/coalición en la pestaña Catálogos para poder cargar votos.</p>
                )}
              </form>
            </>
          )}

          {importResult && (
            <div className={`mt-6 rounded-lg border p-4 ${importResult.error ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <div className="flex items-start gap-3">
                {importResult.error ? (
                  <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                )}
                <div className="text-sm">
                  {importResult.error ? (
                    <p className="font-medium text-red-700">{importResult.error}</p>
                  ) : (
                    <>
                      <p className="font-medium text-green-700">
                        Carga completada: {importResult.insertados} de {importResult.filasLeidas} casillas.
                      </p>
                      {importResult.errores > 0 && (
                        <p className="mt-1 text-red-600">Errores: {importResult.errores}</p>
                      )}
                      {importResult.detallesErrores?.length > 0 && (
                        <ul className="mt-2 max-h-40 overflow-y-auto list-inside list-disc text-red-600">
                          {importResult.detallesErrores.map((e: any, i: number) => (
                            <li key={i}>Fila {e.fila}: {e.error}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analisis' && eleccion && (
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="p-4">
              <h3 className="mb-2 text-lg font-bold text-secondary-900 flex items-center gap-2">
                <BarChart3 size={20} className="text-primary-600" /> Resumen por sección
              </h3>
              <p className="text-sm text-secondary-500">{secciones.length} secciones procesadas</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Sección</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Ganador</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Votos</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Lista Nominal</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Participación</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">% Nulos</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Clasificación</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {secciones.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.seccion}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.actor?.color_hex || s.actor?.partido?.color_hex || '#ccc' }} />
                          <span>{s.actor?.nombre_visual || 'Sin ganador'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.total_votos_total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{s.lista_nominal_total.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{s.porcentaje_participacion.toFixed(2)}%</td>
                      <td className="px-4 py-3 text-gray-600">{s.porcentaje_votos_nulos.toFixed(2)}%</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${colorClasificacion(s.clasificacion_estrategica)}`}>
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
                          {analizando === s.seccion ? 'Analizando...' : 'Analizar con IA'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {secciones.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay secciones cargadas. Ve a la pestaña <strong>Cargar</strong> y sube un Excel.
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
                  <p className="text-xs text-secondary-500">Proyección de votos mínimos</p>
                  <p className="text-xl font-bold text-primary-700">{analisisResult.proyeccion_votos?.toLocaleString() || '—'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-secondary-500">Nivel de riesgo</p>
                  <p className={`text-xl font-bold ${analisisResult.nivel_riesgo === 'ALTO' ? 'text-red-600' : analisisResult.nivel_riesgo === 'BAJO' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {analisisResult.nivel_riesgo}
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-xs text-secondary-500">Actor ganador</p>
                  <p className="text-xl font-bold text-secondary-800">{analisisResult.actor_ganador}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-secondary-900">Auditoría / Defensa electoral</p>
                <p className="text-sm text-secondary-600">{analisisResult.auditoria_nulos_observaciones}</p>
              </div>
              <div className="mt-3">
                <p className="text-sm font-medium text-secondary-900">Estrategia recomendada</p>
                <ul className="mt-1 list-inside list-disc text-sm text-secondary-600">
                  {analisisResult.estrategia?.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'consultor' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={22} className="text-primary-600" />
              <h3 className="text-lg font-bold text-secondary-900">Consultor IA de Campaña</h3>
            </div>
            <p className="mb-4 text-sm text-secondary-600">
              Escribe lo que quieres saber o decidir. La IA analiza tu proyección de votos, histórico electoral,
              votantes, sedes y, si seleccionas una elección, los actores y sábanas cargadas.
            </p>

            <div className="mb-4 grid gap-4 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-1">
                <label className="label flex items-center gap-2">
                  <Database size={16} className="text-primary-600" /> Fuentes de datos a vincular
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'proyeccion', label: 'Proyección de votos' },
                    { key: 'historico', label: 'Histórico electoral' },
                    { key: 'votantes', label: 'Votantes / simpatizantes' },
                    { key: 'sedes', label: 'Sedes / casillas' },
                    { key: 'eleccion', label: 'Elección y actores' },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        fuentesIA[f.key] ? 'border-primary-300 bg-primary-50 text-secondary-900' : 'border-gray-200 bg-white text-secondary-600'
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
                  {filtroTerritorialIA.tipo !== 'todos' && filtroTerritorialIA.tipo !== 'zona' && (
                    <input
                      type="text"
                      value={filtroTerritorialIA.valor}
                      onChange={(e) => setFiltroTerritorialIA({ ...filtroTerritorialIA, valor: e.target.value })}
                      placeholder={
                        filtroTerritorialIA.tipo === 'seccion'
                          ? 'Ej. 0123'
                          : 'Ej. Culiacán'
                      }
                      className="input"
                    />
                  )}
                </div>
              </div>

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

              <div className="flex flex-col gap-3 lg:col-span-1">
                <label className="label">Tu pregunta o instrucción para la IA</label>
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
                        fuentes: fuentesIA,
                        filtroTerritorial: filtroTerritorialIA,
                      });
                      setRespuestaIA(data.respuesta);
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
          </div>

          {respuestaIA && (
            <div className="card p-6">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare size={20} className="text-primary-600" />
                <h4 className="font-bold text-secondary-900">Respuesta</h4>
              </div>
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
        </div>
      )}

      {activeTab === 'mapa' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="mb-2 text-lg font-bold text-secondary-900 flex items-center gap-2">
              <Icon name="mapa" size={20} className="text-primary-600" /> Mapa territorial por ganador
            </h3>
            <p className="text-sm text-secondary-500">
              {eleccion
                ? `Elección: ${eleccion.nombre} · Se muestran las secciones coloreadas según el actor ganador y clasificación estratégica.`
                : 'Selecciona una elección para ver el mapa.'}
            </p>
          </div>
          {eleccion && (
            <div className="card overflow-hidden p-2">
              <MapaSecciones geojson={geojsonMapa} cargando={cargandoMapa} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
