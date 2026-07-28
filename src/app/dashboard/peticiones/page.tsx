'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { peticionesApi, usersApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { Icon } from '@/components/ui/Icon';
import PeticionForm from '@/components/peticiones/PeticionForm';
import { Peticion, EstatusPeticion } from '@/types/peticiones';

const ESTATUS_LABELS: Record<EstatusPeticion, string> = {
  propuesta: 'Propuesta',
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  resuelta: 'Resuelta',
  cancelada: 'Cancelada',
  rechazada: 'Rechazada',
};

const ESTATUS_COLORS: Record<EstatusPeticion, string> = {
  propuesta: 'bg-purple-100 text-purple-700',
  pendiente: 'bg-secondary-100 text-secondary-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  resuelta: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-700',
  rechazada: 'bg-gray-100 text-gray-700',
};

const PRIORIDAD_COLORS: Record<string, string> = {
  baja: 'bg-secondary-100 text-secondary-700',
  media: 'bg-blue-50 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  critica: 'bg-red-100 text-red-700',
};

export default function PeticionesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Peticion | null>(null);

  // Filtros
  const [filtroEstatus, setFiltroEstatus] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroResponsable, setFiltroResponsable] = useState<string>('');
  const [filtroTexto, setFiltroTexto] = useState('');
  const [soloMias, setSoloMias] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'peticiones', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [petRes, usersRes] = await Promise.all([
        peticionesApi.getAll({ limit: 500 }),
        usersApi.getAll(),
      ]);
      setPeticiones(petRes.data || []);
      setUsuarios(usersRes.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar gestiones');
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async (data: any) => {
    try {
      setLoading(true);
      await peticionesApi.create(data);
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear gestión');
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = async (data: any) => {
    if (!editando) return;
    try {
      setLoading(true);
      await peticionesApi.update(editando.id, data);
      setEditando(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar gestión');
    } finally {
      setLoading(false);
    }
  };

  const handleEstatus = async (p: Peticion, nuevoEstatus: EstatusPeticion) => {
    try {
      await peticionesApi.updateEstatus(p.id, nuevoEstatus);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const filtered = useMemo(() => {
    return peticiones.filter((p) => {
      if (filtroEstatus && p.estatus !== filtroEstatus) return false;
      if (filtroPrioridad && p.prioridad !== filtroPrioridad) return false;
      if (filtroTipo && p.tipo !== filtroTipo) return false;
      if (filtroResponsable && p.responsable_id !== filtroResponsable) return false;
      if (soloMias && p.responsable_id !== user?.id) return false;
      if (filtroTexto) {
        const term = filtroTexto.toLowerCase();
        const text = `${p.titulo || ''} ${p.descripcion || ''} ${p.folio || ''} ${p.creador?.nombre || ''} ${p.responsable?.nombre || ''}`.toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    });
  }, [peticiones, filtroEstatus, filtroPrioridad, filtroTipo, filtroResponsable, soloMias, filtroTexto, user]);

  const stats = useMemo(() => {
    const total = peticiones.length;
    const propuestas = peticiones.filter((p) => p.estatus === 'propuesta').length;
    const pendientes = peticiones.filter((p) => ['pendiente', 'en_proceso'].includes(p.estatus)).length;
    const resueltas = peticiones.filter((p) => p.estatus === 'resuelta').length;
    const vencidas = peticiones.filter(
      (p) =>
        p.fecha_compromiso &&
        new Date(p.fecha_compromiso) < new Date() &&
        !['resuelta', 'cancelada', 'rechazada'].includes(p.estatus)
    ).length;
    return { total, propuestas, pendientes, resueltas, vencidas };
  }, [peticiones]);

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Operaciones</h2>
          <p className="text-secondary-500">Asigna, da seguimiento y cierra gestiones y tareas de campaña.</p>
        </div>
        <button
          onClick={() => { setEditando(null); setModalOpen(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Icon name="apoyos" size={18} />
          Nueva gestión
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total', value: stats.total, color: 'bg-secondary-100 text-secondary-700' },
          { label: 'Propuestas', value: stats.propuestas, color: 'bg-purple-100 text-purple-700' },
          { label: 'Activas', value: stats.pendientes, color: 'bg-blue-100 text-blue-700' },
          { label: 'Resueltas', value: stats.resueltas, color: 'bg-green-100 text-green-700' },
          { label: 'Vencidas', value: stats.vencidas, color: 'bg-red-100 text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 ${s.color}`}>
            <p className="text-xs font-medium opacity-80">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[140px] flex-1">
            <label className="label text-xs">Buscar</label>
            <input
              type="text"
              className="input"
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              placeholder="Folio, título, descripción..."
            />
          </div>
          <div className="min-w-[120px]">
            <label className="label text-xs">Estatus</label>
            <select className="input" value={filtroEstatus} onChange={(e) => setFiltroEstatus(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="label text-xs">Prioridad</label>
            <select className="input" value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
              <option value="">Todas</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="label text-xs">Responsable</label>
            <select className="input" value={filtroResponsable} onChange={(e) => setFiltroResponsable(e.target.value)}>
              <option value="">Todos</option>
              <option value="_sin_">Sin asignar</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre || u.email}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="solo_mias"
              checked={soloMias}
              onChange={(e) => setSoloMias(e.target.checked)}
            />
            <label htmlFor="solo_mias" className="text-sm text-secondary-700">Solo mías</label>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl border border-secondary-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary-50 text-secondary-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Folio / Título</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Estatus</th>
                <th className="px-4 py-3 font-semibold">Prioridad</th>
                <th className="px-4 py-3 font-semibold">Responsable</th>
                <th className="px-4 py-3 font-semibold">Compromiso</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">
                    No hay gestiones que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const vencida = p.fecha_compromiso && new Date(p.fecha_compromiso) < new Date() && !['resuelta', 'cancelada', 'rechazada'].includes(p.estatus);
                  return (
                    <tr key={p.id} className="hover:bg-secondary-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-secondary-900">{p.folio || p.id.slice(0, 8)}</p>
                        <p className="max-w-xs truncate text-xs text-secondary-500">{p.titulo || p.descripcion.slice(0, 60)}</p>
                      </td>
                      <td className="px-4 py-3 capitalize">{p.tipo.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ESTATUS_COLORS[p.estatus]}`}>
                          {ESTATUS_LABELS[p.estatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDAD_COLORS[p.prioridad]}`}>
                          {p.prioridad}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.responsable?.nombre || <span className="text-secondary-400">Sin asignar</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.fecha_compromiso ? (
                          <span className={vencida ? 'font-medium text-red-600' : 'text-secondary-600'}>
                            {new Date(p.fecha_compromiso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {vencida && ' ⚠️'}
                          </span>
                        ) : (
                          <span className="text-secondary-400">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setEditando(p); setModalOpen(true); }}
                            className="rounded-md p-1.5 text-secondary-500 hover:bg-secondary-100 hover:text-secondary-700"
                            title="Editar"
                          >
                            <Icon name="seguridad" size={16} />
                          </button>
                          {p.estatus !== 'resuelta' && (
                            <button
                              onClick={() => handleEstatus(p, 'resuelta')}
                              className="rounded-md p-1.5 text-green-600 hover:bg-green-50"
                              title="Marcar resuelta"
                            >
                              <Icon name="ver" size={16} />
                            </button>
                          )}
                          {p.estatus !== 'cancelada' && (
                            <button
                              onClick={() => handleEstatus(p, 'cancelada')}
                              className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                              title="Cancelar"
                            >
                              <Icon name="ocultar" size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="relative z-[10000] w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-secondary-900">
                {editando ? 'Editar gestión' : 'Nueva gestión'}
              </h2>
              <button onClick={() => { setModalOpen(false); setEditando(null); }} className="text-secondary-400 hover:text-secondary-600">
                <Icon name="salir" size={20} />
              </button>
            </div>
            <PeticionForm
              initial={editando}
              onSubmit={editando ? handleEditar : handleCrear}
              onCancel={() => { setModalOpen(false); setEditando(null); }}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
