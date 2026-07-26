'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { opositoresApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import {
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  TrophyIcon,
  StarIcon,
} from '@heroicons/react/24/solid';
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

interface RedSocial {
  red: string;
  url?: string;
}

interface Opositor {
  id: string;
  tenant_id: string;
  nombre: string;
  partido?: string;
  foto_url?: string;
  nivel_rivalidad: number;
  redes_sociales?: RedSocial[];
  notas?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

const NIVELES: Record<number, { label: string; color: string; badge: string }> = {
  1: { label: 'Retador principal', color: '#DC2626', badge: 'bg-red-100 text-red-700' },
  2: { label: 'Segundo lugar', color: '#EA580C', badge: 'bg-orange-100 text-orange-700' },
  3: { label: 'Tercer lugar', color: '#D97706', badge: 'bg-amber-100 text-amber-700' },
};

const REDES_SOPORTADAS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E4405F' },
  { id: 'tiktok', label: 'TikTok', icon: Music2, color: '#000000' },
  { id: 'x', label: 'X / Twitter', icon: Twitter, color: '#0F1419' },
  { id: 'youtube', label: 'YouTube', icon: Youtube, color: '#FF0000' },
  { id: 'web', label: 'Sitio web', icon: Globe, color: '#2563EB' },
  { id: 'otro', label: 'Otro', icon: LinkIcon, color: '#64748B' },
];

function iconoRed(id: string) {
  return REDES_SOPORTADAS.find((r) => r.id === id) || REDES_SOPORTADAS[REDES_SOPORTADAS.length - 1];
}

function escaparHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function extraerNombrePaginaFacebook(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes('facebook.com') && !u.hostname.includes('fb.com')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return null;
    return parts[0];
  } catch {
    return null;
  }
}

function urlFacebookFeed(url?: string): string | null {
  if (!url) return null;
  const page = extraerNombrePaginaFacebook(url);
  if (!page) return null;
  const encoded = encodeURIComponent(`https://www.facebook.com/${page}`);
  return `https://www.facebook.com/plugins/page.php?href=${encoded}&tabs=timeline&width=500&height=700&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`;
}

