'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { votantesApi } from '@/lib/api';

export default function NuevoVotantePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    colonia: '',
    seccion_electoral: '',
    municipio: '',
    nivel_apoyo: 3,
    tags: '',
    origen_qr: 'panel-admin',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'nivel_apoyo' ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      await votantesApi.create(payload);
      router.push('/dashboard/votantes');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear votante');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Nuevo Votante</h2>
        <p className="text-gray-600">Registra un nuevo simpatizante</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card max-w-2xl space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="nombre" className="label">Nombre completo</label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input"
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div>
            <label htmlFor="telefono" className="label">WhatsApp</label>
            <input
              id="telefono"
              type="tel"
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="input"
              placeholder="+52 123 456 7890"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="email" className="label">Correo electrónico</label>
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
            <label htmlFor="colonia" className="label">Colonia</label>
            <input
              id="colonia"
              type="text"
              name="colonia"
              value={formData.colonia}
              onChange={handleChange}
              className="input"
              placeholder="Centro"
            />
          </div>

          <div>
            <label htmlFor="municipio" className="label">Municipio</label>
            <input
              id="municipio"
              type="text"
              name="municipio"
              value={formData.municipio}
              onChange={handleChange}
              className="input"
              placeholder="León"
            />
          </div>

          <div>
            <label htmlFor="seccion_electoral" className="label">Sección Electoral</label>
            <input
              id="seccion_electoral"
              type="text"
              name="seccion_electoral"
              value={formData.seccion_electoral}
              onChange={handleChange}
              className="input"
              placeholder="0001"
              maxLength={4}
            />
          </div>

          <div>
            <label htmlFor="nivel_apoyo" className="label">Nivel de Apoyo</label>
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
            <label htmlFor="tags" className="label">Tags (separados por coma)</label>
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
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar Votante'}
          </button>
          <Link href="/dashboard/votantes" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
