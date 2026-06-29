'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';
import { CapaMapa, GeoJSONCollection } from '@/types/mapa';
import { Search, X, Save, RefreshCcw, MapPin, Check, ChevronDown, List } from 'lucide-react';

interface Props {
  capa: CapaMapa;
  geojson?: GeoJSONCollection;
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
  onResaltarFeature?: (capaId: string, featureId: string) => void;
}

const PRESET_COLORS = [
  '#EAB308', '#22C55E', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4',
  '#F97316', '#EC4899', '#14B8A6', '#6366F1', '#84CC16', '#64748B',
  '#000000', '#FFFFFF',
];

interface FeatureItem {
  id: string;
  nombreOriginal: string;
  props: Record<string, any>;
  index: number;
}

export default function EditarEstilosCapaModal({
  capa,
  geojson,
  abierto,
  onCerrar,
  onExito,
  onResaltarFeature,
}: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [estilos, setEstilos] = useState<Record<string, { color?: string; nombre?: string }>>({});
  const [loading, setLoading] = useState(false);
  const [cargandoFeatures, setCargandoFeatures] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);
  const [geojsonLocal, setGeojsonLocal] = useState<GeoJSONCollection | undefined>(geojson);
  const [dropdownValue, setDropdownValue] = useState('');

  const cargarGeojson = useCallback(async () => {
    if (geojsonLocal?.features?.length) return;
    try {
      setCargandoFeatures(true);
      setError(null);
      const res = await mapaApi.getGeoJson([capa.id], { limit: 5000 });
      const data = res.data as Record<string, GeoJSONCollection>;
      if (data[capa.id]?.features?.length) {
        setGeojsonLocal(data[capa.id]);
      } else {
        setError('La capa está vacía o no está activa en el mapa. Actívala con el switch e intenta de nuevo.');
      }
    } catch (err: any) {
      console.error('Error cargando geojson de capa:', err);
      setError(errorToString(err) || 'No se pudo cargar la geometría de la capa.');
    } finally {
      setCargandoFeatures(false);
    }
  }, [capa.id, geojsonLocal?.features?.length]);

  useEffect(() => {
    if (abierto) {
      setEstilos(capa.estilos || {});
      setBusqueda('');
      setDropdownValue('');
      setError(null);
      setGuardadoOk(false);
      setGeojsonLocal(geojson);
      cargarGeojson();
    }
  }, [abierto, capa.estilos, capa.id, geojson, cargarGeojson]);

  const features: FeatureItem[] = useMemo(() => {
    if (!geojsonLocal?.features?.length) return [];
    const candidatos = [
      'nombre', 'NOMBRE', 'name', 'NAME', 'nomgeo', 'NOMGEO',
      'nom_loc', 'NOM_LOC', 'nom_mun', 'NOM_MUN',
      'seccion', 'SECCION', 'municipio', 'MUNICIPIO', 'colonia', 'COLONIA',
      'localidad', 'LOCALIDAD',
    ];
    return geojsonLocal.features.map((f: any, idx: number) => {
      const p = f.properties || {};
      const id = String(
        p._feature_id ?? p.id ?? p.ID ?? p.OBJECTID ?? p.objectid ?? p.FID ?? p.fid ?? p.gid ?? p.GID ?? `feature-${idx}`,
      );
      const keyNombre = candidatos.find((k) => p[k] != null && String(p[k]).trim() !== '');
      const nombreOriginal = String(
        p._feature_nombre || (keyNombre ? p[keyNombre] : `Elemento ${idx + 1}`),
      ).trim();
      return { id, nombreOriginal, props: p, index: idx };
    });
  }, [geojsonLocal]);

  const normalizar = (valor: string): string =>
    valor
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const filtrar = useCallback(
    (lista: FeatureItem[]) => {
      const raw = busqueda.trim();
      if (!raw) return lista;
      const q = normalizar(raw);
      if (/^\d+$/.test(q)) {
        // Búsqueda numérica: coincidir palabra completa al inicio del nombre o en el id
        return lista.filter(
          (f) =>
            normalizar(f.id).startsWith(q) ||
            normalizar(f.nombreOriginal).split(' ').some((w) => w.startsWith(q)),
        );
      }
      return lista.filter(
        (f) =>
          normalizar(f.nombreOriginal).includes(q) || normalizar(f.id).includes(q),
      );
    },
    [busqueda],
  );

  const filtered = useMemo(() => filtrar(features), [features, filtrar]);
  const sortedFeatures = useMemo(
    () => [...features].sort((a, b) => a.nombreOriginal.localeCompare(b.nombreOriginal, 'es', { numeric: true })),
    [features],
  );

  const actualizarFeature = (id: string, cambios: { color?: string; nombre?: string }) => {
    setGuardadoOk(false);
    setEstilos((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...cambios,
      },
    }));
  };

  const colorDeFeature = (id: string): string => {
    const personalizado = estilos[id]?.color;
    if (personalizado) return personalizado;
    return capa.color || '#3B82F6';
  };

  const tieneCambios = (id: string): boolean => {
    const e = estilos[id];
    if (!e) return false;
    return !!e.color || !!e.nombre;
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setGuardadoOk(false);

      const payload: Record<string, { color?: string; nombre?: string }> = {};
      Object.entries(estilos).forEach(([k, v]) => {
        const entry: { color?: string; nombre?: string } = {};
        if (v?.color?.trim()) entry.color = v.color.trim();
        if (v?.nombre?.trim()) entry.nombre = v.nombre.trim();
        if (entry.color || entry.nombre) payload[k] = entry;
      });

      await mapaApi.updateEstilosCapa(capa.id, payload);
      // Optimistic update: reflejar cambios localmente antes de recargar
      const capaActualizada = { ...capa, estilos: payload };
      if (geojsonLocal) {
        const nextGeo = { ...geojsonLocal };
        nextGeo.features = nextGeo.features.map((f: any) => {
          const p = f.properties || {};
          const fid = String(
            p._feature_id ?? p.id ?? p.ID ?? p.OBJECTID ?? p.objectid ?? p.FID ?? p.fid ?? p.gid ?? p.GID,
          );
          const cambio = payload[fid];
          if (!cambio) return f;
          return {
            ...f,
            properties: {
              ...p,
              _feature_color: cambio.color || p._feature_color,
              _feature_nombre: cambio.nombre || p._feature_nombre,
              color: cambio.color || p.color,
            },
          };
        });
        setGeojsonLocal(nextGeo);
      }
      setGuardadoOk(true);
      onExito();
      setTimeout(() => onCerrar(), 600);
    } catch (err: any) {
      setError(errorToString(err) || 'Error al guardar estilos');
    } finally {
      setLoading(false);
    }
  };

  const resetear = () => {
    if (confirm('¿Borrar todos los colores y nombres personalizados de esta capa?')) {
      setGuardadoOk(false);
      setEstilos({});
    }
  };

  const verEnMapa = (capaId: string, featureId: string) => {
    if (onResaltarFeature) {
      onResaltarFeature(capaId, featureId);
      onCerrar();
    }
  };

  const seleccionarDeDropdown = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setDropdownValue(id);
    if (!id) return;
    const f = features.find((x) => x.id === id);
    if (!f) return;
    setBusqueda(f.nombreOriginal);
    if (onResaltarFeature) {
      onResaltarFeature(capa.id, f.id);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white p-0 shadow-xl">
        <div className="flex items-center justify-between border-b border-secondary-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-secondary-900">
              <Search size={20} className="text-primary-600" />
              {capa.nombre}
            </h2>
            <p className="text-xs text-secondary-500">
              {cargandoFeatures
                ? 'Cargando elementos...'
                : `${features.length.toLocaleString()} elementos • Busca, selecciona o ubica en el mapa.`}
            </p>
          </div>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600">
            <X size={22} />
          </button>
        </div>

        <form onSubmit={guardar} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-secondary-100 bg-secondary-50/50 p-4">
            <div className="flex flex-col gap-3">
              {/* Selector de feature */}
              <div className="relative">
                <List size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                <select
                  value={dropdownValue}
                  onChange={seleccionarDeDropdown}
                  className="w-full appearance-none rounded-lg border border-secondary-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  disabled={cargandoFeatures || features.length === 0}
                >
                  <option value="">
                    {cargandoFeatures
                      ? 'Cargando lista de elementos...'
                      : features.length === 0
                      ? 'Sin elementos disponibles'
                      : `Selecciona uno de ${features.length.toLocaleString()} elementos...`}
                  </option>
                  {sortedFeatures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombreOriginal}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                  <input
                    type="text"
                    placeholder={`Buscar entre ${features.length} elementos... Ej. Culiacán, Mazatlán, Ahome, Guasave`}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="input w-full pl-9 text-sm"
                    autoFocus
                  />
                </div>
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="flex h-10 items-center justify-center rounded-lg border border-secondary-200 bg-white px-3 text-xs font-medium text-secondary-600 transition hover:bg-secondary-100"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetear}
                  title="Borrar todos los colores/nombres personalizados"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-secondary-200 bg-white text-secondary-500 transition hover:bg-secondary-100"
                >
                  <RefreshCcw size={16} />
                </button>
              </div>
            </div>

            {busqueda && (
              <p className="mt-2 text-xs text-secondary-500">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para “{busqueda}”
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            {guardadoOk && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <Check size={16} /> Cambios guardados.
              </div>
            )}

            {cargandoFeatures ? (
              <div className="flex h-40 flex-col items-center justify-center text-secondary-500">
                <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <p className="text-sm">Cargando elementos de la capa...</p>
              </div>
            ) : features.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-secondary-500">
                <MapPin size={32} className="mb-2 text-secondary-300" />
                <p className="text-sm">No hay elementos visibles en esta capa.</p>
                <p className="text-xs">Activa la capa en el mapa y recarga para ver sus elementos.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center text-secondary-500">
                <Search size={32} className="mb-2 text-secondary-300" />
                <p className="text-sm">No se encontró “{busqueda}”.</p>
                <p className="text-xs">Prueba con parte del nombre, sin acentos o con números.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((f) => {
                  const colorActual = colorDeFeature(f.id);
                  const nombreEditado = estilos[f.id]?.nombre ?? '';
                  const modificado = tieneCambios(f.id);
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                        modificado ? 'border-primary-200 bg-primary-50/40' : 'border-secondary-100 bg-white'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <input
                          type="color"
                          value={colorActual}
                          onChange={(e) => actualizarFeature(f.id, { color: e.target.value })}
                          className="h-10 w-14 shrink-0 cursor-pointer rounded border border-secondary-200"
                          title="Color del polígono"
                        />
                        <div className="flex flex-wrap gap-1">
                          {PRESET_COLORS.slice(0, 6).map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => actualizarFeature(f.id, { color: c })}
                              className="h-4 w-4 rounded-full border border-secondary-200"
                              style={{ backgroundColor: c }}
                              title={c}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-sm font-semibold text-secondary-900"
                          title={f.nombreOriginal}
                        >
                          {f.nombreOriginal}
                          {modificado && (
                            <span className="ml-2 rounded-full bg-primary-100 px-1.5 py-0.5 text-[9px] font-bold text-primary-700">
                              CAMBIO
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-secondary-400">
                          Color base: {capa.color} · ID: {String(f.id).slice(0, 30)}
                        </p>
                      </div>

                      <input
                        type="text"
                        value={nombreEditado}
                        onChange={(e) => actualizarFeature(f.id, { nombre: e.target.value })}
                        placeholder="Renombrar..."
                        className="input w-36 text-sm"
                        title="Nombre personalizado (opcional)"
                      />

                      {onResaltarFeature && (
                        <button
                          type="button"
                          onClick={() => verEnMapa(capa.id, f.id)}
                          title="Ver y ubicar en el mapa"
                          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-secondary-200 bg-white px-3 text-xs font-medium text-secondary-600 transition hover:bg-primary-50 hover:text-primary-600"
                        >
                          <MapPin size={16} />
                          <span className="hidden sm:inline">Ubicar</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-secondary-100 px-5 py-4">
            <p className="text-xs text-secondary-500">
              {Object.keys(estilos).filter((k) => estilos[k]?.color || estilos[k]?.nombre).length} cambios pendientes
            </p>
            <div className="flex items-center gap-3">
              <button type="button" onClick={onCerrar} disabled={loading} className="btn-secondary">
                Cerrar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                <Save size={16} />
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
