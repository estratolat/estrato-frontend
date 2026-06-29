'use client';

import { useState, useRef, useEffect } from 'react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (capaIds?: string[]) => void;
  secciones: string[];
  capaTerritorioDefault?: string;
}

const EXTENSIONES_VALIDAS = ['.kml', '.geojson', '.json', '.zip', '.gpx'];
const TIPOS_VISIBLES = [
  { id: 'kml', nombre: 'KML (Google Earth / Maps)', icono: 'mapa' as const },
  { id: 'geojson', nombre: 'GeoJSON', icono: 'seguridad' as const },
  { id: 'shapefile', nombre: 'Shapefile (.zip)', icono: 'apoyos' as const },
  { id: 'gpx', nombre: 'GPX', icono: 'eventos' as const },
];

const CAPAS_PREDEFINIDAS = [
  { id: 'custom', nombre: 'Capa personalizada', icono: 'seguridad' as const },
  { id: 'votantes', nombre: 'Calor de simpatizantes', icono: 'votantes' as const },
  { id: 'recorridos', nombre: 'Calles recorridas', icono: 'mapa' as const },
  { id: 'apoyos', nombre: 'Apoyos entregados', icono: 'apoyos' as const },
  { id: 'eventos', nombre: 'Eventos / Mítines', icono: 'eventos' as const },
  { id: 'lideres', nombre: 'Líderes territoriales', icono: 'lideres' as const },
];

interface ArchivoPreparado {
  file: File;
  nombre: string;
  tipo: string;
}

