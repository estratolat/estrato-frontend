'use client';

import { useEffect, useState } from 'react';
import { Upload, FileSpreadsheet, FileText, X, CheckCircle, AlertCircle, Loader2, Table } from 'lucide-react';
import { votantesApi } from '@/lib/api';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'csv' | 'csv-file' | 'excel';

type ParserModule = {
  parseCSV: (content: string) => Promise<any[]>;
  parseExcel: (file: File) => Promise<any[]>;
};

const COLUMNAS_ESPERADAS = [
  { key: 'nombre', labels: ['nombre', 'nombre_completo', 'name', 'nombres', 'contacto'] },
  { key: 'telefono', labels: ['telefono', 'teléfono', 'telefono_movil', 'celular', 'whatsapp', 'movil', 'móvil', 'phone'] },
  { key: 'seccion_electoral', labels: ['seccion_electoral', 'seccion', 'sección', 'sección_electoral', 'secc'] },
  { key: 'colonia', labels: ['colonia', 'col', 'neighborhood'] },
  { key: 'municipio', labels: ['municipio', 'mun', 'ciudad', 'city'] },
  { key: 'estado', labels: ['estado', 'entidad_federativa', 'state'] },
  { key: 'nivel_apoyo', labels: ['nivel_apoyo', 'nivel', 'apoyo', 'support'] },
  { key: 'tags', labels: ['tags', 'tag', 'etiquetas', 'etiqueta'] },
  { key: 'origen_qr', labels: ['origen_qr', 'origen', 'fuente', 'source'] },
  { key: 'latitud', labels: ['latitud', 'lat'] },
  { key: 'longitud', labels: ['longitud', 'lng', 'lon'] },
];

const detectarColumnas = (headers: string[]): Record<string, string> => {
  const mapping: Record<string, string> = {};
  const usados = new Set<string>();
  const headersLower = headers.map((h) => String(h).toLowerCase().trim().replace(/[\s\.]+/g, '_'));

  for (const col of COLUMNAS_ESPERADAS) {
    for (const label of col.labels) {
      const idx = headersLower.findIndex((h) => h === label || h.includes(label));
      if (idx !== -1 && !usados.has(headers[idx])) {
        mapping[col.key] = headers[idx];
        usados.add(headers[idx]);
        break;
      }
    }
  }

  return mapping;
};

let parserCache: ParserModule | null = null;
const loadParsers = async (): Promise<ParserModule> => {
  if (parserCache) return parserCache;

  const [{ default: Papa }, XLSX] = await Promise.all([
    import('papaparse'),
    import('xlsx'),
  ]);

  parserCache = {
    parseCSV: (content: string) =>
      new Promise<any[]>((resolve, reject) => {
        Papa.parse(content, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h: string) => h.trim(),
          complete: (res: any) => resolve(res.data || []),
          error: (err: any) => reject(err),
        });
      }),
    parseExcel: async (file: File) => {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    },
  };

  return parserCache;
};

