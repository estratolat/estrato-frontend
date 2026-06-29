'use client';

import { useState, useEffect } from 'react';
import { peticionesApi, votantesApi } from '@/lib/api';
import { Votante } from '@/types';
import { Icon } from '@/components/ui/Icon';
import MiniMapa from './MiniMapa';
import FotoUploader from './FotoUploader';

interface Props {
  onExito: () => void;
}

const CATEGORIAS = [
  { id: 'bache', label: 'Bache' },
  { id: 'alumbrado', label: 'Alumbrado' },
  { id: 'agua', label: 'Agua' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'limpia', label: 'Limpia' },
  { id: 'salud', label: 'Salud' },
  { id: 'otro', label: 'Otro' },
];

const PRIORIDADES = [
  { id: 'baja', label: 'Baja' },
  { id: 'media', label: 'Media' },
  { id: 'alta', label: 'Alta' },
  { id: 'critica', label: 'Crítica' },
];

export default function PeticionForm({ onExito }: Props) {
  const [votantes, setVotantes] = useState<Votante[]>([]);
  const [form, setForm] = useState({
    votante_id: '',
    categoria: 'otro',
    prioridad: 'media',
    titulo: '',
    descripcion: '',
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
      categoria: 'otro',
      prioridad: 'media',
      titulo: '',
      descripcion: '',
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
      const payload: any = {
        categoria: form.categoria,
        prioridad: form.prioridad,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
      };

      if (!payload.descripcion) throw new Error('La descripción es requerida');
      if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
        throw new Error('Selecciona la ubicación de la petición en el mapa tocando el punto o usando "Usar mi ubicación". Sin coordenadas la petición no aparecerá en el mapa territorial.');
      }
      payload.coordenadas = coords;
      if (form.votante_id) payload.votante_id = form.votante_id;
      if (fotoUrl) payload.foto_url = fotoUrl;

      await peticionesApi.create(payload);
      setOk(true);
      reset();
      onExito();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar petición';
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
          <Icon name="ver" size={16} className="inline mr-1" /> Petición registrada correctamente.
        </div>
      )}

      <div>
        <label className="label text-sm">Categoría</label>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((c) => {
            const activo = form.categoria === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, categoria: c.id }))}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                  activo
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-secondary-200 bg-white text-secondary-700 hover:border-primary-300'
                }`}
              >
                {c.label} {activo && <span className="ml-0.5 text-primary-600">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label text-sm">Prioridad</label>
        <div className="grid grid-cols-2 gap-2">
          {PRIORIDADES.map((p) => {
            const activo = form.prioridad === p.id;
            const color =
              p.id === 'critica' ? 'text-red-700 bg-red-50 border-red-200' :
              p.id === 'alta' ? 'text-orange-700 bg-orange-50 border-orange-200' :
              p.id === 'media' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
              'text-blue-700 bg-blue-50 border-blue-200';
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, prioridad: p.id }))}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                  activo ? color : 'border-secondary-200 bg-white text-secondary-700 hover:border-primary-300'
                }`}
              >
                {p.label} {activo && <span className="ml-0.5">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label text-sm">Título</label>
        <input
          name="titulo"
          value={form.titulo}
          onChange={handleChange}
          className="input"
          placeholder="Ej. Fuga de agua en calle Principal"
        />
      </div>

      <div>
        <label className="label text-sm">Descripción *</label>
        <textarea
          name="descripcion"
          value={form.descripcion}
          onChange={handleChange}
          className="input min-h-[100px]"
          placeholder="Describe la petición con el mayor detalle posible"
          required
        />
      </div>

      <div>
        <label className="label text-sm">Ciudadano que reporta (opcional)</label>
        <select
          name="votante_id"
          value={form.votante_id}
          onChange={handleChange}
          className="input"
        >
          <option value="">— Sin vincular —</option>
          {votantes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre || 'Sin nombre'} {v.telefono ? `• ${v.telefono}` : ''}
            </option>
          ))}
        </select>
      </div>

      <FotoUploader fotoUrl={fotoUrl} onChange={setFotoUrl} disabled={loading} />

      <div className="rounded-lg border border-secondary-100 bg-secondary-50/50 p-2">
        <MiniMapa lat={coords?.lat ?? null} lng={coords?.lng ?? null} onChange={(lat, lng) => setCoords({ lat, lng })} />
        {!coords && <p className="mt-1 text-xs text-amber-600">Toca el mapa o usa "Usar mi ubicación" para georeferenciar la petición.</p>}
      </div>

      <button
        type="submit"
        disabled={loading || !form.descripcion.trim() || !coords}
        className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Guardando...' : 'Registrar petición'}
      </button>
    </form>
  );
}
