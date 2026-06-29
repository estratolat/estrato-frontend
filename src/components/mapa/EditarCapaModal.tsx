'use client';

import { useState } from 'react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';
import { CapaMapa } from '@/types/mapa';

interface Props {
  capa: CapaMapa;
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
}

const presetColors = ['#6B7280', '#D73216', '#22C55E', '#FACC15', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4'];

export default function EditarCapaModal({ capa, abierto, onCerrar, onExito }: Props) {
  const [nombre, setNombre] = useState(capa.nombre);
  const [color, setColor] = useState(capa.color);
  const [grupo, setGrupo] = useState(((capa.metadata as any)?.grupo || '').toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const metadata = { ...(capa.metadata || {}), grupo: grupo.trim() || null };
      await mapaApi.updateCapa(capa.id, { nombre: nombre.trim(), color, metadata });
      onExito();
      onCerrar();
    } catch (err: any) {
      setError(errorToString(err) || 'Error al guardar la capa');
    } finally {
      setLoading(false);
    }
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar la capa "${capa.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      setLoading(true);
      setError(null);
      await mapaApi.deleteCapa(capa.id);
      onExito();
      onCerrar();
    } catch (err: any) {
      setError(errorToString(err) || 'Error al eliminar la capa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Editar capa</h2>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600">
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="label">Grupo / Tema</label>
            <input
              type="text"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              placeholder="Ej. Territorio INEGI, Secciones INE, Apoyos"
              className="input w-full"
            />
            <p className="mt-1 text-[10px] text-secondary-500">Las capas con el mismo grupo se mostrarán juntas.</p>
          </div>

          <div>
            <label className="label">Color</label>
            <div className="flex flex-wrap items-center gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
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

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={eliminar}
              disabled={loading}
              className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              Eliminar
            </button>
            <button
              type="button"
              onClick={onCerrar}
              disabled={loading}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
