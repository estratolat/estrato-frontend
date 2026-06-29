'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { llamadasApi, votantesApi } from '@/lib/api';

export default function LlamadasPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [campanas, setCampanas] = useState<any[]>([]);
  const [votantes, setVotantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<{ tipo: 'crear' | 'editar' | null; campana?: any }>({ tipo: null });
  const [detalle, setDetalle] = useState<any>(null);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [importando, setImportando] = useState(false);

  const formInicial = {
    nombre: '',
    descripcion: '',
    script: '',
    assistant_id: '',
    phone_number_id: '',
    voz_id_elevenlabs: '',
    status: 'borrador',
  };
  const [form, setForm] = useState(formInicial);

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'llamadas', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && puedeAcceder(user.permisos, 'llamadas', user.rol)) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: campanasData }, { data: votantesData }] = await Promise.all([
        llamadasApi.getCampanas(),
        votantesApi.getAll({ limit: 1000 }),
      ]);
      setCampanas(Array.isArray(campanasData) ? campanasData : []);
      setVotantes(Array.isArray(votantesData) ? votantesData : votantesData?.items || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar campañas');
    } finally {
      setLoading(false);
    }
  };

  const abrirCrear = () => {
    setForm(formInicial);
    setModal({ tipo: 'crear' });
  };

  const abrirEditar = (c: any) => {
    setForm({
      nombre: c.nombre || '',
      descripcion: c.descripcion || '',
      script: c.script || '',
      assistant_id: c.assistant_id || '',
      phone_number_id: c.phone_number_id || '',
      voz_id_elevenlabs: c.voz_id_elevenlabs || '',
      status: c.status || 'borrador',
    });
    setModal({ tipo: 'editar', campana: c });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (modal.tipo === 'crear') {
        await llamadasApi.createCampana(form);
        setMessage('Campaña creada');
      } else if (modal.tipo === 'editar' && modal.campana) {
        await llamadasApi.updateCampana(modal.campana.id, form);
        setMessage('Campaña actualizada');
      }
      setModal({ tipo: null });
      await cargarDatos();
      if (detalle) {
        const { data } = await llamadasApi.getCampana(detalle.id);
        setDetalle(data);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar campaña');
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta campaña?')) return;
    try {
      await llamadasApi.deleteCampana(id);
      setMessage('Campaña eliminada');
      if (detalle?.id === id) setDetalle(null);
      await cargarDatos();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const verDetalle = async (c: any) => {
    try {
      setLoading(true);
      const { data } = await llamadasApi.getCampana(c.id);
      setDetalle(data);
      setSeleccionados(new Set());
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar detalle');
    } finally {
      setLoading(false);
    }
  };

  const toggleVotante = (id: string) => {
    const next = new Set(seleccionados);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSeleccionados(next);
  };

  const importarSeleccionados = async () => {
    if (!detalle || seleccionados.size === 0) return;
    setImportando(true);
    try {
      await llamadasApi.importarVotantes(detalle.id, Array.from(seleccionados));
      setMessage(`${seleccionados.size} votantes importados`);
      await verDetalle(detalle);
      setSeleccionados(new Set());
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al importar votantes');
    } finally {
      setImportando(false);
    }
  };

  const importarTodos = async () => {
    if (!detalle) return;
    const ids = votantes
      .filter((v) => v.telefono || v.telefono_hash)
      .map((v) => v.id);
    if (!ids.length) {
      setError('No hay votantes con teléfono');
      return;
    }
    setImportando(true);
    try {
      await llamadasApi.importarVotantes(detalle.id, ids);
      setMessage(`${ids.length} votantes importados`);
      await verDetalle(detalle);
      setSeleccionados(new Set());
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al importar votantes');
    } finally {
      setImportando(false);
    }
  };

  const iniciarLlamada = async (votanteId: string) => {
    if (!detalle) return;
    try {
      setLoading(true);
      await llamadasApi.iniciarLlamada(detalle.id, votanteId);
      setMessage('Llamada iniciada');
      await verDetalle(detalle);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar llamada');
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status: string) => {
    const map: Record<string, string> = {
      pendiente: 'bg-slate-100 text-slate-600',
      en_curso: 'bg-blue-100 text-blue-700',
      contestada: 'bg-green-100 text-green-700',
      completada: 'bg-green-100 text-green-700',
      no_contesta: 'bg-amber-100 text-amber-700',
      buzon: 'bg-purple-100 text-purple-700',
      fallida: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  const formatearFecha = (fecha: string) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Llamadas Automáticas</h2>
          <p className="text-secondary-500">
            Crea campañas de llamadas, importa votantes y lanza llamadas automáticas.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Nueva campaña
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-secondary-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-secondary-800">Campañas</h3>
              <button
                type="button"
                onClick={cargarDatos}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Actualizar
              </button>
            </div>
            {loading && campanas.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
              </div>
            ) : campanas.length === 0 ? (
              <div className="rounded-lg bg-secondary-50 p-4 text-center">
                <p className="text-sm text-secondary-500">No hay campañas.</p>
                <p className="text-xs text-secondary-400">Crea la primera para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campanas.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => verDetalle(c)}
                    className={`cursor-pointer rounded-lg border p-3 transition hover:bg-secondary-50 ${
                      detalle?.id === c.id ? 'border-primary-300 bg-primary-50' : 'border-secondary-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-secondary-800">{c.nombre}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.status === 'activa'
                            ? 'bg-green-100 text-green-700'
                            : c.status === 'borrador'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-secondary-500">
                      {c._count?.llamadas ?? c.llamadas?.length ?? 0} llamadas
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {detalle ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-secondary-200 bg-white p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-secondary-800">{detalle.nombre}</h3>
                    <p className="text-sm text-secondary-500">{detalle.descripcion || 'Sin descripción'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => abrirEditar(detalle)}
                      className="rounded-md bg-secondary-100 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-200"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminar(detalle.id)}
                      className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="mb-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-secondary-50 p-3">
                    <p className="text-xs text-secondary-500">ID del Asistente</p>
                    <p className="font-medium text-secondary-800 break-all">{detalle.assistant_id || 'No configurado'}</p>
                  </div>
                  <div className="rounded-lg bg-secondary-50 p-3">
                    <p className="text-xs text-secondary-500">ID del Número Saliente</p>
                    <p className="font-medium text-secondary-800 break-all">{detalle.phone_number_id || 'No configurado'}</p>
                  </div>
                </div>

                <div className="mb-4 rounded-lg bg-secondary-50 p-3">
                  <p className="text-xs text-secondary-500">Script / Prompt del asistente</p>
                  <p className="whitespace-pre-wrap text-sm text-secondary-700">{detalle.script || 'Sin script'}</p>
                </div>

                <h4 className="mb-2 font-bold text-secondary-800">Importar votantes</h4>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm text-secondary-600">
                    {seleccionados.size} seleccionados / {votantes.length} votantes con teléfono
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={importarSeleccionados}
                      disabled={importando || seleccionados.size === 0}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                    >
                      {importando ? 'Importando...' : 'Importar seleccionados'}
                    </button>
                    <button
                      type="button"
                      onClick={importarTodos}
                      disabled={importando}
                      className="rounded-md bg-secondary-200 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-300 disabled:opacity-60"
                    >
                      Importar todos
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-secondary-100">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary-50 text-left text-xs font-semibold text-secondary-500">
                      <tr>
                        <th className="px-3 py-2">Sel.</th>
                        <th className="px-3 py-2">Votante</th>
                        <th className="px-3 py-2">Teléfono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                      {votantes.map((v) => (
                        <tr key={v.id} className="hover:bg-secondary-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={seleccionados.has(v.id)}
                              onChange={() => toggleVotante(v.id)}
                            />
                          </td>
                          <td className="px-3 py-2 text-secondary-800">{v.nombre || 'Sin nombre'}</td>
                          <td className="px-3 py-2 text-secondary-600">{v.telefono || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-secondary-200 bg-white p-5">
                <h4 className="mb-3 font-bold text-secondary-800">
                  Llamadas ({detalle.llamadas?.length || 0})
                </h4>
                {detalle.llamadas?.length === 0 ? (
                  <p className="text-sm text-secondary-500">Aún no hay llamadas. Importa votantes y presiona el botón de llamar.</p>
                ) : (
                  <div className="space-y-2">
                    {detalle.llamadas.map((ll: any) => (
                      <div
                        key={ll.id}
                        className="flex items-center justify-between rounded-lg border border-secondary-100 bg-secondary-50 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-secondary-800">
                            {ll.votante?.nombre || 'Votante'} — {ll.telefono}
                          </p>
                          <p className="text-xs text-secondary-500">
                            {formatearFecha(ll.created_at)} · {ll.duracion_seg ? `${ll.duracion_seg}s` : 'Sin duración'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(ll.status)}`}>
                            {ll.status}
                          </span>
                          {ll.status === 'pendiente' && (
                            <button
                              type="button"
                              onClick={() => iniciarLlamada(ll.votante_id)}
                              className="rounded-md bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                            >
                              Llamar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-secondary-300 bg-white p-8 text-center">
              <p className="text-lg font-medium text-secondary-700">Selecciona una campaña</p>
              <p className="text-sm text-secondary-500">O crea una nueva para empezar a llamar.</p>
            </div>
          )}
        </div>
      </div>

      {modal.tipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-bold text-secondary-800">
              {modal.tipo === 'crear' ? 'Nueva campaña de llamadas' : 'Editar campaña'}
            </h3>
            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                />
              </div>
              <div>
                <label className="label">ID del Asistente</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.assistant_id}
                  onChange={(e) => setForm({ ...form, assistant_id: e.target.value })}
                  placeholder="Ej. asst_123456..."
                />
              </div>
              <div>
                <label className="label">ID del Número Saliente</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.phone_number_id}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                  placeholder="Ej. pn_123456..."
                />
              </div>
              <div>
                <label className="label">Voice ID ElevenLabs</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.voz_id_elevenlabs}
                  onChange={(e) => setForm({ ...form, voz_id_elevenlabs: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Script / Prompt</label>
                <textarea
                  rows={4}
                  className="input w-full"
                  value={form.script}
                  onChange={(e) => setForm({ ...form, script: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Estatus</label>
                <select
                  className="input w-full"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="borrador">Borrador</option>
                  <option value="activa">Activa</option>
                  <option value="pausada">Pausada</option>
                  <option value="finalizada">Finalizada</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModal({ tipo: null })}
                  className="rounded-md bg-secondary-100 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
