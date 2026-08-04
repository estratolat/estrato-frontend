'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  Users,
  Home,
  GraduationCap,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Vote,
  LayoutGrid,
  Table2,
  ExternalLink,
  Calendar,
  Search,
  ShieldAlert,
  MapPin,
} from 'lucide-react';
import { dataApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Indicador {
  id: string;
  categoria: string;
  subcategoria: string | null;
  indicador: string;
  descripcion: string | null;
  valor_numerico: number | null;
  valor_texto: string | null;
  unidad: string | null;
  periodo: string | null;
  fuente: string;
  fuente_url: string | null;
}

interface ResumenData {
  total: number;
  categorias: {
    categoria: string;
    cantidad: number;
    suma: number;
    promedio: number | null;
    indicadores: Indicador[];
  }[];
}

const COLORS = ['#D73216', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

interface ConfigPais {
  titulo: string;
  subtitulo: string;
  tituloTab: string;
  fuenteNombre: string;
  fuenteUrl: string;
  fuenteCreditos: string;
  errorCarga: string;
}

const CONFIG_POR_PAIS: Record<string, ConfigPais> = {
  mx: {
    titulo: 'Data México',
    subtitulo: 'Indicadores oficiales de Dolores Hidalgo, Guanajuato',
    tituloTab: 'Data México — Dolores Hidalgo Cuna de la Independencia Nacional',
    fuenteNombre: 'Data México',
    fuenteUrl: 'https://www.economia.gob.mx/datamexico/es/profile/geo/dolores-hidalgo-cuna-de-la-independencia-nacional?redirect=true',
    fuenteCreditos: 'Datos curados de INEGI, CONEVAL y Secretaría de Bienestar.',
    errorCarga: 'Error al cargar los indicadores de Data México',
  },
  co: {
    titulo: 'Data Colombia',
    subtitulo: 'Indicadores oficiales de Capitanejo, Santander',
    tituloTab: 'Data Colombia — Capitanejo, Santander',
    fuenteNombre: 'DANE',
    fuenteUrl: 'https://www.dane.gov.co/',
    fuenteCreditos: 'Datos oficiales del Departamento Administrativo Nacional de Estadística (DANE).',
    errorCarga: 'Error al cargar los indicadores de Data Colombia',
  },
};

const CATEGORIA_LABELS: Record<string, string> = {
  poblacion: 'Población',
  vivienda: 'Vivienda',
  educacion: 'Educación',
  empleo: 'Empleo',
  economia: 'Economía',
  pobreza: 'Pobreza',
  seguridad: 'Seguridad',
  territorio: 'Territorio',
  'participacion politica': 'Participación política',
};

const CATEGORIA_COLORS: Record<string, string> = {
  poblacion: '#3B82F6',
  vivienda: '#10B981',
  educacion: '#F59E0B',
  empleo: '#06B6D4',
  economia: '#8B5CF6',
  pobreza: '#D73216',
  seguridad: '#DC2626',
  territorio: '#059669',
  'participacion politica': '#EC4899',
};

const CATEGORIA_ICONS: Record<string, React.ElementType> = {
  poblacion: Users,
  vivienda: Home,
  educacion: GraduationCap,
  empleo: Briefcase,
  economia: TrendingUp,
  pobreza: AlertTriangle,
  seguridad: ShieldAlert,
  territorio: MapPin,
  'participacion politica': Vote,
};

function formatearValor(i: Indicador): string {
  if (i.valor_numerico === null || i.valor_numerico === undefined) return i.valor_texto || '-';
  const u = (i.unidad || '').toLowerCase();
  if (u === '%' || i.indicador.toLowerCase().includes('tasa') || i.indicador.toLowerCase().includes('coeficiente')) {
    return `${i.valor_numerico.toLocaleString('es-MX')}${i.unidad || ''}`;
  }
  if (u.includes('millones') || u.includes('usd') || u.includes('mxn')) {
    return `$${i.valor_numerico.toLocaleString('es-MX')}${u === '%' ? '' : ''}`;
  }
  return `${Number(i.valor_numerico).toLocaleString('es-MX')} ${i.unidad || ''}`.trim();
}

function esPorcentaje(i: Indicador): boolean {
  if (!i.valor_numerico) return false;
  const u = (i.unidad || '').toLowerCase();
  return u === '%' || i.indicador.toLowerCase().includes('tasa') || i.indicador.toLowerCase().includes('carencia');
}

function maximoGrupo(indicadores: Indicador[], nombreIndicador: string): number {
  const vals = indicadores
    .filter((i) => i.indicador === nombreIndicador && i.valor_numerico !== null)
    .map((i) => i.valor_numerico as number);
  return vals.length ? Math.max(...vals) : 0;
}

export default function DataPage() {
  const { user } = useAuth();
  const pais = user?.tenant?.pais || 'mx';
  const esColombia = pais === 'co';
  const configPais = CONFIG_POR_PAIS[pais] || CONFIG_POR_PAIS['mx'];

  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todas');
  const [vista, setVista] = useState<'tarjetas' | 'tabla'>('tarjetas');
  const [busqueda, setBusqueda] = useState('');
  const [indicadorA, setIndicadorA] = useState<Indicador | null>(null);
  const [indicadorB, setIndicadorB] = useState<Indicador | null>(null);
  const [cruceData, setCruceData] = useState<any>(null);
  const [cruceLoading, setCruceLoading] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError('');
      try {
        const [{ data: all }, { data: res }] = await Promise.all([
          dataApi.getIndicadores(),
          dataApi.getResumen(),
        ]);
        setIndicadores(all || []);
        setResumen(res || null);
      } catch (err: any) {
        setError(err.response?.data?.message || configPais.errorCarga);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(indicadores.map((i) => i.categoria));
    return Array.from(set).sort();
  }, [indicadores]);

  const indicadoresFiltrados = useMemo(() => {
    let lista = indicadores;
    if (categoriaActiva !== 'todas') {
      lista = lista.filter((i) => i.categoria === categoriaActiva);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      lista = lista.filter(
        (i) =>
          i.indicador.toLowerCase().includes(q) ||
          (i.subcategoria || '').toLowerCase().includes(q) ||
          (i.descripcion || '').toLowerCase().includes(q)
      );
    }
    return lista;
  }, [indicadores, categoriaActiva, busqueda]);

  const tarjeta = (categoria: string, nombre: string, sub?: string) => {
    const item = indicadores.find((i) => i.categoria === categoria && (!sub || i.subcategoria === sub));
    return item?.valor_numerico ?? null;
  };

  const dataPorCategoria = useMemo(() => {
    return (
      resumen?.categorias.map((c) => ({
        nombre: CATEGORIA_LABELS[c.categoria] || c.categoria,
        cantidad: c.cantidad,
        color: CATEGORIA_COLORS[c.categoria] || '#64748B',
      })) || []
    );
  }, [resumen]);

  const dataPoblacionGenero = useMemo(() => {
    const hombres = tarjeta('poblacion', 'Población por género', 'hombres');
    const mujeres = tarjeta('poblacion', 'Población por género', 'mujeres');
    if (hombres === null || mujeres === null) return [];
    return [
      { nombre: 'Hombres', valor: hombres, color: '#3B82F6' },
      { nombre: 'Mujeres', valor: mujeres, color: '#EC4899' },
    ];
  }, [indicadores]);

  const dataEscolaridad = useMemo(() => {
    const primaria = tarjeta('educacion', 'Escolaridad principal', 'primaria');
    const secundaria = tarjeta('educacion', 'Escolaridad principal', 'secundaria');
    const prepa = tarjeta('educacion', 'Escolaridad principal', 'preparatoria');
    const ani = tarjeta('educacion', 'Tasa de analfabetismo', 'analfabetismo');
    return [
      { nombre: 'Primaria', valor: primaria },
      { nombre: 'Secundaria', valor: secundaria },
      { nombre: 'Preparatoria', valor: prepa },
      { nombre: 'Analfabetismo', valor: ani },
    ].filter((d) => d.valor !== null) as { nombre: string; valor: number }[];
  }, [indicadores]);

  const dataEconomia = useMemo(() => {
    const sectores = esColombia
      ? ['agricultura', 'ganadería', 'comercio', 'servicios']
      : ['comercio al por menor', 'otros servicios', 'alojamiento y alimentos', 'industria manufacturera'];
    return sectores
      .map((s) => ({
        nombre: s
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        valor: tarjeta('economia', 'Establecimientos por sector', s),
      }))
      .filter((d) => d.valor !== null) as { nombre: string; valor: number }[];
  }, [indicadores, esColombia]);

  const dataPobreza = useMemo(() => {
    const items = indicadores.filter(
      (i) =>
        i.categoria === 'pobreza' &&
        i.indicador.toLowerCase().includes('carencia') &&
        i.valor_numerico !== null
    );
    return items.map((i) => ({
      nombre: i.subcategoria || i.indicador,
      valor: i.valor_numerico as number,
    }));
  }, [indicadores]);

  const indicadoresNumericos = useMemo(() => {
    return indicadores.filter((i) => i.valor_numerico !== null && i.valor_numerico !== undefined);
  }, [indicadores]);

  const handleCruzar = async () => {
    if (!indicadorA || !indicadorB || indicadorA.id === indicadorB.id) return;
    setCruceLoading(true);
    try {
      const { data } = await dataApi.getCruce(indicadorA.indicador, indicadorB.indicador, indicadorA.periodo || undefined);
      setCruceData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cruzar indicadores');
    } finally {
      setCruceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-secondary-900 to-secondary-800 p-6 text-white shadow-lg md:p-8">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold">{configPais.titulo}</h2>
          <p className="mt-1 text-white/80">{configPais.subtitulo}</p>
        </div>
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tarjetas resumen */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de indicadores" valor={resumen?.total || 0} suffix="" color="#0891B2" icon={TrendingUp} />
        <StatCard label="Categorías cubiertas" valor={resumen?.categorias.length || 0} suffix="" color="#7C3AED" icon={LayoutGrid} />
        <StatCard label="Población total" valor={tarjeta('poblacion', 'Población total', 'total')} suffix="habitantes" color="#3B82F6" icon={Users} />
        <StatCard label="Establecimientos" valor={tarjeta('economia', 'Establecimientos registrados', 'establecimientos registrados')} suffix="" color="#10B981" icon={TrendingUp} />
      </div>

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="mb-4 text-lg font-bold text-secondary-900">Indicadores por categoría</h3>
          <div className="h-72">
            {dataPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPorCategoria} margin={{ top: 8, right: 16, left: 0, bottom: 64 }}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [`${value} indicadores`, 'Cantidad']} />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {dataPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-secondary-500">Sin datos para mostrar.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-lg font-bold text-secondary-900">Distribución por género</h3>
          <div className="h-72">
            {dataPoblacionGenero.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataPoblacionGenero}
                    dataKey="valor"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.nombre}: ${Number(entry.valor).toLocaleString()}`}
                  >
                    {dataPoblacionGenero.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} habitantes`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-secondary-500">Sin datos para mostrar.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-lg font-bold text-secondary-900">Escolaridad principal</h3>
          <div className="h-72">
            {dataEscolaridad.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataEscolaridad} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} personas`, '']} />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} fill="#F59E0B" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-secondary-500">Sin datos para mostrar.</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-4 text-lg font-bold text-secondary-900">Establecimientos por sector</h3>
          <div className="h-72">
            {dataEconomia.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataEconomia} layout="vertical" margin={{ top: 8, right: 16, left: 40, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} establecimientos`, '']} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-secondary-500">Sin datos para mostrar.</p>
            )}
          </div>
        </div>

        {dataPobreza.length > 0 && (
          <div className="card lg:col-span-2">
            <h3 className="mb-4 text-lg font-bold text-secondary-900">Carencias sociales (% de población)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPobreza} layout="vertical" margin={{ top: 8, right: 16, left: 48, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={160} />
                  <Tooltip formatter={(value: any) => [`${value}%`, '']} />
                  <Bar dataKey="valor" radius={[0, 4, 4, 0]} fill="#D73216" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Cruce de datos */}
      <div className="card space-y-4">
        <h3 className="text-lg font-bold text-secondary-900">Cruce de datos</h3>
        <p className="text-sm text-secondary-600">Selecciona dos indicadores numéricos para compararlos en la misma gráfica.</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-secondary-500">Indicador A</label>
            <select
              value={indicadorA?.id || ''}
              onChange={(e) => {
                const id = e.target.value;
                setIndicadorA(indicadoresNumericos.find((i) => i.id === id) || null);
              }}
              className="w-full rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {indicadoresNumericos.map((i) => (
                <option key={`a-${i.id}`} value={i.id}>
                  {i.indicador} {i.subcategoria ? `(${i.subcategoria})` : ''} — {i.unidad}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-secondary-500">Indicador B</label>
            <select
              value={indicadorB?.id || ''}
              onChange={(e) => {
                const id = e.target.value;
                setIndicadorB(indicadoresNumericos.find((i) => i.id === id) || null);
              }}
              className="w-full rounded-lg border border-secondary-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="">Seleccionar...</option>
              {indicadoresNumericos.map((i) => (
                <option key={`b-${i.id}`} value={i.id}>
                  {i.indicador} {i.subcategoria ? `(${i.subcategoria})` : ''} — {i.unidad}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCruzar}
            disabled={!indicadorA || !indicadorB || indicadorA.id === indicadorB.id || cruceLoading}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {cruceLoading ? 'Cruzando...' : 'Cruzar'}
          </button>
        </div>

        {cruceData?.labels?.length > 0 && (
          <div className="h-80 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={cruceData.labels.map((label: string, idx: number) => ({
                  label,
                  A: cruceData.datasetA.valores[idx],
                  B: cruceData.datasetB.valores[idx],
                }))}
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="A" name={cruceData.indicadorA} stroke="#D73216" strokeWidth={3} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="B" name={cruceData.indicadorB} stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Indicadores visuales */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-secondary-900">Indicadores municipales</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar indicador..."
                className="rounded-lg border border-secondary-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex rounded-lg border border-secondary-200 bg-white p-1">
              <button
                onClick={() => setVista('tarjetas')}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition ${vista === 'tarjetas' ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-50'}`}
              >
                <LayoutGrid className="h-4 w-4" /> Tarjetas
              </button>
              <button
                onClick={() => setVista('tabla')}
                className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition ${vista === 'tabla' ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-50'}`}
              >
                <Table2 className="h-4 w-4" /> Tabla
              </button>
            </div>
          </div>
        </div>

        {/* Chips de categoría */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoriaActiva('todas')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              categoriaActiva === 'todas'
                ? 'bg-secondary-900 text-white'
                : 'bg-white text-secondary-600 hover:bg-secondary-100 border border-secondary-200'
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => {
            const color = CATEGORIA_COLORS[c] || '#64748B';
            const active = categoriaActiva === c;
            return (
              <button
                key={c}
                onClick={() => setCategoriaActiva(c)}
                className="rounded-full px-4 py-1.5 text-sm font-medium transition border"
                style={
                  active
                    ? { backgroundColor: color, borderColor: color, color: '#fff' }
                    : { backgroundColor: '#fff', borderColor: `${color}40`, color }
                }
              >
                {CATEGORIA_LABELS[c] || c}
              </button>
            );
          })}
        </div>

        {vista === 'tarjetas' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {indicadoresFiltrados.map((i) => (
              <IndicadorCard key={i.id} indicador={i} todos={indicadores} />
            ))}
            {indicadoresFiltrados.length === 0 && (
              <div className="col-span-full rounded-lg border border-secondary-200 bg-white p-8 text-center text-sm text-secondary-500">
                No se encontraron indicadores.
              </div>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-secondary-200 bg-secondary-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Categoría</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Indicador</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Valor</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Periodo</th>
                    <th className="px-4 py-3 text-left font-medium text-secondary-600">Fuente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {indicadoresFiltrados.map((i) => (
                    <tr key={i.id}>
                      <td className="px-4 py-3 text-secondary-600">{CATEGORIA_LABELS[i.categoria] || i.categoria}</td>
                      <td className="px-4 py-3 font-medium text-secondary-900">
                        {i.indicador}
                        {i.subcategoria && <span className="ml-1 text-xs font-normal text-secondary-500">({i.subcategoria})</span>}
                      </td>
                      <td className="px-4 py-3 text-secondary-900">{formatearValor(i)}</td>
                      <td className="px-4 py-3 text-secondary-600">{i.periodo || '-'}</td>
                      <td className="px-4 py-3">
                        {i.fuente_url ? (
                          <a href={i.fuente_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                            {i.fuente}
                          </a>
                        ) : (
                          <span className="text-secondary-600">{i.fuente}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {indicadoresFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-sm text-secondary-500">
                        No hay indicadores en esta categoría.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-secondary-500">
        Fuente:{' '}
        <a
          href={configPais.fuenteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          {configPais.tituloTab}
        </a>
        . {configPais.fuenteCreditos}
      </p>
    </div>
  );
}

function IndicadorCard({ indicador, todos }: { indicador: Indicador; todos: Indicador[] }) {
  const Icon = CATEGORIA_ICONS[indicador.categoria] || TrendingUp;
  const color = CATEGORIA_COLORS[indicador.categoria] || '#64748B';
  const hermanos = todos.filter(
    (i) =>
      i.indicador === indicador.indicador &&
      i.categoria === indicador.categoria &&
      i.id !== indicador.id &&
      i.valor_numerico !== null
  );
  const tieneMiniGrafica = hermanos.length > 0;
  const max = tieneMiniGrafica ? Math.max(indicador.valor_numerico || 0, ...hermanos.map((h) => h.valor_numerico || 0)) : 0;

  return (
    <div className="card flex flex-col transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {CATEGORIA_LABELS[indicador.categoria] || indicador.categoria}
        </span>
      </div>

      <h4 className="mb-1 text-sm font-semibold text-secondary-900">
        {indicador.indicador}
        {indicador.subcategoria && (
          <span className="ml-1 text-xs font-normal text-secondary-500">({indicador.subcategoria})</span>
        )}
      </h4>

      <p className="mb-3 text-xs text-secondary-500 line-clamp-2">{indicador.descripcion || 'Sin descripción'}</p>

      <div className="mt-auto">
        <p className="text-2xl font-bold text-secondary-900">{formatearValor(indicador)}</p>

        {esPorcentaje(indicador) && (
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(Math.max((indicador.valor_numerico || 0), 0), 100)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        )}

        {tieneMiniGrafica && (
          <div className="mt-3 space-y-1.5">
            {[indicador, ...hermanos]
              .sort((a, b) => (b.valor_numerico || 0) - (a.valor_numerico || 0))
              .slice(0, 4)
              .map((h) => (
                <div key={h.id} className="flex items-center gap-2 text-xs">
                  <span className="w-20 truncate text-secondary-500">{h.subcategoria || 'Total'}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-secondary-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: max ? `${((h.valor_numerico || 0) / max) * 100}%` : '0%',
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-secondary-700">{formatearValor(h)}</span>
                </div>
              ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-secondary-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {indicador.periodo || 'Sin periodo'}
          </div>
          {indicador.fuente_url ? (
            <a
              href={indicador.fuente_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary-600 hover:underline"
            >
              {indicador.fuente} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span>{indicador.fuente}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  valor,
  suffix,
  color,
  icon: Icon,
}: {
  label: string;
  valor: number | null;
  suffix: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-800">{valor !== null ? Number(valor).toLocaleString() : '-'}</p>
          {suffix && <p className="mt-1 text-xs text-gray-500">{suffix}</p>}
        </div>
        <div className="rounded-lg p-3" style={{ backgroundColor: `${color}20`, color }}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
