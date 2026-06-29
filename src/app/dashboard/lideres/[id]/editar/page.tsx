'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { lideresApi, votantesApi } from '@/lib/api';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';
import LiderMap from '@/components/lideres/LiderMap';

export default function EditarLiderPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [lider, setLider] = useState<Lider | null>(null);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    seccion_electoral: '',
    colonia: '',
    lider_padre_id: '',
    alcance_estimado: '100',
    score: '0',
    lat: '',
    lng: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [id, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [liderRes, lideresRes] = await Promise.all([lideresApi.getOne(id), lideresApi.getAll()]);
      const l = liderRes.data as Lider;
      setLider(l);
      setLideres((lideresRes.data || []).filter((x: Lider) => x.activo && x.id !== id));
      const v = l.votante;
      const c = v?.coordenadas;
      setForm({
        nombre: v?.nombre || '',
        telefono: v?.telefono || '',
        seccion_electoral: v?.seccion_electoral || '',
        colonia: v?.colonia || '',
        lider_padre_id: l.lider_padre_id || '',
        alcance_estimado: String(l.alcance_estimado || 100),
        score: String(l.score || 0),
        lat: c ? String(c.lat) : '',
        lng: c ? String(c.lng) : '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar líder');
    } finally {
      setLoading(false);
    }
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
      () => setError('No se pudo obtener la ubicación.')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lider) return;
    setError(null);
    setSaving(true);

    try {
      const coordenadas = form.lat && form.lng
        ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
        : null;

      await votantesApi.update(lider.votante_id, {
        nombre: form.nombre,
        telefono: form.telefono,
        seccion_electoral: form.seccion_electoral,
        colonia: form.colonia,
        coordenadas,
      });

      const liderData: any = {
        alcance_estimado: parseInt(form.alcance_estimado, 10) || 100,
        score: parseInt(form.score, 10) || 0,
      };
      if (form.lider_padre_id) liderData.lider_padre_id = form.lider_padre_id;
      else liderData.lider_padre_id = null;

      await lideresApi.update(id, liderData);
      router.push(`/dashboard/lideres/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Desactivar este líder?')) return;
    try {
      await lideresApi.delete(id);
      router.push('/dashboard/lideres');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al desactivar');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Link href={`/dashboard/lideres/${id}`} className="rounded-full p-2 text-secondary-500 hover:bg-secondary-100">
          <Icon name="mapa" size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-secondary-900">Editar líder territorial</h1>
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Líder padre</label>
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
            <label className="label">Score</label>
            <input
              type="number"
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
              className="input"
            />
          </div>
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
          {form.lat && form.lng && (
            <LiderMap
              lat={parseFloat(form.lat)}
              lng={parseFloat(form.lng)}
              nombre={form.nombre || 'Nueva ubicación'}
              radioM={Math.min(parseInt(form.alcance_estimado, 10) * 8, 2000)}
              color="#D73216"
              height="240px"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button type="button" onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700">
            Desactivar líder
          </button>
          <div className="flex gap-3">
            <Link href={`/dashboard/lideres/${id}`} className="btn-secondary">
              Cancelar
            </Link>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
