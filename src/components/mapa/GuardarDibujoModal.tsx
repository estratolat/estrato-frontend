'use client';

import { useState, useEffect, useMemo } from 'react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';
import type { GeoJSONCollection, CapaMapa } from '@/types/mapa';

type ModoGuardado = 'nueva' | 'existente';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (capaIds?: string[]) => void;
  geojson: GeoJSONCollection | null;
  secciones: string[];
  capasPersonalizadas: CapaMapa[];
}

const PRESET_COLORS = ['#D73216', '#22C55E', '#FACC15', '#EF4444', '#383745', '#3B82F6', '#8B5CF6', '#06B6D4'];
const PRESET_GRUPOS = ['Capas dibujadas', 'Territorio propio', 'Territorio en riesgo', 'Secciones'];

export default function GuardarDibujoModal({ abierto, onCerrar, onExito, geojson, secciones, capasPersonalizadas }: Props) {
  const [modo, setModo] = useState<ModoGuardado>('nueva');
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#D73216');
  const [grupo, setGrupo] = useState('Capas dibujadas');
  const [grupoNuevo, setGrupoNuevo] = useState('');
  const [capaExistenteId, setCapaExistenteId] = useState('');
  const [seccion, setSeccion] = useState('');
  const [seccionOtra, setSeccionOtra] = useState('');
  const [capaTerritorio, setCapaTerritorio] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gruposExistentes = useMemo(() => {
    const set = new Set<string>(PRESET_GRUPOS);
    capasPersonalizadas.forEach(capa => {
      const g = (capa.metadata as any)?.grupo;
      if (g) set.add(g);
    });
    return Array.from(set).sort();
  }, [capasPersonalizadas]);

  const capasEditables = useMemo(() => {
    return capasPersonalizadas.filter(capa => !capa.bloqueada);
  }, [capasPersonalizadas]);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setModo('nueva');
      setNombre('');
      setColor('#D73216');
      setGrupo('Capas dibujadas');
      setGrupoNuevo('');
      setCapaExistenteId('');
      setSeccion('');
      setSeccionOtra('');
      setCapaTerritorio('custom');
    }
  }, [abierto]);

  if (!abierto || !geojson) return null;

  const seccionFinal = seccion === 'otra' ? seccionOtra.trim() : seccion;
  const grupoFinal = grupo === '__nuevo__' ? grupoNuevo.trim() : grupo;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (modo === 'nueva') {
      if (!nombre.trim()) {
        setError('Escribe un nombre para la nueva capa.');
        return;
      }
      if (grupo === '__nuevo__' && !grupoNuevo.trim()) {
        setError('Escribe el nombre del nuevo grupo.');
        return;
      }
    } else {
      if (!capaExistenteId) {
        setError('Selecciona una capa existente para agregar el dibujo.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (modo === 'existente') {
        const res = await mapaApi.agregarFeatures(capaExistenteId, geojson);
        const capaId = res.data?.id;
        onExito(capaId ? [capaId] : undefined);
        onCerrar();
        return;
      }

      const metadata: Record<string, any> = {
        capa_territorio: capaTerritorio,
        grupo: grupoFinal || 'Capas dibujadas',
        origen: 'dibujo_manual',
        feature_count: geojson.features.length,
      };
      if (seccionFinal) {
        metadata.seccion_electoral = seccionFinal;
      }

      const res = await mapaApi.createCapa({
        nombre: nombre.trim(),
        tipo: 'custom',
        origen: 'propia',
        color,
        visible: true,
        geojson,
        metadata,
      });
      const capaId = res.data?.id;
      onExito(capaId ? [capaId] : undefined);
      onCerrar();
    } catch (err: any) {
      console.error('[GuardarDibujoModal] error:', err);
      const status = err.response?.status;
      const backendMsg = err.response?.data?.message || err.response?.data?.error;
      const esRed = !err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error');
      setError(
        esRed
          ? 'No se pudo conectar con el servidor. Verifica tu conexión o que el backend esté activo.'
          : backendMsg || errorToString(err) || `Error ${status || ''} al guardar el dibujo`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Guardar dibujo</h2>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600" disabled={loading}>
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-secondary-600">
            Vas a guardar <strong>{geojson.features.length}</strong> forma{geojson.features.length === 1 ? '' : 's'} dibujada{geojson.features.length === 1 ? '' : 's'}.
          </p>

          <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary-50 p-1">
            <button
              type="button"
              onClick={() => setModo('nueva')}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                modo === 'nueva'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-secondary-600 hover:bg-secondary-100'
              }`}
            >
              Crear capa nueva
            </button>
            <button
              type="button"
              onClick={() => setModo('existente')}
              className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                modo === 'existente'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-secondary-600 hover:bg-secondary-100'
              }`}
            >
              Agregar a capa existente
            </button>
          </div>

          {modo === 'nueva' ? (
            <>
              <div>
                <label className="label">Nombre de la capa *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="input"
                  placeholder="Ej. Sección 125 - Territorio propio"
                  disabled={loading}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Grupo</label>
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    className="input"
                    disabled={loading}
                  >
                    {gruposExistentes.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    <option value="__nuevo__">+ Nuevo grupo</option>
                  </select>
                  {grupo === '__nuevo__' && (
                    <input
                      type="text"
                      value={grupoNuevo}
                      onChange={(e) => setGrupoNuevo(e.target.value)}
                      placeholder="Nombre del nuevo grupo"
                      className="input mt-2"
                      disabled={loading}
                    />
                  )}
                </div>

                <div>
                  <label className="label">Sección electoral (opcional)</label>
                  <select
                    value={seccion}
                    onChange={(e) => setSeccion(e.target.value)}
                    className="input"
                    disabled={loading}
                  >
                    <option value="">Sin sección</option>
                    {secciones.map((s) => (
                      <option key={s} value={s}>Sección {s}</option>
                    ))}
                    <option value="otra">Otra sección...</option>
                  </select>
                  {seccion === 'otra' && (
                    <input
                      type="text"
                      value={seccionOtra}
                      onChange={(e) => setSeccionOtra(e.target.value)}
                      placeholder="Ej. 0123"
                      className="input mt-2"
                      maxLength={4}
                      disabled={loading}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="label">Color de la capa</label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      disabled={loading}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${color === c ? 'border-secondary-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    disabled={loading}
                    className="h-8 w-12 cursor-pointer rounded border border-secondary-300"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="label">Capa existente *</label>
              <select
                value={capaExistenteId}
                onChange={(e) => setCapaExistenteId(e.target.value)}
                className="input"
                disabled={loading}
              >
                <option value="">— Selecciona una capa —</option>
                {capasEditables.length === 0 && (
                  <option value="" disabled>No hay capas editables</option>
                )}
                {capasEditables.map((capa) => (
                  <option key={capa.id} value={capa.id}>
                    {capa.nombre}
                    {capa.metadata?.grupo ? ` (${capa.metadata.grupo})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-secondary-500">
                El dibujo se agregará a esta capa sin borrar lo que ya contiene.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Guardando...' : modo === 'nueva' ? 'Crear capa' : 'Agregar a capa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
