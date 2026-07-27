'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { FeatureCapa, FeatureMetadata } from '@/types/mapa';
import { Lider, Zona } from '@/types';

interface Props {
  capaId: string;
  capaNombre: string;
  feature: FeatureCapa;
  secciones?: string[];
  lideres?: Lider[];
  zonas?: Zona[];
  abierto: boolean;
  onCerrar: () => void;
  onExito: (feature: FeatureCapa) => void;
}

export default function EditarFeatureModal({
  capaId,
  capaNombre,
  feature,
  secciones = [],
  lideres = [],
  zonas = [],
  abierto,
  onCerrar,
  onExito,
}: Props) {
  const [nombre, setNombre] = useState(feature.nombre);
  const [color, setColor] = useState(feature.color);
  const [opacidad, setOpacidad] = useState(feature.opacidad ?? 1);
  const [bloqueado, setBloqueado] = useState(feature.bloqueado ?? false);
  const [seccion, setSeccion] = useState(feature.metadata?.seccion || '');
  const [liderId, setLiderId] = useState(feature.metadata?.lider_id || '');
  const [zonaId, setZonaId] = useState(feature.metadata?.zona_id || '');
  const [tags, setTags] = useState<string[]>(feature.metadata?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notas, setNotas] = useState(feature.metadata?.notas || '');
  const [custom, setCustom] = useState<[string, string][]>(() => {
    const c = feature.metadata?.custom || {};
    return Object.entries(c).map(([k, v]) => [k, String(v)]);
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setNombre(feature.nombre);
    setColor(feature.color);
    setOpacidad(feature.opacidad ?? 1);
    setBloqueado(feature.bloqueado ?? false);
    setSeccion(feature.metadata?.seccion || '');
    setLiderId(feature.metadata?.lider_id || '');
    setZonaId(feature.metadata?.zona_id || '');
    setTags(feature.metadata?.tags || []);
    setTagInput('');
    setNotas(feature.metadata?.notas || '');
    const c = feature.metadata?.custom || {};
    setCustom(Object.entries(c).map(([k, v]) => [k, String(v)]));
    setError(null);
  }, [abierto, feature]);

  const agregarTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagInput('');
  };

  const eliminarTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const agregarCustom = () => setCustom([...custom, ['', '']]);

  const cambiarCustom = (i: number, key: string, value: string) => {
    const next = [...custom];
    next[i] = [key, value];
    setCustom(next);
  };

  const eliminarCustom = (i: number) => setCustom(custom.filter((_, idx) => idx !== i));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const customObj: Record<string, string> = {};
      custom.forEach(([k, v]) => {
        if (k.trim()) customObj[k.trim()] = v;
      });

      const metadata: FeatureMetadata = {
        seccion: seccion || undefined,
        lider_id: liderId || undefined,
        zona_id: zonaId || undefined,
        tags: tags.length ? tags : undefined,
        notas: notas.trim() || undefined,
        custom: Object.keys(customObj).length ? customObj : undefined,
      };

      const { data } = await mapaApi.updateFeature(capaId, feature.feature_id, {
        nombre: nombre.trim(),
        color,
        opacidad,
        bloqueado,
        metadata,
      });

      onExito(data);
      onCerrar();
    } catch (err: any) {
      setError(errorToString(err) || 'Error al guardar el polígono');
    } finally {
      setLoading(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-secondary-900">Editar polígono</h2>
            <p className="text-xs text-secondary-500">{capaNombre}</p>
          </div>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600">
            <X size={20} />
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

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="label">Color</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full cursor-pointer rounded border border-secondary-300"
              />
            </div>
            <div className="flex-1">
              <label className="label">Opacidad {Math.round(opacidad * 100)}%</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacidad}
                onChange={(e) => setOpacidad(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-secondary-200 p-2">
            <input
              type="checkbox"
              checked={bloqueado}
              onChange={(e) => setBloqueado(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-secondary-700">Bloquear polígono (no interactivo en el mapa)</span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Sección electoral</label>
              <select
                value={seccion}
                onChange={(e) => setSeccion(e.target.value)}
                className="input w-full"
              >
                <option value="">Sin asignar</option>
                {secciones.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Líder responsable</label>
              <select
                value={liderId}
                onChange={(e) => setLiderId(e.target.value)}
                className="input w-full"
              >
                <option value="">Sin asignar</option>
                {lideres.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.votante?.nombre || l.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Zona de trabajo</label>
            <select
              value={zonaId}
              onChange={(e) => setZonaId(e.target.value)}
              className="input w-full"
            >
              <option value="">Sin asignar</option>
              {zonas.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Tags</label>
            <div className="mb-2 flex flex-wrap gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-700"
                >
                  {t}
                  <button type="button" onClick={() => eliminarTag(t)} className="hover:text-primary-900">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregarTag())}
                placeholder="Agregar tag..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={agregarTag}
                className="btn-secondary px-3"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="input w-full"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Campos personalizados</label>
              <button
                type="button"
                onClick={agregarCustom}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {custom.map(([k, v], i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={k}
                    onChange={(e) => cambiarCustom(i, e.target.value, v)}
                    placeholder="Clave"
                    className="input flex-1"
                  />
                  <input
                    type="text"
                    value={v}
                    onChange={(e) => cambiarCustom(i, k, e.target.value)}
                    placeholder="Valor"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => eliminarCustom(i)}
                    className="text-secondary-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
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
