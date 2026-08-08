'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { candidatoApi, boletinesApi } from '@/lib/api';
import GeneradorBoletines from '@/components/boletines/GeneradorBoletines';
import EditarBoletinModal from './EditarBoletinModal';
import { Search, Trash2, Edit3 } from 'lucide-react';

const POR_PAGINA = 6;

export default function BoletinesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [boletines, setBoletines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'boletines', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && puedeAcceder(user.permisos, 'boletines', user.rol)) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: perfilData }, { data: boletinesData }] = await Promise.all([
        candidatoApi.getPerfil(),
        boletinesApi.getAll(),
      ]);
      setPerfil(perfilData);
      setBoletines(Array.isArray(boletinesData) ? boletinesData : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar boletines');
    } finally {
      setLoading(false);
    }
  };

  const onGenerado = (boletin: any) => {
    setBoletines((prev) => [boletin, ...prev]);
    setPagina(1);
    setMessage('Borrador guardado en el historial');
    setTimeout(() => setMessage(''), 3000);
  };

  const cambiarEstatus = async (id: string, accion: 'aprobar' | 'rechazar') => {
    try {
      const { data } =
        accion === 'aprobar'
          ? await boletinesApi.aprobar(id)
          : await boletinesApi.rechazar(id);
      setBoletines((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...data } : b))
      );
      setMessage(accion === 'aprobar' ? 'Boletín aprobado' : 'Boletín rechazado');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar estatus');
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este boletín? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await boletinesApi.delete(id);
      setBoletines((prev) => prev.filter((b) => b.id !== id));
      setMessage('Boletín eliminado');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar boletín');
    }
  };

  const guardarEdicion = async (id: string, payload: any) => {
    try {
      const { data } = await boletinesApi.update(id, payload);
      setBoletines((prev) => prev.map((b) => (b.id === id ? data : b)));
      setMessage('Boletín actualizado');
      setTimeout(() => setMessage(''), 3000);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar boletín');
      return false;
    }
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

  const [modalBoletin, setModalBoletin] = useState<any | null>(null);
  const [modalRedes, setModalRedes] = useState<any | null>(null);
  const [modalEditar, setModalEditar] = useState<any | null>(null);

  const resumenPrompt = (prompt: string) => {
    try {
      const parsed = JSON.parse(prompt);
      return parsed.tema || prompt;
    } catch {
      return prompt;
    }
  };

  const esAprobable = (boletin: any) => !boletin.aprobado;
  const esRechazable = (boletin: any) => boletin.aprobado !== false || boletin.aprobado === true;

  const tituloBoletin = (b: any) => {
    if (b.titulo) return b.titulo;
    return resumenPrompt(b.prompt_usuario);
  };
  const bajadaBoletin = (b: any) => b.bajada || '';
  const desarrolloBoletin = (b: any) =>
    b.desarrollo || b.copy_generado || b.caption_redes || 'Sin contenido generado';
  const esRedes = (b: any) =>
    !!b.posts_redes || (Array.isArray(b.versiones_redes) && b.versiones_redes.length > 0);
  const tienePostsRedes = (b: any) => !!b.posts_redes;

  const nombreCandidato = perfil?.nombre_publico || perfil?.nombre || 'Candidato';

  const textoBusqueda = (b: any) => {
    return [
      tituloBoletin(b),
      bajadaBoletin(b),
      desarrolloBoletin(b),
      b.prompt_usuario,
      perfil?.territorio || '',
      perfil?.nombre || '',
      formatearFecha(b.created_at),
    ]
      .join(' ')
      .toLowerCase();
  };

  const boletinesOrdenados = useMemo(() => {
    return [...boletines].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [boletines]);

  const numerosPorId = useMemo(() => {
    const map = new Map<string, number>();
    [...boletinesOrdenados]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((b, i) => map.set(b.id, i + 1));
    return map;
  }, [boletinesOrdenados]);

  const boletinesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return boletinesOrdenados;
    return boletinesOrdenados.filter((b) => textoBusqueda(b).includes(termino));
  }, [boletinesOrdenados, busqueda]);

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(boletinesFiltrados.length / POR_PAGINA)),
    [boletinesFiltrados]
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda]);

  const boletinesPagina = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return boletinesFiltrados.slice(inicio, inicio + POR_PAGINA);
  }, [boletinesFiltrados, pagina]);

  const renderHeaderFeed = () => (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h3 className="text-lg font-bold text-secondary-800">Historial</h3>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por fecha, tema, palabra o lugar"
            className="input w-full pl-9 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={cargarDatos}
          disabled={loading}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-60"
        >
          {loading ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );

  const renderTarjeta = (b: any) => {
    const numero = numerosPorId.get(b.id) || 0;
    return (
      <div
        key={b.id}
        className="relative rounded-xl border border-secondary-200 bg-white p-4 shadow-sm"
      >
        {/* Número destacado */}
        <div className="absolute -left-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white shadow-md">
          {numero}
        </div>

        {/* Header estilo publicación */}
        <div className="mb-3 flex items-center gap-3 pl-4">
          <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-secondary-100">
            {perfil?.foto_url ? (
              <img
                src={perfil.foto_url}
                alt={nombreCandidato}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full rounded-full bg-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-secondary-900">{nombreCandidato}</p>
            <div className="flex items-center gap-2 text-xs text-secondary-500">
              <span>{formatearFecha(b.created_at)}</span>
              {b.creador?.nombre && (
                <>
                  <span>·</span>
                  <span>{b.creador.nombre}</span>
                </>
              )}
            </div>
          </div>
          {b.aprobado ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
              Aprobado
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              Borrador
            </span>
          )}
        </div>

        {/* Título */}
        <h4 className="mb-1.5 pl-4 text-base font-bold leading-snug text-secondary-900">
          {tituloBoletin(b)}
        </h4>

        {/* Bajada */}
        {bajadaBoletin(b) && (
          <p className="mb-3 pl-4 text-sm font-medium italic leading-snug text-secondary-700">
            {bajadaBoletin(b)}
          </p>
        )}

        {/* Preview comprimido */}
        {tienePostsRedes(b) ? (
          <p className="mb-3 pl-4 text-sm text-secondary-600">
            {b.titulo ? 'Boletín + 3 posts para redes sociales' : '3 posts para redes sociales'}
          </p>
        ) : esRedes(b) ? (
          <p className="mb-3 pl-4 text-sm text-secondary-600">
            {b.versiones_redes.length} versiones de post para redes
          </p>
        ) : (
          <p className="mb-3 line-clamp-4 pl-4 text-sm leading-relaxed text-secondary-700">
            {desarrolloBoletin(b)}
          </p>
        )}

        {/* Botones de acción */}
        <div className="flex flex-wrap items-center gap-2 border-t border-secondary-100 pl-4 pt-3">
          <button
            type="button"
            onClick={() => setModalBoletin(b)}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-50"
          >
            Ver boletín
          </button>
          {esRedes(b) && (
            <button
              type="button"
              onClick={() => setModalRedes(b)}
              className="rounded-md bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-100"
            >
              Texto de redes
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalEditar(b)}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-50"
          >
            <Edit3 size={12} className="mr-1 inline" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => eliminar(b.id)}
            className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
          >
            <Trash2 size={12} className="mr-1 inline" />
            Eliminar
          </button>
          {esAprobable(b) && (
            <button
              type="button"
              onClick={() => cambiarEstatus(b.id, 'aprobar')}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              Aprobar
            </button>
          )}
          {esRechazable(b) && (
            <button
              type="button"
              onClick={() => cambiarEstatus(b.id, 'rechazar')}
              className="rounded-md bg-secondary-200 px-3 py-1.5 text-xs font-medium text-secondary-700 hover:bg-secondary-300"
            >
              Rechazar
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPaginacion = () => {
    if (totalPaginas <= 1) return null;
    return (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPagina(p)}
            className={`min-w-[2.25rem] rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              p === pagina
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-secondary-700 ring-1 ring-secondary-200 hover:bg-secondary-50'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    );
  };

  const onEditarGuardado = useCallback((b: any) => {
    setBoletines((prev) => prev.map((x) => (x.id === b.id ? b : x)));
    setMessage('Boletín actualizado');
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const renderModalBoletin = () => {
    if (!modalBoletin) return null;
    const b = modalBoletin;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-secondary-800">{tituloBoletin(b)}</h3>
              <p className="mt-1 text-xs text-secondary-400">
                {formatearFecha(b.created_at)}
                {b.creador?.nombre && ` · ${b.creador.nombre}`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalBoletin(null)}
              className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {bajadaBoletin(b) && (
            <p className="mb-4 text-base font-medium italic leading-relaxed text-secondary-700">
              {bajadaBoletin(b)}
            </p>
          )}

          <div className="prose prose-sm max-w-none text-secondary-800">
            <p className="whitespace-pre-wrap leading-relaxed">{desarrolloBoletin(b)}</p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            {esAprobable(b) && (
              <button
                type="button"
                onClick={() => {
                  cambiarEstatus(b.id, 'aprobar');
                  setModalBoletin(null);
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Aprobar
              </button>
            )}
            {esRechazable(b) && (
              <button
                type="button"
                onClick={() => {
                  cambiarEstatus(b.id, 'rechazar');
                  setModalBoletin(null);
                }}
                className="rounded-md bg-secondary-200 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-300"
              >
                Rechazar
              </button>
            )}
            <button
              type="button"
              onClick={() => setModalBoletin(null)}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderModalRedes = () => {
    if (!modalRedes) return null;
    const b = modalRedes;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-secondary-800">Publicación sugerida</h3>
              <p className="mt-1 text-xs text-secondary-400">{formatearFecha(b.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={() => setModalRedes(null)}
              className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          {tienePostsRedes(b) ? (
            <div className="space-y-5">
              {[
                { key: 'facebook', label: 'Facebook', color: '#1877F2' },
                { key: 'instagram', label: 'Instagram', color: '#E1306C' },
                { key: 'tiktok', label: 'TikTok', color: '#000000' },
              ].map(({ key, label, color }) => {
                const v = b.posts_redes[key];
                if (!v?.caption) return null;
                return (
                  <div key={key} className="rounded-lg border border-secondary-100 bg-secondary-50 p-4">
                    <p className="mb-2 text-xs font-bold uppercase" style={{ color }}>
                      {label}
                    </p>
                    {v.caption && (
                      <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">
                        {v.caption}
                      </p>
                    )}
                    {v.hashtags?.length > 0 && (
                      <p className="mb-2 text-sm text-primary-700">{v.hashtags.join(' ')}</p>
                    )}
                    {v.idea_imagen && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold uppercase text-secondary-500">
                          Idea de imagen / video
                        </p>
                        <p className="text-sm text-secondary-700">{v.idea_imagen}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : esRedes(b) ? (
            <div className="space-y-5">
              {b.versiones_redes.map((v: any, i: number) => (
                <div key={i} className="rounded-lg border border-secondary-100 bg-secondary-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase text-primary-600">Versión {i + 1}</p>
                  {v.caption && (
                    <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">
                      {v.caption}
                    </p>
                  )}
                  {v.hashtags?.length > 0 && (
                    <p className="mb-2 text-sm text-primary-700">{v.hashtags.join(' ')}</p>
                  )}
                  {v.idea_imagen && (
                    <div className="pt-2">
                      <p className="text-xs font-semibold uppercase text-secondary-500">Idea de imagen</p>
                      <p className="text-sm text-secondary-700">{v.idea_imagen}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-secondary-500">No hay publicación sugerida para este boletín.</p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setModalRedes(null)}
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  };


  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-800">Boletines IA</h2>
        <p className="text-secondary-500">
          Genera boletines y captions con la voz del candidato, y gestiona su aprobación.
        </p>
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

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <GeneradorBoletines perfil={perfil} onGenerado={onGenerado} />
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-xl border border-secondary-200 bg-white p-5">
            {renderHeaderFeed()}

            {loading && boletines.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
              </div>
            ) : boletines.length === 0 ? (
              <div className="rounded-lg bg-secondary-50 p-6 text-center">
                <p className="text-sm text-secondary-500">Aún no hay boletines generados.</p>
                <p className="mt-1 text-xs text-secondary-400">Usa el generador para crear el primero.</p>
              </div>
            ) : boletinesFiltrados.length === 0 ? (
              <div className="rounded-lg bg-secondary-50 p-6 text-center">
                <p className="text-sm text-secondary-500">No se encontraron boletines con esa búsqueda.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {boletinesPagina.map((b) => renderTarjeta(b))}
                </div>
                {renderPaginacion()}
              </>
            )}
          </div>
        </div>
      </div>

      {renderModalBoletin()}
      {renderModalRedes()}
      {modalEditar && (
        <EditarBoletinModal
          boletin={modalEditar}
          onCerrar={() => setModalEditar(null)}
          onGuardar={onEditarGuardado}
        />
      )}
    </div>
  );
}
