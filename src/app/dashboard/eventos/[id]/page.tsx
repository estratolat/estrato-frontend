'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { eventosApi, votantesApi, zonasApi, lideresApi } from '@/lib/api';
import { Evento, Votante, Zona, Lider } from '@/types';
import { Calendar, MapPin, Users, Search, Trash2, CheckCircle, FileText } from 'lucide-react';

export default function EventoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    direccion: '',
    fecha_inicio: '',
    fecha_fin: '',
    asistentes_estimados: '',
    status: 'programado',
    zona_id: '',
    tematica: '',
    lider_id: '',
    generar_ficha: false,
  });

  const [zonas, setZonas] = useState<Zona[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [searchVotante, setSearchVotante] = useState('');
  const [votantesResult, setVotantesResult] = useState<Votante[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadEvento();
    loadCatalogos();
  }, [router, id]);

  const loadEvento = async () => {
    try {
      setLoading(true);
      const { data } = await eventosApi.getOne(id);
      setEvento(data);
      setFormData({
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        direccion: data.direccion || '',
        fecha_inicio: data.fecha_inicio ? new Date(data.fecha_inicio).toISOString().slice(0, 16) : '',
        fecha_fin: data.fecha_fin ? new Date(data.fecha_fin).toISOString().slice(0, 16) : '',
        asistentes_estimados: data.asistentes_estimados ? String(data.asistentes_estimados) : '',
        status: data.status || 'programado',
        zona_id: data.zona_id || '',
        tematica: data.tematica || '',
        lider_id: data.lider_id || '',
        generar_ficha: data.generar_ficha || false,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar evento');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogos = async () => {
    try {
      const [{ data: zonasData }, { data: lideresData }] = await Promise.all([
        zonasApi.getAll(),
        lideresApi.getAll(),
      ]);
      setZonas(zonasData || []);
      setLideres(lideresData || []);
    } catch (err: any) {
      // No bloquear
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await eventosApi.update(id, {
        ...formData,
        asistentes_estimados: formData.asistentes_estimados ? parseInt(formData.asistentes_estimados, 10) : undefined,
      });
      setSuccess('Evento actualizado correctamente');
      loadEvento();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar evento');
    } finally {
      setSaving(false);
    }
  };

  const buscarVotante = async () => {
    if (!searchVotante.trim()) return;
    try {
      setSearching(true);
      const { data } = await votantesApi.getAll({ search: searchVotante, limit: 10 });
      setVotantesResult(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al buscar votantes');
    } finally {
      setSearching(false);
    }
  };

  const agregarAsistencia = async (votanteId: string) => {
    try {
      setError(null);
      await eventosApi.registrarAsistencia(id, { votante_id: votanteId, metodo_registro: 'manual' });
      setSearchVotante('');
      setVotantesResult([]);
      loadEvento();
      setSuccess('Asistencia registrada');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar asistencia');
    }
  };

  const eliminarAsistencia = async (votanteId: string) => {
    if (!confirm('¿Eliminar esta asistencia?')) return;
    try {
      setError(null);
      await eventosApi.eliminarAsistencia(id, votanteId);
      loadEvento();
      setSuccess('Asistencia eliminada');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar asistencia');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Evento no encontrado.</p>
        <Link href="/dashboard/eventos" className="text-primary-600 font-medium mt-2 inline-block">
          ← Regresar a eventos
        </Link>
      </div>
    );
  }

  const asistentes = evento.asistencias || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <Link href="/dashboard/eventos" className="text-sm text-primary-600 hover:underline">
            ← Regresar a eventos
          </Link>
          <h2 className="text-2xl font-bold text-gray-800 mt-1">{evento.nombre}</h2>
          <p className="text-gray-600">Detalle y registro de asistencia</p>
        </div>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusColors[evento.status] || statusColors.programado}`}>
          {evento.status.replace('_', ' ')}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Formulario edición */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card space-y-6">
            <h3 className="text-lg font-semibold text-gray-800">Información general</h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Nombre del evento *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  className="input min-h-[100px]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  value={formData.direccion}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Inicio *</label>
                <input
                  type="datetime-local"
                  name="fecha_inicio"
                  value={formData.fecha_inicio}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Fin</label>
                <input
                  type="datetime-local"
                  name="fecha_fin"
                  value={formData.fecha_fin}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Asistentes estimados</label>
                <input
                  type="number"
                  name="asistentes_estimados"
                  value={formData.asistentes_estimados}
                  onChange={handleChange}
                  className="input"
                  min={0}
                />
              </div>

              <div>
                <label className="label">Estado</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="programado">Programado</option>
                  <option value="en_curso">En curso</option>
                  <option value="finalizado">Finalizado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              {/* Campos para cruces informativos */}
              <div>
                <label className="label">Zona electoral</label>
                <select
                  name="zona_id"
                  value={formData.zona_id}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">— Seleccionar zona —</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nombre} {z.secciones?.length ? `(Secciones: ${z.secciones.join(', ')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Temática de la reunión</label>
                <input
                  type="text"
                  name="tematica"
                  value={formData.tematica}
                  onChange={handleChange}
                  className="input"
                  placeholder="Ej. Seguridad, Salud, Juventud"
                />
              </div>

              <div className="md:col-span-2">
                <label className="label">Líder principal / responsable</label>
                <select
                  name="lider_id"
                  value={formData.lider_id}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">— Seleccionar líder —</option>
                  {lideres.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.votante?.nombre || 'Sin nombre'} {l.alcance_estimado ? `(Alcance: ${l.alcance_estimado})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  id="generar_ficha"
                  type="checkbox"
                  name="generar_ficha"
                  checked={formData.generar_ficha}
                  onChange={handleChange}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="generar_ficha" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Generar ficha informativa para el candidato
                  <span className="block text-xs font-normal text-gray-500">
                    Se actualizará el resumen del evento para entregar al candidato.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <Link href="/dashboard/eventos" className="btn-secondary">Cancelar</Link>
            </div>
          </form>

          {evento.ficha_informativa && (
            <div className="card mt-6 bg-yellow-50 border-yellow-200">
              <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                <FileText size={18} /> Ficha informativa
              </h4>
              <pre className="text-sm text-yellow-800 whitespace-pre-wrap font-mono bg-yellow-100/50 p-3 rounded-lg">
                {evento.ficha_informativa}
              </pre>
            </div>
          )}
        </div>

        {/* Asistencias */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} /> Asistencias ({asistentes.length})
            </h3>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchVotante}
                onChange={(e) => setSearchVotante(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarVotante()}
                placeholder="Buscar votante..."
                className="input text-sm"
              />
              <button
                onClick={buscarVotante}
                disabled={searching || !searchVotante.trim()}
                className="btn-primary px-3 disabled:opacity-60"
              >
                <Search size={18} />
              </button>
            </div>

            {votantesResult.length > 0 && (
              <div className="border border-gray-200 rounded-lg mb-4 max-h-60 overflow-y-auto">
                {votantesResult.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => agregarAsistencia(v.id)}
                    className="w-full text-left px-3 py-2 hover:bg-primary-50 border-b border-gray-100 last:border-0 text-sm"
                  >
                    <div className="font-medium text-gray-900">{v.nombre || 'Sin nombre'}</div>
                    <div className="text-gray-500 text-xs">{v.telefono || '-'} • {v.colonia || '-'}</div>
                  </button>
                ))}
              </div>
            )}

            {asistentes.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay asistencias registradas.</p>
            ) : (
              <div className="space-y-2">
                {asistentes.map((a) => (
                  <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{a.votante?.nombre || 'Sin nombre'}</div>
                      <div className="text-xs text-gray-500">{a.votante?.telefono || '-'} • {new Date(a.created_at).toLocaleString('es-MX')}</div>
                    </div>
                    <button
                      onClick={() => eliminarAsistencia(a.votante_id)}
                      className="text-red-500 hover:text-red-700 p-2"
                      title="Eliminar asistencia"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card bg-gray-50">
            <h4 className="font-semibold text-gray-800 mb-2">Código QR del evento</h4>
            <p className="text-sm text-gray-600 mb-3">{evento.qr_code}</p>
            <div className="text-xs text-gray-500">
              En una fase posterior se generará el QR escaneable para registro automático.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const statusColors: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-green-100 text-green-700',
  finalizado: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
};
