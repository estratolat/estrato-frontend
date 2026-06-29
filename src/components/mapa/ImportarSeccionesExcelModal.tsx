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

export default function ImportarSeccionesExcelModal({ abierto, onCerrar, onExito }: Props) {
  const [estadoId, setEstadoId] = useState('25');
  const [estadoNombre, setEstadoNombre] = useState('Sinaloa');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setResultado(null);
      setArchivo(null);
      const e = ESTADOS_MEXICO.find((x) => x.id === estadoId);
      setEstadoNombre(e?.nombre || '');
    }
  }, [abierto, estadoId]);

  if (!abierto) return null;

  const handleFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setArchivo(files[0]);
    setResultado(null);
    setError(null);
  };

  const importar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) {
      setError('Selecciona un archivo Excel');
      return;
    }

    try {
      setImportando(true);
      setError(null);
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('estado_id', estadoId);
      formData.append('estado', estadoNombre);
      const { data } = await mapaApi.importarSeccionesExcel(formData);
      setResultado(data);
      onExito();
    } catch (err: any) {
      setError(errorToString(err) || 'Error al importar Excel');
    } finally {
      setImportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Importar datos de secciones (Excel)</h2>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600">
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={importar} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-secondary-500">Estado</label>
            <select
              value={estadoId}
              onChange={(e) => {
                setEstadoId(e.target.value);
                const e2 = ESTADOS_MEXICO.find((x) => x.id === e.target.value);
                setEstadoNombre(e2?.nombre || '');
                setResultado(null);
                setError(null);
              }}
              className="input w-full"
            >
              {ESTADOS_MEXICO.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-secondary-500">
              El Excel debe contener columnas: sección, municipio (o municipio_id), casillas, meta, observaciones, color, ganador_2024, votos_ganador_2024, votos_totales_2024, participacion_2024, y lo mismo para 2021 y 2018.
            </p>
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
              accept=".xlsx,.xls,.csv"
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
                <p className="text-sm font-medium text-secondary-700">Arrastra el Excel o haz clic</p>
                <p className="text-xs text-secondary-500">.xlsx, .xls o .csv. Máx 20 MB.</p>
              </div>
            )}
          </div>

          {resultado && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <p className="font-semibold">Importación completa</p>
              <p>{resultado.total_filas} filas leídas • {resultado.importadas} secciones importadas</p>
              <p>{resultado.actualizadas} actualizadas • {resultado.nuevas} nuevas • {resultado.historicos} resultados históricos</p>
              {resultado.omitidas > 0 && <p className="text-amber-700">{resultado.omitidas} filas omitidas por falta de municipio</p>}
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
              disabled={importando}
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 disabled:opacity-60"
              disabled={importando || !archivo}
            >
              {importando ? 'Importando...' : 'Importar Excel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
