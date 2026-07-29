'use client';

import { useState, useEffect } from 'react';
import { mapaApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';
import type { GeoJSONCollection } from '@/types/mapa';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (capaIds?: string[]) => void;
  geojson: GeoJSONCollection | null;
  secciones: string[];
}

const PRESET_COLORS = ['#D73216', '#22C55E', '#FACC15', '#EF4444', '#383745', '#3B82F6', '#8B5CF6', '#06B6D4'];

export default function GuardarDibujoModal({ abierto, onCerrar, onExito, geojson, secciones }: Props) {
  const [nombre, setNombre] = useState('');
  const [color, setColor] = useState('#D73216');
  const [seccion, setSeccion] = useState('');
  const [seccionOtra, setSeccionOtra] = useState('');
  const [capaTerritorio, setCapaTerritorio] = useState('custom');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      setError(null);
      setNombre('');
      setColor('#D73216');
      setSeccion('');
      setSeccionOtra('');
      setCapaTerritorio('custom');
    }
  }, [abierto]);

  if (!abierto || !geojson) return null;

  const seccionFinal = seccion === 'otra' ? seccionOtra.trim() : seccion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Escribe un nombre para la capa dibujada.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const blob = new Blob([JSON.stringify(geojson)], { type: 'application/geo+json' });
      const file = new File([blob], `${nombre.trim().replace(/\s+/g, '_')}.geojson`, { type: 'application/geo+json' });

      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('nombre', nombre.trim());
      formData.append('tipo_archivo', 'geojson');
      formData.append('color', color);
      formData.append('visible', 'true');
      if (seccionFinal) {
        formData.append('seccion_electoral', seccionFinal);
      }
      const metadata: Record<string, any> = {
        capa_territorio: capaTerritorio,
        grupo: 'Capas dibujadas',
        origen: 'dibujo_manual',
        feature_count: geojson.features.length,
      };
      if (seccionFinal) {
        metadata.seccion_electoral = seccionFinal;
      }
      formData.append('metadata', JSON.stringify(metadata));

      const res = await mapaApi.subirCapa(formData);
      const capaId = res.data?.capa?.id;
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
      <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Guardar dibujo manual</h2>
          <button onClick={onCerrar} className="text-secondary-400 hover:text-secondary-600" disabled={loading}>
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-secondary-600">
            Vas a guardar <strong>{geojson.features.length}</strong> forma{geojson.features.length === 1 ? '' : 's'} dibujada{geojson.features.length === 1 ? '' : 's'} como una nueva capa personalizada.
          </p>

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
              <label className="label">Agrupar en capa del territorio</label>
              <select
                value={capaTerritorio}
                onChange={(e) => setCapaTerritorio(e.target.value)}
                className="input"
                disabled={loading}
              >
                <option value="custom">Capa personalizada</option>
                <option value="secciones">Secciones</option>
                <option value="propio">Territorio propio</option>
                <option value="riesgo">Territorio en riesgo</option>
              </select>
            </div>

            <div>
              <label className="label">Sección electoral (opcional)</label>
              <select
                value={seccion}
                onChange={(e) => setSeccion(e.target.value)}
                className="input"
                disabled={loading}
              >
                <option value="">Sin sección (capa general)</option>
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
              {loading ? 'Guardando...' : 'Guardar capa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
