'use client';

import { useEffect, useState } from 'react';
import { lideresApi, votantesApi } from '@/lib/api';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (id: string, lat?: number, lng?: number) => void;
  coordenadasIniciales?: { lat: number; lng: number } | null;
}

export default function NuevoLiderModal({ abierto, onCerrar, onExito, coordenadasIniciales }: Props) {
  const [tenantId, setTenantId] = useState('');
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    seccion_electoral: '',
    colonia: '',
    lider_padre_id: '',
    alcance_estimado: '100',
    lat: '',
    lng: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const t = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (t) setTenantId(t);
    loadLideres();
    setError(null);

    if (coordenadasIniciales) {
      setForm((f) => ({
        ...f,
        lat: coordenadasIniciales.lat.toFixed(6),
        lng: coordenadasIniciales.lng.toFixed(6),
      }));
    } else {
      setForm((f) => ({ ...f, lat: '', lng: '' }));
    }
  }, [abierto, coordenadasIniciales]);

  const loadLideres = async () => {
    try {
      const res = await lideresApi.getAll();
      setLideres((res.data || []).filter((l: Lider) => l.activo));
    } catch {}
  };

  const reset = () => {
    setForm({
      nombre: '',
      telefono: '',
      seccion_electoral: '',
      colonia: '',
      lider_padre_id: '',
      alcance_estimado: '100',
      lat: coordenadasIniciales?.lat.toFixed(6) || '',
      lng: coordenadasIniciales?.lng.toFixed(6) || '',
    });
    setError(null);
  };

  const usarUbicacion = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setError('No se pudo obtener la ubicación. Ingresa manualmente las coordenadas.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!tenantId) throw new Error('No se detectó el tenant. Vuelve a iniciar sesión.');
      if (!form.nombre.trim()) throw new Error('El nombre es requerido.');
      if (!form.lat || !form.lng) {
        throw new Error('Se requieren coordenadas para mostrar al líder en el mapa. Haz clic en el mapa o usa "Usar mi ubicación".');
      }

      const votanteData: any = {
        tenant_id: tenantId,
        nombre: form.nombre,
        telefono: form.telefono,
        seccion_electoral: form.seccion_electoral,
        colonia: form.colonia,
        es_lider: true,
        activo: true,
      };

      if (form.lat && form.lng) {
        votanteData.coordenadas = { lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
      }

      const votanteRes = await votantesApi.create(votanteData);
      const votanteId = votanteRes.data?.id;
      if (!votanteId) throw new Error('No se pudo crear el votante base.');

      const liderData: any = {
        tenant_id: tenantId,
        votante_id: votanteId,
        alcance_estimado: parseInt(form.alcance_estimado, 10) || 100,
        score: 0,
      };
      if (form.lider_padre_id) liderData.lider_padre_id = form.lider_padre_id;

      const liderRes = await lideresApi.create(liderData);
      reset();
      onExito(liderRes.data?.id, votanteData.coordenadas?.lat, votanteData.coordenadas?.lng);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al crear líder');
    } finally {
      setLoading(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Nuevo líder territorial</h2>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nombre completo *</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="input"
                placeholder="Ej. María González"
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="input"
                placeholder="477 000 0000"
              />
            </div>
            <div>
              <label className="label">Sección electoral</label>
              <input
                type="text"
                value={form.seccion_electoral}
                onChange={(e) => setForm({ ...form, seccion_electoral: e.target.value })}
                className="input"
                placeholder="Ej. 0123"
                maxLength={4}
              />
            </div>
            <div>
              <label className="label">Colonia</label>
              <input
                type="text"
                value={form.colonia}
                onChange={(e) => setForm({ ...form, colonia: e.target.value })}
                className="input"
                placeholder="Ej. Jardines del Moral"
              />
            </div>
          </div>

          <div>
            <label className="label">Líder padre (opcional)</label>
            <select
              value={form.lider_padre_id}
              onChange={(e) => setForm({ ...form, lider_padre_id: e.target.value })}
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

          <div>
            <label className="label">Alcance estimado (personas)</label>
            <input
              type="number"
              min={1}
              value={form.alcance_estimado}
              onChange={(e) => setForm({ ...form, alcance_estimado: e.target.value })}
              className="input"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="label">Ubicación geográfica *</label>
              <button
                type="button"
                onClick={usarUbicacion}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Usar mi ubicación
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                step="any"
                placeholder="Latitud"
                value={form.lat}
                onChange={(e) => setForm({ ...form, lat: e.target.value })}
                className="input"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitud"
                value={form.lng}
                onChange={(e) => setForm({ ...form, lng: e.target.value })}
                className="input"
              />
            </div>
            <p className="text-xs text-secondary-500">
              Sin coordenadas el líder se guarda pero no aparece en el mapa. Se toman del punto donde hiciste clic; también puedes usar "Usar mi ubicación" o escribirlas.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !form.lat || !form.lng}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar líder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
