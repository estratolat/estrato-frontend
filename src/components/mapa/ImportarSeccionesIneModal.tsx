'use client';

import { useState, useRef, useEffect } from 'react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
}

const ESTADOS_MEXICO = [
  { id: '01', nombre: 'Aguascalientes' },
  { id: '02', nombre: 'Baja California' },
  { id: '03', nombre: 'Baja California Sur' },
  { id: '04', nombre: 'Campeche' },
  { id: '05', nombre: 'Coahuila' },
  { id: '06', nombre: 'Colima' },
  { id: '07', nombre: 'Chiapas' },
  { id: '08', nombre: 'Chihuahua' },
  { id: '09', nombre: 'Ciudad de México' },
  { id: '10', nombre: 'Durango' },
  { id: '11', nombre: 'Guanajuato' },
  { id: '12', nombre: 'Guerrero' },
  { id: '13', nombre: 'Hidalgo' },
  { id: '14', nombre: 'Jalisco' },
  { id: '15', nombre: 'México' },
  { id: '16', nombre: 'Michoacán' },
  { id: '17', nombre: 'Morelos' },
  { id: '18', nombre: 'Nayarit' },
  { id: '19', nombre: 'Nuevo León' },
  { id: '20', nombre: 'Oaxaca' },
  { id: '21', nombre: 'Puebla' },
  { id: '22', nombre: 'Querétaro' },
  { id: '23', nombre: 'Quintana Roo' },
  { id: '24', nombre: 'San Luis Potosí' },
  { id: '25', nombre: 'Sinaloa' },
  { id: '26', nombre: 'Sonora' },
  { id: '27', nombre: 'Tabasco' },
  { id: '28', nombre: 'Tamaulipas' },
  { id: '29', nombre: 'Tlaxcala' },
  { id: '30', nombre: 'Veracruz' },
  { id: '31', nombre: 'Yucatán' },
  { id: '32', nombre: 'Zacatecas' },
];

const presetColors = ['#9CA3AF', '#D73216', '#22C55E', '#FACC15', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4'];

export default function ImportarSeccionesIneModal({ abierto, onCerrar, onExito }: Props) {
  const [estadoId, setEstadoId] = useState('11');
  const [municipioId, setMunicipioId] = useState('');
  const [municipioNombre, setMunicipioNombre] = useState('');
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#9CA3AF');
  const [anio, setAnio] = useState('2024');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setPreview(null);
      setArchivo(null);
    }
  }, [abierto]);

  if (!abierto) return null;

  const estadoSeleccionado = ESTADOS_MEXICO.find(e => e.id === estadoId);

  const generarNombre = () => {
    if (nombre.trim()) return nombre.trim();
    const base = `Secciones INE ${estadoSeleccionado?.nombre || ''}`;
    return municipioNombre.trim() ? `${base} — ${municipioNombre.trim()}` : base;
  };

  const handleFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setArchivo(files[0]);
    setPreview(null);
    setError(null);
    if (!nombre) {
      setNombre(files[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  const validarCampos = () => {
    if (!archivo) return 'Selecciona un archivo';
    if (!estadoId) return 'Selecciona un estado';
    if (!municipioId.trim()) return 'Escribe la clave del municipio';
    if (!municipioNombre.trim()) return 'Escribe el nombre del municipio';
    return null;
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('archivo', archivo!);
    formData.append('nombre', generarNombre());
    formData.append('color', color);
    formData.append('estado_id', estadoId);
    formData.append('estado', estadoSeleccionado?.nombre || '');
    formData.append('municipio_id', municipioId.replace(/\D/g, ''));
    formData.append('municipio', municipioNombre.trim());
    formData.append('anio', anio);
    return formData;
  };

  const previewData = async () => {
    const err = validarCampos();
    if (err) {
      setError(err);
      return;
    }

    try {
      setLoadingPreview(true);
      setError(null);
      const formData = buildFormData();
      const { data } = await mapaApi.importarSeccionesINE(formData);
      setPreview({ total: data.total_secciones, capaNombre: data.capa?.nombre });
    } catch (err: any) {
      setError(errorToString(err) || 'Error al procesar el archivo');
    } finally {
      setLoadingPreview(false);
    }
  };

  const importar = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validarCampos();
    if (err) {
      setError(err);
      return;
    }

    try {
      setImportando(true);
      setError(null);
      const formData = buildFormData();
      await mapaApi.importarSeccionesINE(formData);
      onExito();
      onCerrar();
      setEstadoId('11');
      setMunicipioId('');
      setMunicipioNombre('');
      setNombre('');
      setColor('#9CA3AF');
      setAnio('2024');
      setArchivo(null);
      setPreview(null);
    } catch (err: any) {
      setError(errorToString(err) || 'Error al importar secciones');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Importar secciones INE</h2>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600">
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={importar} className="space-y-4">
          <div>
            <label className="label">Estado</label>
            <select
              value={estadoId}
              onChange={(e) => {
                setEstadoId(e.target.value);
                setPreview(null);
                setError(null);
              }}
              className="input w-full"
            >
              {ESTADOS_MEXICO.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Clave municipio</label>
              <input
                type="text"
                value={municipioId}
                onChange={(e) => {
                  setMunicipioId(e.target.value.replace(/\D/g, '').slice(0, 3));
                  setPreview(null);
                  setError(null);
                }}
                placeholder="Ej. 020"
                className="input w-full"
                maxLength={3}
              />
            </div>
            <div>
              <label className="label">Nombre municipio</label>
              <input
                type="text"
                value={municipioNombre}
                onChange={(e) => {
                  setMunicipioNombre(e.target.value);
                  setPreview(null);
                  setError(null);
                }}
                placeholder="Ej. León"
                className="input w-full"
              />
            </div>
          </div>

          <div>
            <label className="label">Año de la cartografía</label>
            <input
              type="text"
              value={anio}
              onChange={(e) => setAnio(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="2024"
              className="input w-full"
              maxLength={4}
            />
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files); }}
            className="cursor-pointer rounded-lg border-2 border-dashed border-secondary-300 bg-secondary-50 p-5 text-center transition-colors hover:border-primary-400 hover:bg-primary-50"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".kml,.geojson,.json,.zip,.gpx"
              onChange={(e) => handleFile(e.target.files)}
            />
            <Icon name="apoyos" size={28} className="mx-auto mb-2 text-secondary-400" />
            {archivo ? (
              <div>
                <p className="font-medium text-secondary-900">{archivo.name}</p>
                <p className="text-xs text-secondary-500">{Math.round(archivo.size / 1024)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-secondary-700">Arrastra el archivo del INE o haz clic</p>
                <p className="text-xs text-secondary-500">Shapefile (.zip), GeoJSON, KML. Máx 50 MB.</p>
              </div>
            )}
          </div>

          <div>
            <label className="label">Nombre de la capa</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setError(null); }}
              placeholder={generarNombre()}
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Color de la capa</label>
            <div className="flex flex-wrap items-center gap-2">
              {presetColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setColor(c); setError(null); }}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${color === c ? 'border-secondary-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-secondary-300"
              />
            </div>
          </div>

          {preview && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <p className="font-semibold">Vista previa lista</p>
              <p>{preview.total} secciones encontradas</p>
              <p className="text-green-700">Capa: {preview.capaNombre}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
              disabled={importando || loadingPreview}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={previewData}
              disabled={loadingPreview || !archivo}
              className="btn-secondary flex-1 disabled:opacity-60"
            >
              {loadingPreview ? 'Procesando...' : 'Vista previa'}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-60"
              disabled={importando || !preview}
            >
              {importando ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
