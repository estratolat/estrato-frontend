'use client';

import { useEffect, useState } from 'react';
import { votantesApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

const NIVELES = [
  { value: 5, label: '5 - Muy probable' },
  { value: 4, label: '4 - Probable' },
  { value: 3, label: '3 - Indeciso' },
  { value: 2, label: '2 - Poco probable' },
  { value: 1, label: '1 - Opuesto' },
];

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (id: string, lat?: number, lng?: number) => void;
  coordenadasIniciales?: { lat: number; lng: number } | null;
}

export default function NuevoVotanteModal({ abierto, onCerrar, onExito, coordenadasIniciales }: Props) {
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    seccion_electoral: '',
    colonia: '',
    municipio: '',
    nivel_apoyo: '3',
    tags: '',
    lat: '',
    lng: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setForm((prev) => ({
      ...prev,
      nombre: '',
      telefono: '',
      seccion_electoral: '',
      colonia: '',
      municipio: '',
      nivel_apoyo: '3',
      tags: '',
      lat: coordenadasIniciales?.lat.toFixed(6) || '',
      lng: coordenadasIniciales?.lng.toFixed(6) || '',
    }));
  }, [abierto, coordenadasIniciales]);

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
      const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
      if (!tenantId) throw new Error('No se detectó el tenant. Vuelve a iniciar sesión.');
      if (!form.nombre.trim()) throw new Error('El nombre es requerido.');
      if (!form.lat || !form.lng) {
        throw new Error('Se requieren coordenadas para mostrar al votante en el mapa.');
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
        origen_qr: 'mapa',
        activo: true,
      };

      payload.coordenadas = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };

      const res = await votantesApi.create(payload);
      onExito(res.data?.id, payload.coordenadas.lat, payload.coordenadas.lng);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al guardar votante';
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
          <h2 className="text-lg font-bold text-secondary-900">Nuevo votante / simpatizante</h2>
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
            {loading ? 'Guardando...' : 'Guardar votante'}
          </button>
        </form>
      </div>
    </div>
  );
}
