'use client';

import { useState, useEffect } from 'react';
import { apoyosApi, votantesApi } from '@/lib/api';
import { Votante } from '@/types';
import { Icon } from '@/components/ui/Icon';
import MiniMapa from './MiniMapa';
import FotoUploader from './FotoUploader';

interface Props {
  onExito: () => void;
}

const TIPOS_APOYO = [
  { id: 'despensa', label: 'Despensa' },
  { id: 'medicamento', label: 'Medicamento' },
  { id: 'lamina', label: 'Lámina' },
  { id: 'otro', label: 'Otro' },
];

export default function ApoyoForm({ onExito }: Props) {
  const [votantes, setVotantes] = useState<Votante[]>([]);
  const [form, setForm] = useState({
    votante_id: '',
    tipo_apoyo: 'despensa',
    cantidad: '1',
    observaciones: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    loadVotantes();
  }, []);

  const loadVotantes = async () => {
    try {
      const res = await votantesApi.getAll({ limit: 500 });
      setVotantes((res.data || []).filter((v: Votante) => v.activo));
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm({
      votante_id: '',
      tipo_apoyo: 'despensa',
      cantidad: '1',
      observaciones: '',
    });
    setCoords(null);
    setFotoUrl(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOk(false);

    try {
      if (!form.votante_id) throw new Error('Selecciona el beneficiario');
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        throw new Error('Selecciona la ubicación de la entrega en el mapa tocando el punto o usando "Usar mi ubicación". Sin coordenadas el apoyo no aparecerá en el mapa territorial.');
      }

      const payload: any = {
        votante_id: form.votante_id,
        tipo_apoyo: form.tipo_apoyo,
        cantidad: parseInt(form.cantidad, 10) || 1,
        observaciones: form.observaciones.trim(),
      };

      if (coords) payload.coordenadas = coords;
      if (fotoUrl) payload.foto_url = fotoUrl;

      await apoyosApi.create(payload);
      setOk(true);
      reset();
      loadVotantes();
      onExito();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar apoyo';
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
          <Icon name="ver" size={16} className="inline mr-1" /> Apoyo registrado correctamente.
        </div>
      )}

      <div>
        <label className="label text-sm">Beneficiario *</label>
        <select
          name="votante_id"
          value={form.votante_id}
          onChange={handleChange}
          className="input"
          required
        >
          <option value="">— Seleccionar votante —</option>
          {votantes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre || 'Sin nombre'} {v.seccion_electoral ? `(Secc. ${v.seccion_electoral})` : ''}
            </option>
          ))}
        </select>
        {votantes.length === 0 && (
          <p className="mt-1 text-xs text-red-600">No hay votantes registrados. Ve a la pestaña Votante primero.</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label text-sm">Tipo de apoyo *</label>
          <div className="grid grid-cols-2 gap-2">
            {TIPOS_APOYO.map((t) => {
              const activo = form.tipo_apoyo === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, tipo_apoyo: t.id }))}
                  className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                    activo
                      ? 'border-primary-500 bg-primary-50 text-primary-800'
                      : 'border-secondary-200 bg-white text-secondary-700 hover:border-primary-300'
                  }`}
                >
                  {t.label} {activo && <span className="ml-1 text-primary-600">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label text-sm">Cantidad</label>
          <input
            name="cantidad"
            type="number"
            min={1}
            value={form.cantidad}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label text-sm">Observaciones</label>
        <textarea
          name="observaciones"
          value={form.observaciones}
          onChange={handleChange}
          className="input min-h-[80px]"
          placeholder="Detalles de la entrega"
        />
      </div>

      <FotoUploader fotoUrl={fotoUrl} onChange={setFotoUrl} disabled={loading} />

      <div className="rounded-lg border border-secondary-100 bg-secondary-50/50 p-2">
        <MiniMapa lat={coords?.lat ?? null} lng={coords?.lng ?? null} onChange={(lat, lng) => setCoords({ lat, lng })} />
        {!coords && <p className="mt-1 text-xs text-amber-600">Toca el mapa o usa "Usar mi ubicación" para marcar dónde se entregó el apoyo.</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !form.votante_id || !coords}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Registrar apoyo'}
      </button>
    </form>
  );
}