export default function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<Tab>('csv');
  const [csvText, setCsvText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ insertados: number; duplicados: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const reset = () => {
    setCsvText('');
    setFile(null);
    setPreview(null);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setError(null);
    setTab('csv');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildPreviewRows = async (source: 'text' | 'file') => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const parsers = await loadParsers();
      let raw: any[] = [];

      if (source === 'text') {
        if (!csvText.trim()) {
          setError('Pega primero el contenido CSV.');
          return;
        }
        raw = await parsers.parseCSV(csvText);
      } else if (file) {
        if (file.name.toLowerCase().endsWith('.csv')) {
          const text = await file.text();
          raw = await parsers.parseCSV(text);
        } else {
          raw = await parsers.parseExcel(file);
        }
      }

      if (!raw.length) {
        setError('No se encontraron filas válidas en el archivo.');
        return;
      }

      const detectedHeaders = Object.keys(raw[0]).filter((k) => k.trim());
      const detectedMapping = detectarColumnas(detectedHeaders);
      setHeaders(detectedHeaders);
      setMapping(detectedMapping);
      setPreview(raw.slice(0, 10));
    } catch (err: any) {
      setError(err.message || 'Error al leer el archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setError(null);
      setResult(null);

      const parsers = await loadParsers();
      let allRows: any[] = [];

      if (tab === 'csv') {
        allRows = await parsers.parseCSV(csvText);
      } else if (file) {
        if (file.name.toLowerCase().endsWith('.csv')) {
          allRows = await parsers.parseCSV(await file.text());
        } else {
          allRows = await parsers.parseExcel(file);
        }
      }

      const votantes = allRows
        .map((row) => {
          const mapped: any = {};
          for (const [key, sourceCol] of Object.entries(mapping)) {
            if (sourceCol && row[sourceCol] !== undefined) {
              mapped[key] = row[sourceCol];
            }
          }
          for (const header of headers) {
            if (!(header in mapped) && row[header] !== undefined) {
              mapped[header] = row[header];
            }
          }
          return mapped;
        })
        .filter((row) => row.nombre || row.telefono);

      if (votantes.length === 0) {
        setError('No hay registros válidos para importar. Al menos nombre o teléfono es requerido.');
        return;
      }

      const { data } = await votantesApi.importar(votantes);
      setResult({
        insertados: data.insertados || 0,
        duplicados: data.duplicados || 0,
        total: data.totalRecibidos || votantes.length,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al importar.');
    } finally {
      setImporting(false);
    }
  };

  const tabButton = (key: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={key}
      onClick={() => {
        setTab(key);
        setPreview(null);
        setResult(null);
        setError(null);
      }}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        tab === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const previewColumns = headers.length ? headers : (preview && preview[0] ? Object.keys(preview[0]) : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Importar base de datos de votantes</h3>
            <p className="text-sm text-gray-500">
              Soporta CSV pegado, CSV por archivo y Excel (.xlsx / .xls).
            </p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {tabButton('csv', 'Pegar CSV', <FileText size={18} />)}
            {tabButton('csv-file', 'Subir CSV', <Upload size={18} />)}
            {tabButton('excel', 'Subir Excel', <FileSpreadsheet size={18} />)}
          </div>

          {/* Input area */}
          {!preview && !result && (
            <div className="space-y-4">
              {tab === 'csv' && (
                <div>
                  <label className="label">Pega aquí el contenido CSV (con encabezados)</label>
                  <textarea
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={`nombre,telefono,colonia,seccion_electoral\nJuan Pérez,+521234567890,Centro,0001\nMaría López,+529876543210,Valle,0002`}
                    className="input min-h-[200px] font-mono text-sm"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    La primera fila debe contener los nombres de columna. Separa los valores con comas.
                  </p>
                </div>
              )}

              {(tab === 'csv-file' || tab === 'excel') && (
                <div className="card border-dashed border-2 border-gray-300 bg-gray-50">
                  <label className="flex flex-col items-center justify-center cursor-pointer py-10">
                    <div className="bg-primary-100 text-primary-600 p-3 rounded-full mb-3">
                      {tab === 'excel' ? <FileSpreadsheet size={28} /> : <Upload size={28} />}
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {file ? file.name : `Arrastra o haz clic para seleccionar ${tab === 'excel' ? 'un Excel' : 'un CSV'}`}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {tab === 'excel' ? '.xlsx, .xls' : '.csv'} • Máximo 2,000 filas
                    </span>
                    <input
                      type="file"
                      accept={tab === 'excel' ? '.xlsx,.xls' : '.csv'}
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={loading}
                    />
                  </label>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => buildPreviewRows(tab === 'csv' ? 'text' : 'file')}
                  disabled={loading || (tab === 'csv' ? !csvText.trim() : !file)}
                  className="btn-primary disabled:opacity-60 flex items-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Table size={18} />}
                  {loading ? 'Analizando...' : 'Vista previa y mapeo'}
                </button>
                {(csvText || file) && (
                  <button onClick={reset} className="btn-secondary">
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-4 rounded-lg mb-6">
              <div className="flex items-center gap-2 font-bold mb-1">
                <CheckCircle size={20} />
                Importación completada
              </div>
              <p className="text-sm">
                {result.insertados} insertados • {result.duplicados} duplicados omitidos • {result.total} recibidos.
              </p>
              <div className="mt-4 flex gap-3">
                <button onClick={handleClose} className="btn-primary">
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    reset();
                    setTab('csv');
                  }}
                  className="btn-secondary"
                >
                  Importar otro archivo
                </button>
              </div>
            </div>
          )}

          {/* Preview + Mapping */}
          {preview && !result && (
            <div className="space-y-6">
              <div className="card bg-blue-50 border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Table size={18} />
                  Mapeo de columnas
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {COLUMNAS_ESPERADAS.map((col) => (
                    <div key={col.key}>
                      <label className="label text-blue-800 capitalize">
                        {col.key.replace(/_/g, ' ')}
                      </label>
                      <select
                        value={mapping[col.key] || ''}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [col.key]: e.target.value,
                          }))
                        }
                        className="input bg-white"
                      >
                        <option value="">— No asignar —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-blue-700 mt-4">
                  El sistema detectó automáticamente las columnas. Revisa y corrige si es necesario.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-3">
                  Vista previa ({preview.length} de {tab === 'csv' ? 'todas las filas pegadas' : 'todas las filas del archivo'})
                </h4>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {previewColumns.map((h) => (
                          <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {previewColumns.map((h) => (
                            <td key={h} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 sticky bottom-0 bg-white py-2">
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="btn-primary disabled:opacity-60 flex items-center gap-2"
                >
                  {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {importing ? 'Importando...' : 'Importar votantes'}
                </button>
                <button onClick={reset} className="btn-secondary" disabled={importing}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Help template */}
          {!preview && !result && (
            <div className="mt-8 p-4 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800">Formato esperado:</p>
              <p>Las columnas pueden llamarse: nombre, telefono, seccion_electoral, colonia, municipio, estado, nivel_apoyo, tags, origen_qr, latitud, longitud.</p>
              <p>
                <code>nivel_apoyo</code> debe ser un número del 1 al 5. <code>telefono</code> se normaliza automáticamente a formato internacional.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
