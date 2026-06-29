'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { candidatoApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import VideoUploader from '@/components/candidato/VideoUploader';
import HuellaPanel from '@/components/candidato/HuellaPanel';

export default function CandidatoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [form, setForm] = useState({
    nombre: '',
    biografia: '',
    gustos: '',
    discurso: '',
    video_url: '',
    video_transcripcion: '',
  });
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'candidato', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadPerfil();
  }, []);

  const loadPerfil = async () => {
    try {
      const { data } = await candidatoApi.getPerfil();
      if (data) {
        setPerfil(data);
        setForm({
          nombre: data.nombre || '',
          biografia: data.biografia || '',
          gustos: data.gustos || '',
          discurso: data.discurso || '',
          video_url: data.video_url || '',
          video_transcripcion: data.video_transcripcion || '',
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar perfil');
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const guardar = async () => {
    try {
      setSaving(true);
      setError('');
      const { data } = await candidatoApi.upsertPerfil(form);
      setPerfil(data);
      setMessage('Perfil guardado correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar perfil');
    } finally {
      setSaving(false);
    }
  };

  const analizar = async (conTranscripcion = false) => {
    try {
      setAnalyzing(true);
      setError('');
      if (conTranscripcion) {
        setTranscribing(true);
      }
      const { data } = await candidatoApi.analizar(conTranscripcion);
      setPerfil(data);
      setMessage('Análisis completado');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al analizar');
    } finally {
      setAnalyzing(false);
      setTranscribing(false);
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
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-800">Perfil del Candidato</h2>
        <p className="text-secondary-500">Define quién es el candidato, su discurso y su video para que la IA aprenda su voz.</p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-secondary-200 bg-white p-5">
            <h3 className="mb-4 text-lg font-bold text-secondary-800">Información base</h3>
            <div className="grid gap-4">
              <div>
                <label className="label">Nombre del candidato</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="label">Biografía / Trayectoria</label>
                <textarea
                  className="input w-full min-h-[100px]"
                  value={form.biografia}
                  onChange={(e) => handleChange('biografia', e.target.value)}
                  placeholder="Breve biografía que ayude a la IA a conocerlo..."
                />
              </div>
              <div>
                <label className="label">Gustos, hobbies, datos personales</label>
                <textarea
                  className="input w-full min-h-[80px]"
                  value={form.gustos}
                  onChange={(e) => handleChange('gustos', e.target.value)}
                  placeholder="Gustos que puedan humanizar el contenido..."
                />
              </div>
              <div>
                <label className="label">Discurso de referencia</label>
                <textarea
                  className="input w-full min-h-[180px]"
                  value={form.discurso}
                  onChange={(e) => handleChange('discurso', e.target.value)}
                  placeholder="Pega aquí un discurso largo o varios textos del candidato. Entre más palabras propias, mejor será el análisis..."
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-secondary-200 bg-white p-5">
            <h3 className="mb-4 text-lg font-bold text-secondary-800">Video del candidato</h3>
            <VideoUploader value={form.video_url} onChange={(v) => handleChange('video_url', v)} />
            <div className="mt-4">
              <label className="label">Transcripción del video</label>
              <textarea
                className="input w-full min-h-[120px]"
                value={form.video_transcripcion}
                onChange={(e) => handleChange('video_transcripcion', e.target.value)}
                placeholder="Pega aquí la transcripción manualmente, o usa el botón de transcribir automáticamente (requiere OPENAI_API_KEY)."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="btn-primary px-6 py-2.5 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar perfil'}
            </button>
            <button
              type="button"
              onClick={() => analizar(false)}
              disabled={analyzing}
              className="btn-secondary px-6 py-2.5 disabled:opacity-60"
            >
              {analyzing ? 'Analizando...' : 'Analizar con IA'}
            </button>
            {form.video_url && (
              <button
                type="button"
                onClick={() => analizar(true)}
                disabled={analyzing}
                className="btn-secondary px-6 py-2.5 disabled:opacity-60"
              >
                {transcribing ? 'Transcribiendo...' : 'Transcribir video y analizar'}
              </button>
            )}
          </div>        </div>

        <div className="space-y-6">
          <HuellaPanel perfil={perfil} />
        </div>
      </div>
    </div>
  );
}
