'use client';

import { useEffect, useState } from 'react';
import { boletinesApi } from '@/lib/api';

interface EditarBoletinModalProps {
  boletin: any;
  onCerrar: () => void;
  onGuardar: (b: any) => void;
}

const REDES = [
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'tiktok', label: 'TikTok', color: '#000000' },
];

export default function EditarBoletinModal({ boletin, onCerrar, onGuardar }: EditarBoletinModalProps) {
  const tieneRedes = !!boletin?.posts_redes || (Array.isArray(boletin?.versiones_redes) && boletin.versiones_redes.length > 0);
  const [modoEdicion, setModoEdicion] = useState<'boletin' | 'redes'>('boletin');

  const [editandoBoletin, setEditandoBoletin] = useState({
    titulo: boletin?.titulo || '',
    bajada: boletin?.bajada || '',
    desarrollo: boletin?.desarrollo || boletin?.copy_generado || '',
  });

  const [editandoRedes, setEditandoRedes] = useState(() => {
    const posts = boletin?.posts_redes || {};
    return {
      facebook: posts.facebook?.caption || '',
      instagram: posts.instagram?.caption || '',
      tiktok: posts.tiktok?.caption || '',
    };
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setEditandoBoletin({
      titulo: boletin?.titulo || '',
      bajada: boletin?.bajada || '',
      desarrollo: boletin?.desarrollo || boletin?.copy_generado || '',
    });
    const posts = boletin?.posts_redes || {};
    setEditandoRedes({
      facebook: posts.facebook?.caption || '',
      instagram: posts.instagram?.caption || '',
      tiktok: posts.tiktok?.caption || '',
    });
  }, [boletin]);

  const handleGuardar = async () => {
    setGuardando(true);
    setError('');
    try {
      let payload: any = {};
      if (modoEdicion === 'boletin') {
        payload = {
          titulo: editandoBoletin.titulo,
          bajada: editandoBoletin.bajada,
          desarrollo: editandoBoletin.desarrollo,
        };
      } else {
        payload = {
          posts_redes: {
            facebook: { ...(boletin?.posts_redes?.facebook || {}), caption: editandoRedes.facebook },
            instagram: { ...(boletin?.posts_redes?.instagram || {}), caption: editandoRedes.instagram },
            tiktok: { ...(boletin?.posts_redes?.tiktok || {}), caption: editandoRedes.tiktok },
          },
        };
      }
      const { data } = await boletinesApi.update(boletin.id, payload);
      onGuardar(data);
      onCerrar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar boletín');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-secondary-800">Editar</h3>
            <p className="text-xs text-secondary-500">{boletin?.titulo || 'Boletín'}</p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {tieneRedes && (
          <div className="mb-5 flex rounded-lg border border-secondary-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setModoEdicion('boletin')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                modoEdicion === 'boletin'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              Boletín
            </button>
            <button
              type="button"
              onClick={() => setModoEdicion('redes')}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                modoEdicion === 'redes'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-secondary-600 hover:bg-secondary-50'
              }`}
            >
              Publicación sugerida
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {modoEdicion === 'boletin' ? (
          <div className="space-y-4">
            <div>
              <label className="label">Título</label>
              <input
                type="text"
                value={editandoBoletin.titulo}
                onChange={(e) => setEditandoBoletin({ ...editandoBoletin, titulo: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Bajada</label>
              <input
                type="text"
                value={editandoBoletin.bajada}
                onChange={(e) => setEditandoBoletin({ ...editandoBoletin, bajada: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label">Desarrollo</label>
              <textarea
                rows={8}
                value={editandoBoletin.desarrollo}
                onChange={(e) => setEditandoBoletin({ ...editandoBoletin, desarrollo: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {REDES.map(({ key, label, color }) => (
              <div key={key}>
                <label className="label flex items-center gap-2" style={{ color }}>
                  {label}
                </label>
                <textarea
                  rows={4}
                  value={editandoRedes[key as keyof typeof editandoRedes]}
                  onChange={(e) => setEditandoRedes((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="input w-full"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-secondary-700 shadow-sm ring-1 ring-secondary-200 hover:bg-secondary-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
