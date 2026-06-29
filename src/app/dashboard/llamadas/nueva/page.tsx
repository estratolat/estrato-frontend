'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { llamadasApi } from '@/lib/api';

export default function NuevaCampanaPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    script: '',
    assistant_id: '',
    phone_number_id: '',
    voz_id_elevenlabs: '',
    status: 'borrador',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'llamadas', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await llamadasApi.createCampana(form);
      router.push('/dashboard/llamadas');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear campaña');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-2 text-2xl font-bold text-secondary-800">Nueva campaña de llamadas</h2>
      <p className="mb-6 text-secondary-500">Configura la campaña y luego importa votantes.</p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={guardar} className="space-y-4 rounded-xl border border-secondary-200 bg-white p-6">
        <div>
          <label className="label">Nombre *</label>
          <input
            type="text"
            className="input w-full"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Descripción</label>
          <input
            type="text"
            className="input w-full"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </div>
        <div>
          <label className="label">ID del Asistente</label>
          <input
            type="text"
            className="input w-full"
            value={form.assistant_id}
            onChange={(e) => setForm({ ...form, assistant_id: e.target.value })}
            placeholder="Ej. asst_123456..."
          />
        </div>
        <div>
          <label className="label">ID del Número Saliente</label>
          <input
            type="text"
            className="input w-full"
            value={form.phone_number_id}
            onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
            placeholder="Ej. pn_123456..."
          />
        </div>
        <div>
          <label className="label">Voice ID ElevenLabs</label>
          <input
            type="text"
            className="input w-full"
            value={form.voz_id_elevenlabs}
            onChange={(e) => setForm({ ...form, voz_id_elevenlabs: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Script / Prompt</label>
          <textarea
            rows={4}
            className="input w-full"
            value={form.script}
            onChange={(e) => setForm({ ...form, script: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/llamadas')}
            className="rounded-md bg-secondary-100 px-4 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? 'Creando...' : 'Crear campaña'}
          </button>
        </div>
      </form>
    </div>
  );
}