export default function OpositoresPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [opositores, setOpositores] = useState<Opositor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Opositor | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    partido: '',
    foto_url: '',
    nivel_rivalidad: 1,
    redes_sociales: [] as RedSocial[],
    notas: '',
  });

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'opositores', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const { data } = await opositoresApi.getAll();
      setOpositores(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar opositores');
    } finally {
      setLoading(false);
    }
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm({
      nombre: '',
      partido: '',
      foto_url: '',
      nivel_rivalidad: 1,
      redes_sociales: [],
      notas: '',
    });
    setModalOpen(true);
  };

  const abrirEditar = (op: Opositor) => {
    setEditando(op);
    setForm({
      nombre: op.nombre,
      partido: op.partido || '',
      foto_url: op.foto_url || '',
      nivel_rivalidad: op.nivel_rivalidad,
      redes_sociales: op.redes_sociales?.length ? [...op.redes_sociales] : [],
      notas: op.notas || '',
    });
    setModalOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: form.nombre.trim(),
        partido: form.partido.trim() || undefined,
        foto_url: form.foto_url.trim() || undefined,
        nivel_rivalidad: Number(form.nivel_rivalidad),
        redes_sociales: form.redes_sociales
          .map((r) => ({ red: r.red.trim(), url: r.url?.trim() }))
          .filter((r) => r.red && r.url),
        notas: form.notas.trim() || undefined,
      };

      if (editando) {
        await opositoresApi.update(editando.id, payload);
      } else {
        await opositoresApi.create(payload);
      }
      setModalOpen(false);
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar opositor');
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este opositor?')) return;
    try {
      await opositoresApi.delete(id);
      await cargar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar opositor');
    }
  };

  const retador = useMemo(
    () => opositores.find((o) => o.nivel_rivalidad === 1) || opositores[0],
    [opositores]
  );
  const segundo = useMemo(
    () => opositores.find((o) => o.nivel_rivalidad === 2) || opositores[1],
    [opositores]
  );
  const tercero = useMemo(
    () => opositores.find((o) => o.nivel_rivalidad === 3) || opositores[2],
    [opositores]
  );

  const feed1 = urlFacebookFeed(retador?.redes_sociales?.find((r) => r.red === 'facebook')?.url);
  const feed2 = urlFacebookFeed(segundo?.redes_sociales?.find((r) => r.red === 'facebook')?.url);
  const feed3 = urlFacebookFeed(tercero?.redes_sociales?.find((r) => r.red === 'facebook')?.url);

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

  if (authLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Opositores</h2>
          <p className="text-secondary-500">
            Monitorea a tus rivales: retador principal, segundo y tercer lugar.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirCrear}
          className="btn-primary flex items-center gap-2 px-4 py-2"
        >
          <PlusIcon className="h-5 w-5" /> Agregar opositor
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tarjetas de opositores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opositores.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-secondary-300 bg-white p-8 text-center text-secondary-500">
            <UserGroupIcon className="mx-auto mb-3 h-10 w-10 text-secondary-300" />
            <p className="text-sm">No hay opositores registrados aún.</p>
            <button
              type="button"
              onClick={abrirCrear}
              className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Agrega el primero
            </button>
          </div>
        )}
        {opositores.map((op) => {
          const nivel = NIVELES[op.nivel_rivalidad] || NIVELES[1];
          const fb = op.redes_sociales?.find((r) => r.red === 'facebook')?.url;
          const otrasRedes = op.redes_sociales?.filter((r) => r.url?.trim()) || [];
          return (
            <div
              key={op.id}
              className="relative rounded-xl border border-secondary-200 bg-white p-5 shadow-sm"
            >
              <div className="absolute right-3 top-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => abrirEditar(op)}
                  className="rounded-md p-1.5 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700"
                  title="Editar"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(op.id)}
                  className="rounded-md p-1.5 text-secondary-400 hover:bg-red-50 hover:text-red-600"
                  title="Eliminar"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary-100 text-secondary-400">
                  {op.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={op.foto_url}
                      alt={op.nombre}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold">
                      {op.nombre
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${nivel.badge}`}>
                    <TrophyIcon className="h-3 w-3" /> {nivel.label}
                  </span>
                  <h3 className="mt-1 truncate text-lg font-bold text-secondary-900">
                    {op.nombre}
                  </h3>
                  {op.partido && (
                    <p className="text-sm text-secondary-600">{op.partido}</p>
                  )}
                  {otrasRedes.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {otrasRedes.map((r, idx) => {
                        const meta = iconoRed(r.red);
                        const Icon = meta.icon;
                        return (
                          <a
                            key={`${r.red}-${idx}`}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={meta.label}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition hover:opacity-80"
                            style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
                          >
                            <Icon className="h-3.5 w-3.5" /> {meta.label}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3].map((n) => (
                    <StarIcon
                      key={n}
                      className={`h-4 w-4 ${n <= op.nivel_rivalidad ? 'text-amber-400' : 'text-secondary-200'}`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-secondary-500">
                  Rivalidad {op.nivel_rivalidad}/3
                </span>
              </div>

              {op.notas && (
                <p className="mt-3 border-t border-secondary-100 pt-2 text-xs text-secondary-500">
                  {op.notas}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Feeds de Facebook: solo los 3 primeros lugares */}
      {(retador || segundo || tercero) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {retador && (
            <FeedBox
              opositor={retador}
              feed={feed1}
              etiqueta="Retador principal"
              colorClase="bg-red-100 text-red-700"
            />
          )}
          {segundo && (
            <FeedBox
              opositor={segundo}
              feed={feed2}
              etiqueta="Segundo lugar"
              colorClase="bg-orange-100 text-orange-700"
            />
          )}
          {tercero && (
            <FeedBox
              opositor={tercero}
              feed={feed3}
              etiqueta="Tercer lugar"
              colorClase="bg-amber-100 text-amber-700"
            />
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary-900">
                {editando ? 'Editar opositor' : 'Agregar opositor'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md p-1 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-700"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. María López"
                  required
                />
              </div>

              <div>
                <label className="label">Partido / Coalición</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.partido}
                  onChange={(e) => setForm((f) => ({ ...f, partido: e.target.value }))}
                  placeholder="Ej. PAN, MORENA, PRI"
                />
              </div>

              <div>
                <label className="label">Fotografía (URL o base64)</label>
                <input
                  type="text"
                  className="input w-full"
                  value={form.foto_url}
                  onChange={(e) => setForm((f) => ({ ...f, foto_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="label">Nivel de rivalidad *</label>
                <select
                  className="input w-full"
                  value={form.nivel_rivalidad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nivel_rivalidad: Number(e.target.value) }))
                  }
                >
                  <option value={1}>1 - Retador principal</option>
                  <option value={2}>2 - Segundo lugar</option>
                  <option value={3}>3 - Tercer lugar</option>
                </select>
              </div>

              <div>
                <label className="label">Redes sociales</label>
                <p className="mb-2 text-xs text-secondary-500">
                  Agrega Facebook, Instagram, TikTok, X, YouTube, sitio web u otra liga. La de Facebook se usará para el feed embebido.
                </p>
                <div className="space-y-2">
                  {form.redes_sociales.map((r, index) => {
                    const meta = iconoRed(r.red);
                    const Icon = meta.icon;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <select
                          className="input shrink-0 w-[140px]"
                          value={r.red}
                          onChange={(e) => actualizarRed(index, 'red', e.target.value)}
                        >
                          {REDES_SOPORTADAS.map((red) => (
                            <option key={red.id} value={red.id}>{red.label}</option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Icon
                            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                            style={{ color: meta.color }}
                          />
                          <input
                            type="url"
                            className="input w-full pl-9"
                            value={r.url}
                            onChange={(e) => actualizarRed(index, 'url', e.target.value)}
                            placeholder={`https://${r.red === 'web' ? 'sitio.com' : r.red + '.com/usuario'}`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarRed(index)}
                          className="rounded-md p-2 text-secondary-400 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar red"
                        >
                          <TrashIconLucide className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={agregarRed}
                    className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50"
                  >
                    <PlusIconLucide className="h-3.5 w-3.5" /> Agregar red social
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Notas</label>
                <textarea
                  className="input w-full min-h-[80px]"
                  value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  placeholder="Observaciones internas..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary px-4 py-2"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary px-4 py-2">
                  {editando ? 'Guardar cambios' : 'Crear opositor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

function FeedBox({
  opositor,
  feed,
  etiqueta,
  colorClase,
}: {
  opositor: Opositor;
  feed: string | null;
  etiqueta: string;
  colorClase: string;
}) {
  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-bold text-secondary-900">Feed de {opositor.nombre}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClase}`}>{etiqueta}</span>
      </div>
      {feed ? (
        <iframe
          src={feed}
          width="100%"
          height="700"
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling="no"
          frameBorder="0"
          allowFullScreen
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
          title={`Facebook ${opositor.nombre}`}
        />
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg bg-secondary-50 text-secondary-500">
          <Facebook className="mb-2 h-8 w-8 text-secondary-300" />
          <p className="text-sm">Sin URL de Facebook configurada</p>
        </div>
      )}
    </div>
  );
}

}
