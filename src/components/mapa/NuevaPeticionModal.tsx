'use client';

import { useEffect, useState } from 'react';
import { peticionesApi, votantesApi } from '@/lib/api';
import { Votante } from '@/types';
import { Icon } from '@/components/ui/Icon';
import FotoUploader from '@/components/brigada/FotoUploader';

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

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (id: string, lat?: number, lng?: number) => void;
  coordenadasIniciales?: { lat: number; lng: number } | null;
}

export default function NuevaPeticionModal({ abierto, onCerrar, onExito, coordenadasIniciales }: Props) {
  const [votantes, setVotantes] = useState<Votante[]>([]);
  const [form, setForm] = useState({
    votante_id: '',
    categoria: 'otro',
    prioridad: 'media',
    titulo: '',
    descripcion: '',
    lat: '',
    lng: '',
  });
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    loadVotantes();
    setForm((prev) => ({
      ...prev,
      votante_id: '',
      categoria: 'otro',
      prioridad: 'media',
      titulo: '',
      descripcion: '',
      lat: coordenadasIniciales?.lat.toFixed(6) || '',
      lng: coordenadasIniciales?.lng.toFixed(6) || '',
    }));
    setFotoUrl(null);
  }, [abierto, coordenadasIniciales]);

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

  const usarUbicacion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setError('No se pudo obtener la ubicación. Ingresa manualmente las coordenadas.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        categoria: form.categoria,
        prioridad: form.prioridad,
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
      };

      if (!payload.descripcion) throw new Error('La descripción es requerida');

      if (!form.lat || !form.lng) {
        throw new Error('Se requieren coordenadas para mostrar la petición en el mapa.');
      }
      payload.coordenadas = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };

      if (form.votante_id) payload.votante_id = form.votante_id;
      if (fotoUrl) payload.foto_url = fotoUrl;

      const res = await peticionesApi.create(payload);
      onExito(res.data?.id, payload.coordenadas.lat, payload.coordenadas.lng);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar petición';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Nueva petición ciudadana</h2>
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label text-sm">Ubicación geográfica *</label>
              <button
                type="button"
                onClick={usarUbicacion}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Usar mi ubicación
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold uppercase text-secondary-500">Latitud</label>
                <input
                  type="number"
                  step="any"
                  value={form.lat}
                  onChange={(e) => setForm((prev) => ({ ...prev, lat: e.target.value }))}
                  className="input"
                  placeholder="Ej. 21.123456"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase text-secondary-500">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={form.lng}
                  onChange={(e) => setForm((prev) => ({ ...prev, lng: e.target.value }))}
                  className="input"
                  placeholder="Ej. -101.654321"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Registrar petición'}
          </button>
        </form>
      </div>
    </div>
  );
}
