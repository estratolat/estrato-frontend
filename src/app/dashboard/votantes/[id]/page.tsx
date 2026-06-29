'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { votantesApi } from '@/lib/api';
import { Votante } from '@/types';

export default function VotanteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [votante, setVotante] = useState<Votante | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    colonia: '',
    municipio: '',
    seccion_electoral: '',
    nivel_apoyo: 3,
    tags: '',
    origen_qr: '',
    activo: true,
  });

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadVotante();
  }, [id, router]);

  const loadVotante = async () => {
    try {
      setLoading(true);
      const { data } = await votantesApi.getOne(id);
      setVotante(data);
      setFormData({
        nombre: data.nombre || '',
        telefono: data.telefono || '',
        email: data.email || '',
        colonia: data.colonia || '',
        municipio: data.municipio || '',
        seccion_electoral: data.seccion_electoral || '',
        nivel_apoyo: data.nivel_apoyo || 3,
        tags: (data.tags || []).join(', '),
        origen_qr: data.origen_qr || '',
        activo: data.activo ?? true,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar votante');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? (e.target as HTMLInputElement).checked
          : name === 'nivel_apoyo'
          ? parseInt(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      await votantesApi.update(id, payload);
      setSuccess('Votante actualizado correctamente.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar votante');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!votante && !loading) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600 mb-4">Votante no encontrado.</p>
        <Link href="/dashboard/votantes" className="btn-primary">
          Volver al listado
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Detalle del Votante</h2>
        <p className="text-gray-600">Edita la información del simpatizante</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="nombre" className="label">
              Nombre completo
            </label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="telefono" className="label">
              WhatsApp
            </label>
            <input
              id="telefono"
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="email" className="label">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="juan@ejemplo.com"
            />
            <p className="mt-1 text-xs text-secondary-500">Opcional. Se usará para campañas de mailing.</p>
          </div>

          <div>
            <label htmlFor="colonia" className="label">
              Colonia
            </label>
            <input
              id="colonia"
              type="text"
              name="colonia"
              value={formData.colonia}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="municipio" className="label">
              Municipio
            </label>
            <input
              id="municipio"
              type="text"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="seccion_electoral" className="label">
              Sección Electoral
            </label>
            <input
              id="seccion_electoral"
              type="text"
              name="seccion_electoral"
              value={formData.seccion_electoral}
              onChange={handleChange}
              className="input"
              maxLength={4}
            />
          </div>

          <div>
            <label htmlFor="nivel_apoyo" className="label">
              Nivel de Apoyo
            </label>
            <select
              id="nivel_apoyo"
              name="nivel_apoyo"
              value={formData.nivel_apoyo}
              onChange={handleChange}
              className="input"
            >
              <option value={1}>1 - Opuesto</option>
              <option value={2}>2 - Indeciso frío</option>
              <option value={3}>3 - Indeciso</option>
              <option value={4}>4 - Simpatizante</option>
              <option value={5}>5 - Voluntario</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="tags" className="label">
              Tags (separados por coma)
            </label>
            <input
              id="tags"
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="input"
              placeholder="voluntario, eventos, donador"
            />
          </div>

          <div>
            <label htmlFor="origen_qr" className="label">
              Origen
            </label>
            <input
              id="origen_qr"
              type="text"
              name="origen_qr"
              value={formData.origen_qr}
              onChange={handleChange}
              className="input"
              readOnly
            />
          </div>

          <div className="flex items-center">
            <input
              id="activo"
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <label htmlFor="activo" className="ml-2 text-sm text-gray-700">
              Activo
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <Link href="/dashboard/votantes" className="btn-secondary">
            Volver
          </Link>
        </div>
      </form>
    </div>
  );
}
