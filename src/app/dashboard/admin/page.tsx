'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';

interface Project {
  id: string;
  slug: string;
  nombre_candidato: string;
  cargo_busca?: string;
  slogan?: string;
  plan: string;
  activo: boolean;
  created_at: string;
  stats: {
    usuarios: number;
    votantes: number;
    lideres: number;
    eventos: number;
  };
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    nombre_candidato: '',
    cargo_busca: '',
    slogan: '',
    owner_email: '',
    owner_nombre: '',
    owner_password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{
    tenant: Project;
    owner: { email: string; nombre: string | null; rol: string };
    owner_password?: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && user && user.rol !== 'superadmin') {
      router.replace('/dashboard');
      return;
    }
    if (!loading && user) {
      loadProjects();
    }
  }, [user, loading, router]);

  const loadProjects = async () => {
    try {
      setLoadingData(true);
      setError('');
      const { data } = await adminApi.getProjects();
      setProjects(data || []);
    } catch (err: any) {
      setError(errorToString(err) || 'Error al cargar proyectos');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.nombre_candidato || !form.owner_email || !form.owner_nombre || !form.owner_password) {
      setError('Completa todos los campos obligatorios');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const { data } = await adminApi.createProject(form);
      setCreated({ ...data, owner_password: form.owner_password });
      setShowModal(false);
      setForm({
        slug: '',
        nombre_candidato: '',
        cargo_busca: '',
        slogan: '',
        owner_email: '',
        owner_nombre: '',
        owner_password: '',
      });
      loadProjects();
    } catch (err: any) {
      setError(errorToString(err) || 'Error al crear el proyecto');
    } finally {
      setSubmitting(false);
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  if (loading || loadingData) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user || user.rol !== 'superadmin') {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-secondary-500 hover:text-primary-600">
            ← Volver al dashboard
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-secondary-800">Panel Central de Proyectos</h2>
          <p className="text-secondary-500">Crea y administra proyectos aislados de ESTRATO.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Icon name="plus" size={18} />
          Nuevo proyecto
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {created && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Proyecto creado correctamente</p>
          <div className="mt-2 space-y-1">
            <p>
              <span className="font-medium">Slug:</span> {created.tenant.slug}
            </p>
            <p>
              <span className="font-medium">Candidato:</span> {created.tenant.nombre_candidato}
            </p>
            <p>
              <span className="font-medium">Owner:</span> {created.owner.email}
            </p>
            <p>
              <span className="font-medium">Contraseña:</span>{' '}
              <span className="rounded bg-white px-2 py-0.5 font-mono">{created.owner_password}</span>
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setCreated(null)}
              className="rounded bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-secondary-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 text-left text-xs font-semibold uppercase text-secondary-600">
              <tr>
                <th className="px-4 py-3">Proyecto</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Usuarios</th>
                <th className="px-4 py-3">Votantes</th>
                <th className="px-4 py-3">Eventos</th>
                <th className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-secondary-500">
                    No hay proyectos creados todavía.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-secondary-900">{p.nombre_candidato}</p>
                      {p.cargo_busca && <p className="text-xs text-secondary-500">{p.cargo_busca}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-secondary-600">{p.slug}</td>
                    <td className="px-4 py-3 capitalize">{p.plan}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{p.stats.usuarios}</td>
                    <td className="px-4 py-3">{p.stats.votantes}</td>
                    <td className="px-4 py-3">{p.stats.eventos}</td>
                    <td className="px-4 py-3 text-secondary-500">
                      {new Date(p.created_at).toLocaleDateString('es-MX')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary-900">Nuevo proyecto</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <Icon name="salir" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="label">Nombre del candidato *</label>
                  <input
                    type="text"
                    value={form.nombre_candidato}
                    onChange={(e) => {
                      const nombre = e.target.value;
                      setForm((f) => ({
                        ...f,
                        nombre_candidato: nombre,
                        slug: f.slug || slugify(nombre),
                      }));
                    }}
                    className="input w-full"
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Slug del proyecto *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.replace(/[^a-z0-9-]/g, '').toLowerCase() }))}
                    className="input w-full font-mono"
                    placeholder="juan-perez-2027"
                    required
                  />
                  <p className="mt-1 text-xs text-secondary-500">
                    Solo minúsculas, números y guiones. Ej: juan-perez-2027
                  </p>
                </div>

                <div>
                  <label className="label">Cargo que busca</label>
                  <input
                    type="text"
                    value={form.cargo_busca}
                    onChange={(e) => setForm((f) => ({ ...f, cargo_busca: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. Presidente Municipal"
                  />
                </div>

                <div>
                  <label className="label">Slogan</label>
                  <input
                    type="text"
                    value={form.slogan}
                    onChange={(e) => setForm((f) => ({ ...f, slogan: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. Juntos por León"
                  />
                </div>

                <div className="md:col-span-2 border-t border-secondary-100 pt-4">
                  <h4 className="mb-2 text-sm font-semibold text-secondary-800">Cuenta del owner</h4>
                </div>

                <div>
                  <label className="label">Email del owner *</label>
                  <input
                    type="email"
                    value={form.owner_email}
                    onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                    className="input w-full"
                    placeholder="owner@proyecto.com"
                    required
                  />
                </div>

                <div>
                  <label className="label">Nombre del owner *</label>
                  <input
                    type="text"
                    value={form.owner_nombre}
                    onChange={(e) => setForm((f) => ({ ...f, owner_nombre: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. María López"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Contraseña del owner *</label>
                  <input
                    type="text"
                    value={form.owner_password}
                    onChange={(e) => setForm((f) => ({ ...f, owner_password: e.target.value }))}
                    className="input w-full"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Creando...' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
