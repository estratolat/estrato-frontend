'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { encuestasApi } from '@/lib/api';
import { Encuesta } from '@/types';
import {
  ClipboardList,
  Eye,
  Trash2,
  Play,
  Square,
  FileText,
  Share2,
  Upload,
  X,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Search,
  BarChart3,
  Users,
  CalendarClock,
  LayoutGrid,
  List,
  Plus,
  MoreVertical,
  QrCode,
} from 'lucide-react';

export default function EncuestasPage() {
  const router = useRouter();
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [vista, setVista] = useState<'tablero' | 'lista'>('tablero');
  const [modal, setModal] = useState<'compartir' | 'importar' | null>(null);
  const [selected, setSelected] = useState<Encuesta | null>(null);
  const [importResult, setImportResult] = useState<{ importados: number; omitidos: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadEncuestas();
  }, []);

  const loadEncuestas = async () => {
    try {
      setLoading(true);
      const { data } = await encuestasApi.getAll({ limit: 200 });
      setEncuestas(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar encuestas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta encuesta y todas sus respuestas?')) return;
    try {
      await encuestasApi.delete(id);
      loadEncuestas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'borrador' ? 'activa' : current === 'activa' ? 'cerrada' : 'borrador';
    try {
      await encuestasApi.updateStatus(id, next);
      loadEncuestas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar estatus');
    }
  };

  const openCompartir = (e: React.MouseEvent, encuesta: Encuesta) => {
    e.stopPropagation();
    setSelected(encuesta);
    setModal('compartir');
  };

  const openImportar = (e: React.MouseEvent, encuesta: Encuesta) => {
    e.stopPropagation();
    setSelected(encuesta);
    setImportResult(null);
    setModal('importar');
  };

  const handleFile = async (file: File | null) => {
    if (!file || !selected) return;
    const formData = new FormData();
    formData.append('archivo', file);
    try {
      const { data } = await encuestasApi.importarContactos(selected.id, formData);
      setImportResult(data);
      loadEncuestas();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al importar contactos');
    }
  };

  const filtered = encuestas.filter((e) => e.titulo.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Encuestas de Opinión</h2>
          <p className="text-secondary-600">Crea encuestas ciudadanas, compártelas y consulta resultados</p>
        </div>
        <Link href="/dashboard/encuestas/nueva" className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Nueva encuesta
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Barra de herramientas */}
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar encuesta..."
            className="w-full rounded-lg border border-secondary-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-secondary-200 bg-white p-1">
            <button
              onClick={() => setVista('tablero')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition ${
                vista === 'tablero' ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              <LayoutGrid className="h-4 w-4" /> Tablero
            </button>
            <button
              onClick={() => setVista('lista')}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition ${
                vista === 'lista' ? 'bg-primary-100 text-primary-700' : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
        </div>
      </div>

      {vista === 'tablero' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((encuesta) => (
            <EncuestaCard
              key={encuesta.id}
              encuesta={encuesta}
              onToggle={() => toggleStatus(encuesta.id, encuesta.status)}
              onDelete={() => handleDelete(encuesta.id)}
              onCompartir={(e) => openCompartir(e, encuesta)}
              onImportar={(e) => openImportar(e, encuesta)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full rounded-lg border border-secondary-200 bg-white p-8 text-center text-sm text-secondary-500">
              {search ? 'No se encontraron encuestas.' : 'No hay encuestas registradas.'}
            </div>
          )}
        </div>
      ) : (
        <ListaEncuestas
          encuestas={filtered}
          onToggle={toggleStatus}
          onDelete={handleDelete}
          onCompartir={openCompartir}
          onImportar={openImportar}
        />
      )}

      {modal === 'compartir' && selected && <ModalCompartir encuesta={selected} onClose={() => setModal(null)} />}

      {modal === 'importar' && selected && (
        <ModalImportar
          encuesta={selected}
          fileRef={fileRef}
          result={importResult}
          onFile={handleFile}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function EncuestaCard({
  encuesta,
  onToggle,
  onDelete,
  onCompartir,
  onImportar,
}: {
  encuesta: Encuesta;
  onToggle: () => void;
  onDelete: () => void;
  onCompartir: (e: React.MouseEvent) => void;
  onImportar: (e: React.MouseEvent) => void;
}) {
  const respuestas = (encuesta as any)._count?.respuestas || 0;
  const statusInfo = STATUS_CONFIG[encuesta.status] || STATUS_CONFIG.borrador;
  const Icon = statusInfo.icon;

  return (
    <div className="group card flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg">
      {/* Header con color de estatus */}
      <div className="relative mb-4 flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
          style={{ backgroundColor: statusInfo.lightColor, color: statusInfo.color }}
        >
          <ClipboardList className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-1">
          <span
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: statusInfo.lightColor, color: statusInfo.color }}
          >
            <Icon className="h-3 w-3" />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Título */}
      <h3 className="mb-2 text-lg font-bold text-secondary-900 line-clamp-2">{encuesta.titulo}</h3>

      {/* Métricas */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-secondary-100 bg-secondary-50 p-2.5">
          <div className="flex items-center gap-1.5 text-secondary-500">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Preguntas</span>
          </div>
          <p className="mt-1 text-lg font-bold text-secondary-900">{encuesta.preguntas?.length || 0}</p>
        </div>
        <div className="rounded-lg border border-secondary-100 bg-secondary-50 p-2.5">
          <div className="flex items-center gap-1.5 text-secondary-500">
            <Users className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Respuestas</span>
          </div>
          <p className="mt-1 text-lg font-bold text-secondary-900">{respuestas}</p>
        </div>
      </div>

      {/* Fecha */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-secondary-500">
        <CalendarClock className="h-3.5 w-3.5" />
        <span>Creada {new Date(encuesta.created_at).toLocaleDateString('es-MX')}</span>
      </div>

      {/* Acciones con iconos de colores */}
      <div className="mt-auto border-t border-secondary-100 pt-4">
        <div className="grid grid-cols-4 gap-1">
          <ActionButton
            icon={encuesta.status === 'activa' ? Square : Play}
            label={encuesta.status === 'activa' ? 'Pausar' : 'Activar'}
            onClick={onToggle}
            color={statusInfo.color}
          />
          <Link
            href={`/dashboard/encuestas/${encuesta.id}`}
            className="action-button"
            title="Ver / Editar"
          >
            <Eye className="h-4 w-4 text-blue-600" />
            <span className="text-[10px] font-medium text-secondary-600">Ver</span>
          </Link>
          <Link
            href={`/dashboard/encuestas/${encuesta.id}/respuestas`}
            className="action-button"
            title="Ver respuestas"
          >
            <FileText className="h-4 w-4 text-emerald-600" />
            <span className="text-[10px] font-medium text-secondary-600">Respuestas</span>
          </Link>
          <button
            onClick={onCompartir}
            className="action-button"
            title="Compartir"
          >
            <Share2 className="h-4 w-4 text-purple-600" />
            <span className="text-[10px] font-medium text-secondary-600">Compartir</span>
          </button>
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1">
          <button
            onClick={onImportar}
            className="action-button"
            title="Importar contactos"
          >
            <Upload className="h-4 w-4 text-cyan-600" />
            <span className="text-[10px] font-medium text-secondary-600">Importar</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="action-button"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            <span className="text-[10px] font-medium text-secondary-600">Eliminar</span>
          </button>
          <Link
            href={`/encuesta/${encuesta.tenant?.slug || ''}/${encuesta.id}`}
            target="_blank"
            className="action-button"
            title="Vista previa pública"
          >
            <QrCode className="h-4 w-4 text-orange-600" />
            <span className="text-[10px] font-medium text-secondary-600">Preview</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button onClick={onClick} className="action-button" title={label}>
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-[10px] font-medium text-secondary-600">{label}</span>
    </button>
  );
}

function ListaEncuestas({
  encuestas,
  onToggle,
  onDelete,
  onCompartir,
  onImportar,
}: {
  encuestas: Encuesta[];
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  onCompartir: (e: React.MouseEvent, encuesta: Encuesta) => void;
  onImportar: (e: React.MouseEvent, encuesta: Encuesta) => void;
}) {
  const statusLabels: Record<string, string> = {
    borrador: 'Borrador',
    activa: 'Activa',
    cerrada: 'Cerrada',
  };

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-secondary-200 bg-secondary-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-secondary-600">Título</th>
              <th className="px-4 py-3 text-left font-medium text-secondary-600">Estatus</th>
              <th className="px-4 py-3 text-left font-medium text-secondary-600">Preguntas</th>
              <th className="px-4 py-3 text-left font-medium text-secondary-600">Respuestas</th>
              <th className="px-4 py-3 text-left font-medium text-secondary-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {encuestas.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-secondary-500">
                  No hay encuestas registradas.
                </td>
              </tr>
            ) : (
              encuestas.map((e) => (
                <tr key={e.id} className="hover:bg-secondary-50">
                  <td className="px-4 py-3 font-medium text-secondary-900">{e.titulo}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[e.status].badgeClass}`}>
                      {statusLabels[e.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{e.preguntas?.length || 0}</td>
                  <td className="px-4 py-3 text-secondary-600">{(e as any)._count?.respuestas || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggle(e.id, e.status)}
                        title={e.status === 'activa' ? 'Pausar' : 'Activar'}
                        className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                      >
                        {e.status === 'activa' ? <Square size={16} /> : <Play size={16} />}
                      </button>
                      <Link
                        href={`/dashboard/encuestas/${e.id}`}
                        className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                        title="Ver / Editar"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/dashboard/encuestas/${e.id}/respuestas`}
                        className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                        title="Ver respuestas"
                      >
                        <FileText size={16} />
                      </Link>
                      <button
                        onClick={(ev) => onCompartir(ev, e)}
                        title="Compartir"
                        className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                      >
                        <Share2 size={16} />
                      </button>
                      <button
                        onClick={(ev) => onImportar(ev, e)}
                        title="Importar contactos"
                        className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-primary-600"
                      >
                        <Upload size={16} />
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onDelete(e.id);
                        }}
                        title="Eliminar"
                        className="rounded-md p-1.5 text-secondary-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; lightColor: string; badgeClass: string }> = {
  borrador: {
    label: 'Borrador',
    icon: ClipboardList,
    color: '#6B7280',
    lightColor: '#F3F4F6',
    badgeClass: 'bg-gray-100 text-gray-700',
  },
  activa: {
    label: 'Activa',
    icon: Play,
    color: '#16A34A',
    lightColor: '#DCFCE7',
    badgeClass: 'bg-green-100 text-green-700',
  },
  cerrada: {
    label: 'Cerrada',
    icon: Square,
    color: '#2563EB',
    lightColor: '#DBEAFE',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
};

function ModalCompartir({ encuesta, onClose }: { encuesta: Encuesta; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${baseUrl}/encuesta/${encuesta.tenant?.slug || ''}/${encuesta.id}`;
  const mensaje = `Hola, te invito a contestar la encuesta "${encuesta.titulo}": ${url}`;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    encuestasApi.compartir(encuesta.id, { canal: 'link' }).catch(() => {});
  };

  const shareWhatsApp = () => {
    const wa = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
    encuestasApi.compartir(encuesta.id, { canal: 'whatsapp' }).catch(() => {});
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Encuesta: ${encuesta.titulo}`);
    const body = encodeURIComponent(mensaje);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    encuestasApi.compartir(encuesta.id, { canal: 'email' }).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-secondary-900">Compartir encuesta</h3>
          <button onClick={onClose} className="rounded-md p-1 text-secondary-400 hover:bg-secondary-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-secondary-600">
          Link público de la encuesta <strong>{encuesta.titulo}</strong>
        </p>
        <div className="mb-4 flex gap-2">
          <input type="text" readOnly value={url} className="input flex-1 text-sm" />
          <button onClick={copy} className="btn-secondary flex items-center gap-2" title="Copiar link">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <MessageCircle size={18} /> WhatsApp
          </button>
          <button
            onClick={shareEmail}
            className="flex items-center justify-center gap-2 rounded-lg bg-secondary-100 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-200"
          >
            <Mail size={18} /> Correo
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalImportar({
  encuesta,
  fileRef,
  result,
  onFile,
  onClose,
}: {
  encuesta: Encuesta;
  fileRef: React.RefObject<HTMLInputElement>;
  result: { importados: number; omitidos: number; total: number } | null;
  onFile: (file: File | null) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-secondary-900">Importar contactos</h3>
          <button onClick={onClose} className="rounded-md p-1 text-secondary-400 hover:bg-secondary-100">
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-sm text-secondary-600">
          Sube un CSV con columnas <strong>email, nombre, telefono</strong>. Los contactos se asocian al proyecto{' '}
          <strong>{encuesta.tenant?.nombre_candidato || ''}</strong> y pueden reutilizarse en cualquier encuesta.
        </p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] || null)} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="btn-secondary flex w-full items-center justify-center gap-2">
          <Upload size={18} /> Seleccionar archivo CSV
        </button>
        {result && (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Importados: <strong>{result.importados}</strong> de {result.total} registros. Omitidos: {result.omitidos}.
          </div>
        )}
      </div>
    </div>
  );
}
