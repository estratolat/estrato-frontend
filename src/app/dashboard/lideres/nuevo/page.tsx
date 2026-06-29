'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lideresApi, votantesApi } from '@/lib/api';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';

export default function NuevoLiderPage() {
  const router = useRouter();
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const t = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    if (t) setTenantId(t);
    loadLideres();
  }, [router]);

  const loadLideres = async () => {
    try {
      const res = await lideresApi.getAll();
      setLideres((res.data || []).filter((l: Lider) => l.activo));
    } catch {}
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
      router.push(`/dashboard/lideres/${liderRes.data?.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al crear líder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/dashboard/lideres')}
          className="rounded-full p-2 text-secondary-500 hover:bg-secondary-100"
        >
          <Icon name="mapa" size={20} />
        </button>
        <h1 className="text-2xl font-bold text-secondary-900">Nuevo líder territorial</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Nombre completo</label>
            <input
              type="text"
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Teléfono</label>
            <input
              type="tel"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Sección electoral</label>
            <input
              type="text"
              value={form.seccion_electoral}
              onChange={(e) => setForm({ ...form, seccion_electoral: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label">Colonia</label>
            <input
              type="text"
              value={form.colonia}
              onChange={(e) => setForm({ ...form, colonia: e.target.value })}
              className="input"
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
            <label className="label">Ubicación geográfica</label>
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
            Si no ingresas coordenadas, podrás asignarlas después desde el detalle del líder.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push('/dashboard/lideres')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar líder'}
          </button>
        </div>
      </form>
    </div>
  );
}
