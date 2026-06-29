'use client';

import { useState, useEffect } from 'react';
import { votantesApi, lideresApi } from '@/lib/api';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';
import MiniMapa from './MiniMapa';

interface Props {
  onExito: () => void;
}

export default function LiderForm({ onExito }: Props) {
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    seccion_electoral: '',
    colonia: '',
    alcance_estimado: '100',
    lider_padre_id: '',
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    loadLideres();
  }, []);

  const loadLideres = async () => {
    try {
      const res = await lideresApi.getAll();
      setLideres((res.data || []).filter((l: Lider) => l.activo));
    } catch {}
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const reset = () => {
    setForm({
      nombre: '',
      telefono: '',
      seccion_electoral: '',
      colonia: '',
      alcance_estimado: '100',
      lider_padre_id: '',
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
        throw new Error('Selecciona la ubicación en el mapa tocando el punto o usando "Usar mi ubicación". Sin coordenadas el líder no aparecerá en el mapa.');
      }

      const votanteData: any = {
        tenant_id: tenantId,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim(),
        seccion_electoral: form.seccion_electoral.trim(),
        colonia: form.colonia.trim(),
        es_lider: true,
        origen_qr: 'brigada',
        activo: true,
      };
      if (coords) votanteData.coordenadas = coords;

      const votanteRes = await votantesApi.create(votanteData);
      const votanteId = votanteRes.data?.id;
      if (!votanteId) throw new Error('No se pudo crear el votante base');

      const liderData: any = {
        tenant_id: tenantId,
        votante_id: votanteId,
        alcance_estimado: parseInt(form.alcance_estimado, 10) || 100,
        score: 0,
      };
      if (form.lider_padre_id) liderData.lider_padre_id = form.lider_padre_id;

      await lideresApi.create(liderData);
      setOk(true);
      reset();
      loadLideres();
      onExito();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar líder';
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
          <Icon name="ver" size={16} className="inline mr-1" /> Líder registrado correctamente.
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
          <label className="label text-sm">Alcance estimado</label>
          <input
            name="alcance_estimado"
            type="number"
            min={1}
            value={form.alcance_estimado}
            onChange={handleChange}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label text-sm">Líder padre (opcional)</label>
        <select
          name="lider_padre_id"
          value={form.lider_padre_id}
          onChange={handleChange}
          className="input"
        >
          <option value="">Sin líder padre</option>
          {lideres.map((l) => (
            <option key={l.id} value={l.id}>
              {l.votante?.nombre || l.id}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border border-secondary-100 bg-secondary-50/50 p-2">
        <MiniMapa lat={coords?.lat ?? null} lng={coords?.lng ?? null} onChange={(lat, lng) => setCoords({ lat, lng })} />
        {!coords && <p className="mt-1 text-xs text-amber-600">Toca el mapa o usa "Usar mi ubicación" para marcar la ubicación del líder.</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !form.nombre.trim() || !coords}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Guardar líder'}
      </button>
    </form>
  );
}
