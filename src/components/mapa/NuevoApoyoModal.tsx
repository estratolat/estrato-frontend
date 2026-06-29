'use client';

import { useEffect, useState } from 'react';
import { apoyosApi, votantesApi } from '@/lib/api';
import { Votante } from '@/types';
import { Icon } from '@/components/ui/Icon';

const TIPOS_APOYO = [
  { id: 'despensa', label: 'Despensa' },
  { id: 'medicamento', label: 'Medicamento' },
  { id: 'lamina', label: 'Lámina' },
  { id: 'otro', label: 'Otro' },
];

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (id: string, lat?: number, lng?: number) => void;
  coordenadasIniciales?: { lat: number; lng: number } | null;
}

export default function NuevoApoyoModal({ abierto, onCerrar, onExito, coordenadasIniciales }: Props) {
  const [votantes, setVotantes] = useState<Votante[]>([]);
  const [form, setForm] = useState({
    votante_id: '',
    tipo_apoyo: 'despensa',
    cantidad: '1',
    observaciones: '',
    foto_url: '',
    lat: '',
    lng: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    loadVotantes();
    setForm((prev) => ({
      ...prev,
      votante_id: '',
      tipo_apoyo: 'despensa',
      cantidad: '1',
      observaciones: '',
      foto_url: '',
      lat: coordenadasIniciales?.lat.toFixed(6) || '',
      lng: coordenadasIniciales?.lng.toFixed(6) || '',
    }));
  }, [abierto, coordenadasIniciales]);

  const loadVotantes = async () => {
    try {
      const res = await votantesApi.getAll({ limit: 500 });
      setVotantes((res.data || []).filter((v: Votante) => v.activo));
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!form.votante_id) throw new Error('Selecciona el votante beneficiario.');

      const payload: any = {
        votante_id: form.votante_id,
        tipo_apoyo: form.tipo_apoyo,
        cantidad: parseInt(form.cantidad, 10) || 1,
        observaciones: form.observaciones,
      };

      if (form.foto_url.trim()) payload.foto_url = form.foto_url.trim();
      if (form.lat && form.lng) {
        payload.coordenadas = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
      }

      const res = await apoyosApi.create(payload);
      onExito(res.data?.id, payload.coordenadas?.lat, payload.coordenadas?.lng);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al registrar apoyo');
    } finally {
      setLoading(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Registrar apoyo</h2>
          <button
            onClick={onCerrar}
            className="rounded-full p-1 text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
          >
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="label">Votante beneficiario *</label>
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
              <p className="mt-1 text-xs text-red-600">
                No hay votantes registrados. Primero da de alta un votante en Votantes.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Tipo de apoyo *</label>
              <select
                name="tipo_apoyo"
                value={form.tipo_apoyo}
                onChange={handleChange}
                className="input"
                required
              >
                {TIPOS_APOYO.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Cantidad</label>
              <input
                type="number"
                name="cantidad"
                min={1}
                value={form.cantidad}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Observaciones</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Detalles de la entrega, condiciones, etc."
            />
          </div>

          <div>
            <label className="label">Foto (URL opcional)</label>
            <input
              type="url"
              name="foto_url"
              value={form.foto_url}
              onChange={handleChange}
              className="input"
              placeholder="https://..."
            />
          </div>

          <div className="space-y-3 rounded-lg border border-secondary-100 bg-secondary-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500">
              Ubicación de entrega
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                step="any"
                name="lat"
                value={form.lat}
                onChange={handleChange}
                placeholder="Latitud"
                className="input"
              />
              <input
                type="number"
                step="any"
                name="lng"
                value={form.lng}
                onChange={handleChange}
                placeholder="Longitud"
                className="input"
              />
            </div>
            <p className="text-xs text-secondary-500">
              Coordenadas del punto seleccionado en el mapa.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !form.votante_id}>
              {loading ? 'Guardando...' : 'Guardar apoyo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
