'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { candidatoApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import VideoUploader from '@/components/candidato/VideoUploader';
import HuellaPanel from '@/components/candidato/HuellaPanel';
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  Music2,
  Link as LinkIcon,
  PlusIcon as PlusIconLucide,
  TrashIcon as TrashIconLucide,
} from 'lucide-react';

export default function CandidatoPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [perfil, setPerfil] = useState<any>(null);
  const [form, setForm] = useState({
    nombre: '',
    nombre_publico: '',
    cargo: '',
    email: '',
    foto_url: '',
    redes_sociales: [] as { red: string; url?: string }[],
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

  const REDES_SOPORTADAS = [
    { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
    { id: 'tiktok', label: 'TikTok', icon: Music2, color: '#000000' },
    { id: 'x', label: 'X / Twitter', icon: Twitter, color: '#0F1419' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
    { id: 'web', label: 'Sitio web', icon: Globe, color: '#2563EB' },
    { id: 'otro', label: 'Otro', icon: LinkIcon, color: '#64748B' },
  ];

  const iconoRed = (id: string) =>
    REDES_SOPORTADAS.find((r) => r.id === id) || REDES_SOPORTADAS[REDES_SOPORTADAS.length - 1];

  const actualizarRed = (index: number, campo: 'red' | 'url', valor: string) => {
    setForm((f) => {
      const next = [...f.redes_sociales];
      next[index] = { ...next[index], [campo]: valor };
      return { ...f, redes_sociales: next };
    });
  };

  const agregarRed = () => {
    setForm((f) => ({
      ...f,
      redes_sociales: [...f.redes_sociales, { red: 'otro', url: '' }],
    }));
  };

  const eliminarRed = (index: number) => {
    setForm((f) => ({
      ...f,
      redes_sociales: f.redes_sociales.filter((_, i) => i !== index),
    }));
  };

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
          nombre_publico: data.nombre_publico || '',
          cargo: data.cargo || '',
          email: data.email || '',
          foto_url: data.foto_url || '',
          redes_sociales: Array.isArray(data.redes_sociales) ? [...data.redes_sociales] : [],
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
      const payload = {
        ...form,
        redes_sociales: form.redes_sociales
          .map((r) => ({ red: r.red.trim(), url: r.url?.trim() }))
          .filter((r) => r.red && r.url),
      };
      const { data } = await candidatoApi.upsertPerfil(payload);
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
          <FichaCandidato
            perfil={perfil}
            form={form}
            setForm={setForm}
            onGuardar={guardar}
            saving={saving}
            REDES_SOPORTADAS={REDES_SOPORTADAS}
            iconoRed={iconoRed}
            actualizarRed={actualizarRed}
            agregarRed={agregarRed}
            eliminarRed={eliminarRed}
          />
          <HuellaPanel perfil={perfil} />
        </div>
      </div>
    </div>
  );
}

function FichaCandidato({
  perfil,
  form,
  setForm,
  onGuardar,
  saving,
  REDES_SOPORTADAS,
  iconoRed,
  actualizarRed,
  agregarRed,
  eliminarRed,
}: {
  perfil: any;
  form: any;
  setForm: any;
  onGuardar: () => void;
  saving: boolean;
  REDES_SOPORTADAS: any[];
  iconoRed: (id: string) => any;
  actualizarRed: (index: number, campo: 'red' | 'url', valor: string) => void;
  agregarRed: () => void;
  eliminarRed: (index: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const iniciales = (perfil?.nombre || form.nombre || 'C')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const redes = Array.isArray(form?.redes_sociales) ? form.redes_sociales.filter((r: any) => r?.url?.trim()) : [];

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="font-bold text-secondary-800">Ficha del candidato</h4>
        <button
          type="button"
          onClick={() => editando ? setEditando(false) : setEditando(true)}
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          {editando ? 'Cancelar' : 'Editar ficha'}
        </button>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-primary-100 bg-secondary-100 text-secondary-400">
          {(form?.foto_url || perfil?.foto_url) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.foto_url || perfil?.foto_url} alt={form.nombre || perfil?.nombre || 'Candidato'} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold">{iniciales}</span>
          )}
        </div>

        {editando ? (
          <div className="w-full space-y-3">
            <div className="text-left">
              <label className="label">Nombre</label>
              <input
                type="text"
                className="input w-full"
                value={form.nombre}
                onChange={(e) => setForm((f: any) => ({ ...f, nombre: e.target.value }))}
                placeholder="Nombre completo"
              />
            </div>
            <div className="text-left">
              <label className="label">Nombre público</label>
              <input
                type="text"
                className="input w-full"
                value={form.nombre_publico}
                onChange={(e) => setForm((f: any) => ({ ...f, nombre_publico: e.target.value }))}
                placeholder="Alias"
              />
            </div>
            <div className="text-left">
              <label className="label">Cargo</label>
              <input
                type="text"
                className="input w-full"
                value={form.cargo}
                onChange={(e) => setForm((f: any) => ({ ...f, cargo: e.target.value }))}
                placeholder="Cargo que busca"
              />
            </div>
            <div className="text-left">
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input w-full"
                value={form.email}
                onChange={(e) => setForm((f: any) => ({ ...f, email: e.target.value }))}
                placeholder="contacto@candidato.com"
              />
            </div>
            <div className="text-left">
              <label className="label">Fotografía (URL o base64)</label>
              <input
                type="text"
                className="input w-full"
                value={form.foto_url}
                onChange={(e) => setForm((f: any) => ({ ...f, foto_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold text-secondary-900">
              {perfil?.nombre_publico || perfil?.nombre || 'Candidato'}
            </h3>
            {(perfil?.nombre_publico && perfil?.nombre) && (
              <p className="text-sm text-secondary-500">{perfil.nombre}</p>
            )}
            {perfil?.cargo && (
              <p className="mt-1 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                {perfil.cargo}
              </p>
            )}
            {perfil?.email && (
              <a
                href={`mailto:${perfil.email}`}
                className="mt-2 text-xs text-secondary-500 hover:text-primary-600"
              >
                {perfil.email}
              </a>
            )}
          </>
        )}
      </div>

      <div className="mt-5 border-t border-secondary-100 pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-500">Redes sociales</p>
        {editando ? (
          <div className="space-y-2">
            {form.redes_sociales.map((r: any, index: number) => {
              const meta = iconoRed(r.red);
              const Icon = meta.icon;
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    className="input shrink-0 w-[130px] text-xs"
                    value={r.red}
                    onChange={(e) => actualizarRed(index, 'red', e.target.value)}
                  >
                    {REDES_SOPORTADAS.map((red) => (
                      <option key={red.id} value={red.id}>{red.label}</option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Icon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: meta.color }} />
                    <input
                      type="url"
                      className="input w-full pl-7 text-xs"
                      value={r.url}
                      onChange={(e) => actualizarRed(index, 'url', e.target.value)}
                      placeholder={`https://${r.red === 'web' ? 'sitio.com' : r.red + '.com/usuario'}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => eliminarRed(index)}
                    className="rounded-md p-1.5 text-secondary-400 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar red"
                  >
                    <TrashIconLucide className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={agregarRed}
              className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50"
            >
              <PlusIconLucide className="h-3.5 w-3.5" /> Agregar red
            </button>
          </div>
        ) : (
          redes.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {redes.map((r: any, idx: number) => {
                const meta = REDES_SOPORTADAS.find((x) => x.id === r.red) || REDES_SOPORTADAS[REDES_SOPORTADAS.length - 1];
                const Icon = meta.icon;
                return (
                  <a
                    key={`${r.red}-${idx}`}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={meta.label}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition hover:opacity-80"
                    style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                  >
                    <Icon className="h-4 w-4" /> {meta.label}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-xs text-secondary-400">Sin redes sociales</p>
          )
        )}
      </div>

      {editando && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onGuardar();
              setEditando(false);
            }}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {saving ? 'Guardando...' : 'Guardar ficha'}
          </button>
        </div>
      )}
    </div>
  );
}