export default function SubirCapaModal({ abierto, onCerrar, onExito, secciones, capaTerritorioDefault }: Props) {
  const [archivos, setArchivos] = useState<ArchivoPreparado[]>([]);
  const [color, setColor] = useState('#D73216');
  const [seccion, setSeccion] = useState('');
  const [seccionOtra, setSeccionOtra] = useState('');
  const [capaTerritorio, setCapaTerritorio] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progreso, setProgreso] = useState({ actual: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setProgreso({ actual: 0, total: 0 });
      if (capaTerritorioDefault) {
        setCapaTerritorio(capaTerritorioDefault);
      }
    }
  }, [abierto, capaTerritorioDefault]);

  if (!abierto) return null;

  const detectarTipo = (nombre: string): string => {
    const ext = nombre.split('.').pop()?.toLowerCase();
    if (ext === 'kml') return 'kml';
    if (ext === 'geojson' || ext === 'json') return 'geojson';
    if (ext === 'zip') return 'shapefile';
    if (ext === 'gpx') return 'gpx';
    return 'kml';
  };

  const nombreBase = (nombre: string) => nombre.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();

  const esValido = (file: File) => {
    const nombre = file.name.toLowerCase();
    return EXTENSIONES_VALIDAS.some(ext => nombre.endsWith(ext));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nuevos: ArchivoPreparado[] = [];
    Array.from(files).forEach((file) => {
      if (!esValido(file)) return;
      const yaExiste = archivos.some((a) => a.file.name === file.name && a.file.size === file.size);
      if (yaExiste) return;
      nuevos.push({
        file,
        nombre: nombreBase(file.name),
        tipo: detectarTipo(file.name),
      });
    });
    if (nuevos.length === 0) {
      setError('No se encontraron archivos válidos. Usa KML, GeoJSON, Shapefile (.zip) o GPX.');
      return;
    }
    setArchivos((prev) => [...prev, ...nuevos]);
    setError(null);
  };

  const quitarArchivo = (index: number) => {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarNombre = (index: number, nombre: string) => {
    setArchivos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], nombre };
      return next;
    });
  };

  const seccionFinal = seccion === 'otra' ? seccionOtra.trim() : seccion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (archivos.length === 0) {
      setError('Selecciona al menos un archivo');
      return;
    }

    const nombresVacios = archivos.some((a) => !a.nombre.trim());
    if (nombresVacios) {
      setError('Todas las capas necesitan un nombre');
      return;
    }

    setLoading(true);
    setError(null);
    setProgreso({ actual: 0, total: archivos.length });

    const creados: string[] = [];
    const fallos: string[] = [];

    for (let i = 0; i < archivos.length; i++) {
      const item = archivos[i];
      try {
        const formData = new FormData();
        formData.append('archivo', item.file);
        formData.append('nombre', item.nombre.trim() || nombreBase(item.file.name));
        formData.append('tipo_archivo', item.tipo);
        formData.append('color', color);
        formData.append('visible', 'true');
        if (seccionFinal) {
          formData.append('seccion_electoral', seccionFinal);
        }
        const metadata: Record<string, any> = {
          capa_territorio: capaTerritorio,
          grupo: 'Capas subidas',
        };
        if (seccionFinal) {
          metadata.seccion_electoral = seccionFinal;
        }
        formData.append('metadata', JSON.stringify(metadata));

        const res = await mapaApi.subirCapa(formData);
        const capaId = res.data?.capa?.id;
        if (capaId) creados.push(capaId);
      } catch (err: any) {
        console.error('[SubirCapaModal] error en', item.file.name, err);
        fallos.push(`${item.file.name}: ${errorToString(err) || 'Error de red'}`);
      } finally {
        setProgreso((prev) => ({ ...prev, actual: prev.actual + 1 }));
      }
    }

    setLoading(false);

    if (creados.length === 0) {
      setError(fallos.length > 0 ? `No se pudo subir ningún archivo.\n${fallos.slice(0, 5).join('\n')}` : 'No se pudo subir ningún archivo');
      return;
    }

    onExito(creados);
    onCerrar();
    setArchivos([]);
    setSeccion('');
    setSeccionOtra('');
    setCapaTerritorio('custom');
    setProgreso({ actual: 0, total: 0 });

    if (fallos.length > 0) {
      // Mostramos un warning breve en consola; el modal ya se cerró para no bloquear al usuario
      console.warn('[SubirCapaModal] Algunos archivos fallaron:', fallos);
    }
  };

  const presetColors = ['#D73216', '#22C55E', '#FACC15', '#EF4444', '#383745', '#3B82F6', '#8B5CF6', '#06B6D4'];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Subir capa GIS</h2>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600" disabled={loading}>
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
            className="cursor-pointer rounded-lg border-2 border-dashed border-secondary-300 bg-secondary-50 p-6 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".kml,.geojson,.json,.zip,.gpx"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Icon name="apoyos" size={32} className="mx-auto mb-2 text-secondary-400" />
            <div>
              <p className="text-sm font-medium text-secondary-700">Arrastra tus archivos aquí o haz clic</p>
              <p className="text-xs text-secondary-500">KML, GeoJSON, Shapefile (.zip), GPX. Máx 20 MB por archivo. Puedes seleccionar varios.</p>
            </div>
          </div>

          {/* Lista de archivos seleccionados */}
          {archivos.length > 0 && (
            <div className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary-500">
                {archivos.length} archivo{archivos.length > 1 ? 's' : ''} listo{archivos.length > 1 ? 's' : ''}
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {archivos.map((item, idx) => (
                  <div key={`${item.file.name}-${idx}`} className="flex items-center gap-2 rounded-md bg-white p-2 shadow-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-600">
                      <Icon name={TIPOS_VISIBLES.find((t) => t.id === item.tipo)?.icono || 'mapa'} size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => actualizarNombre(idx, e.target.value)}
                        className="w-full rounded border border-secondary-200 px-2 py-1 text-xs outline-none focus:border-primary-400"
                        placeholder="Nombre de la capa"
                      />
                      <p className="mt-0.5 text-[10px] text-secondary-500">
                        {item.file.name} • {Math.round(item.file.size / 1024)} KB • {item.tipo.toUpperCase()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarArchivo(idx)}
                      disabled={loading}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-secondary-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Quitar archivo"
                    >
                      <Icon name="salir" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Agrupar en capa del territorio</label>
              <select
                value={capaTerritorio}
                onChange={(e) => setCapaTerritorio(e.target.value)}
                className="input"
                disabled={loading}
              >
                {CAPAS_PREDEFINIDAS.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-secondary-500">Las capas nuevas se agruparán bajo este tipo.</p>
            </div>

            <div>
              <label className="label">Sección electoral (opcional)</label>
              <select
                value={seccion}
                onChange={(e) => setSeccion(e.target.value)}
                className="input"
                disabled={loading}
              >
                <option value="">Sin sección (capa general)</option>
                {secciones.map((s) => (
                  <option key={s} value={s}>Sección {s}</option>
                ))}
                <option value="otra">Otra sección...</option>
              </select>
              {seccion === 'otra' && (
                <input
                  type="text"
                  value={seccionOtra}
                  onChange={(e) => setSeccionOtra(e.target.value)}
                  placeholder="Ej. 0123"
                  className="input mt-2"
                  maxLength={4}
                  disabled={loading}
                />
              )}
            </div>
          </div>

          <div>
            <label className="label">Color de las capas</label>
            <div className="flex flex-wrap items-center gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  disabled={loading}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${color === c ? 'border-secondary-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={loading}
                className="h-8 w-12 cursor-pointer rounded border border-secondary-300"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">{error}</div>
          )}

          {loading && progreso.total > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-secondary-600">
                <span>Subiendo archivo {progreso.actual} de {progreso.total}</span>
                <span>{Math.round((progreso.actual / progreso.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-200">
                <div
                  className="h-full bg-primary-600 transition-all"
                  style={{ width: `${(progreso.actual / progreso.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || archivos.length === 0}
            >
              {loading ? 'Subiendo...' : archivos.length > 1 ? `Subir ${archivos.length} capas` : 'Subir y pintar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
