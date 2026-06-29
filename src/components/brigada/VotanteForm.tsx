'use client';

import { useState } from 'react';
import { votantesApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import MiniMapa from './MiniMapa';

interface Props {
  onExito: () => void;
}

const NIVELES = [
  { value: 5, label: '5 - Muy probable' },
  { value: 4, label: '4 - Probable' },
  { value: 3, label: '3 - Indeciso' },
  { value: 2, label: '2 - Poco probable' },
  { value: 1, label: '1 - Opuesto' },
];

export default function VotanteForm({ onExito }: Props) {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    seccion_electoral: '',
    colonia: '',
    municipio: '',
    nivel_apoyo: '3',
    tags: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm({
      nombre: '',
      telefono: '',
      seccion_electoral: '',
      colonia: '',
      municipio: '',
      nivel_apoyo: '3',
      tags: '',
    });
    setCoords(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(false);

    try {
      const tenantId = localStorage.getItem('tenantId');
      if (!tenantId) throw new Error('No se detectó el tenant');
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        throw new Error('Selecciona la ubicación en el mapa tocando el punto o usando "Usar mi ubicación". Sin coordenadas el votante no aparecerá en el mapa territorial.');
      }

      const payload: any = {
        tenant_id: tenantId,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        seccion_electoral: form.seccion_electoral.trim(),
        colonia: form.colonia.trim(),
        municipio: form.municipio.trim(),
        nivel_apoyo: parseInt(form.nivel_apoyo, 10),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        origen_qr: 'brigada',
        activo: true,
      };

      if (coords) payload.coordenadas = coords;

      await votantesApi.create(payload);
      setOk(true);
      reset();
      onExito();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Icon name="ver" size={16} className="inline mr-1" /> Votante registrado correctamente.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label text-sm">Nombre completo *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            className="input"
            placeholder="Ej. María González"
            required
          />
        </div>
        <div>
          <label className="label text-sm">Teléfono</label>
          <input
            name="telefono"
            type="tel"
            value={form.telefono}
            onChange={handleChange}
            className="input"
            placeholder="477 000 0000"
          />
        </div>
        <div>
          <label className="label text-sm">Sección electoral</label>
          <input
            name="seccion_electoral"
            value={form.seccion_electoral}
            onChange={handleChange}
            className="input"
            placeholder="0123"
            maxLength={4}
          />
        </div>
        <div>
          <label className="label text-sm">Colonia</label>
          <input
            name="colonia"
            value={form.colonia}
            onChange={handleChange}
            className="input"
            placeholder="Ej. Jardines"
          />
        </div>
        <div>
          <label className="label text-sm">Municipio</label>
          <input
            name="municipio"
            value={form.municipio}
            onChange={handleChange}
            className="input"
            placeholder="Ej. León"
          />
        </div>
      </div>

      <div>
        <label className="label text-sm">Nivel de apoyo</label>
        <div className="grid grid-cols-1 gap-2">
          {NIVELES.map((n) => {
            const activo = form.nivel_apoyo === String(n.value);
            return (
              <button
                key={n.value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, nivel_apoyo: String(n.value) }))}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition ${
                  activo
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-secondary-200 bg-white text-secondary-700 hover:border-primary-300'
                }`}
              >
                <span>{n.label}</span>
                {activo && <span className="text-primary-600">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label text-sm">Etiquetas</label>
        <input
          name="tags"
          value={form.tags}
          onChange={handleChange}
          className="input"
          placeholder="voluntario, eventos, lider (separadas por coma)"
        />
      </div>

      <div className="rounded-lg border border-secondary-100 bg-secondary-50/50 p-2">
        <MiniMapa lat={coords?.lat ?? null} lng={coords?.lng ?? null} onChange={(lat, lng) => setCoords({ lat, lng })} />
        {!coords && <p className="mt-1 text-xs text-amber-600">Toca el mapa o usa "Usar mi ubicación" para georeferenciar al votante.</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !form.nombre.trim() || !coords}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar votante'}
      </button>
    </form>
  );
}
