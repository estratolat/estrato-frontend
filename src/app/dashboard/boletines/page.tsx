'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { candidatoApi, boletinesApi } from '@/lib/api';
import GeneradorBoletines from '@/components/boletines/GeneradorBoletines';

export default function BoletinesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [boletines, setBoletines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
        prev.map((b) => (b.id === id ? data : b))
      );
      setMessage(accion === 'aprobar' ? 'Boletín aprobado' : 'Boletín rechazado');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar estatus');
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

  const [abierto, setAbierto] = useState<any | null>(null);

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
    if (b.versiones_redes?.length > 0) return resumenPrompt(b.prompt_usuario);
    return resumenPrompt(b.prompt_usuario);
  };
  const bajadaBoletin = (b: any) => b.bajada || '';
  const desarrolloBoletin = (b: any) =>
    b.desarrollo || b.copy_generado || b.caption_redes || 'Sin contenido generado';
  const esRedes = (b: any) =>
    Array.isArray(b.versiones_redes) && b.versiones_redes.length > 0;

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
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary-800">Historial</h3>
              <button
                type="button"
                onClick={cargarDatos}
                disabled={loading}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-60"
              >
                {loading ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>

            {loading && boletines.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
              </div>
            ) : boletines.length === 0 ? (
              <div className="rounded-lg bg-secondary-50 p-6 text-center">
                <p className="text-sm text-secondary-500">Aún no hay boletines generados.</p>
                <p className="mt-1 text-xs text-secondary-400">
                  Usa el generador para crear el primero.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {boletines.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-secondary-100 bg-secondary-50 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-secondary-800">
                        {tituloBoletin(b)}
                      </span>
                      {b.aprobado ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Aprobado
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Borrador
                        </span>
                      )}
                    </div>

                    {bajadaBoletin(b) && (
                      <p className="mb-3 text-sm font-medium italic text-secondary-700">
                        {bajadaBoletin(b)}
                      </p>
                    )}

                    {esRedes(b) ? (
                      <p className="mb-3 text-sm text-secondary-600">
                        {b.versiones_redes.length} versiones de post para redes
                      </p>
                    ) : (
                      <p className="mb-3 line-clamp-3 text-sm text-secondary-600">
                        {desarrolloBoletin(b)}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-secondary-400">
                        {formatearFecha(b.created_at)}
                        {b.creador?.nombre && ` · ${b.creador.nombre}`}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAbierto(b)}
                          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-100"
                        >
                          Ver completo
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-secondary-800">
                  {tituloBoletin(abierto)}
                </h3>
                <p className="mt-1 text-xs text-secondary-400">
                  {formatearFecha(abierto.created_at)}
                  {abierto.creador?.nombre && ` · ${abierto.creador.nombre}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(null)}
                className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {bajadaBoletin(abierto) && (
              <p className="mb-4 text-base font-medium italic leading-relaxed text-secondary-700">
                {bajadaBoletin(abierto)}
              </p>
            )}

            {esRedes(abierto) ? (
              <div className="space-y-5">
                <p className="text-xs font-semibold uppercase text-secondary-500">
                  Versiones de redes sociales
                </p>
                {abierto.versiones_redes.map((v: any, i: number) => (
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
              <div className="prose prose-sm max-w-none text-secondary-800">
                <p className="whitespace-pre-wrap leading-relaxed">
                  {desarrolloBoletin(abierto)}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              {esAprobable(abierto) && (
                <button
                  type="button"
                  onClick={() => {
                    cambiarEstatus(abierto.id, 'aprobar');
                    setAbierto(null);
                  }}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Aprobar
                </button>
              )}
              {esRechazable(abierto) && (
                <button
                  type="button"
                  onClick={() => {
                    cambiarEstatus(abierto.id, 'rechazar');
                    setAbierto(null);
                  }}
                  className="rounded-md bg-secondary-200 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-300"
                >
                  Rechazar
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(null)}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
