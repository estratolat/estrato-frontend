'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminApi, uploadsApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { errorToString } from '@/lib/error-utils';
import { Icon } from '@/components/ui/Icon';

interface Project {
  id: string;
  slug: string;
  dominio_personalizado?: string;
  nombre_candidato: string;
  cargo_busca?: string;
  slogan?: string;
  foto_url?: string;
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

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({
    nombre_candidato: '',
    cargo_busca: '',
    slogan: '',
    dominio_personalizado: '',
    foto_url: '',
    plan: 'basico',
    activo: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [uploadingFoto, setUploadingFoto] = useState(false);

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

  const openEditModal = (project: Project) => {
    setEditProject(project);
    setEditForm({
      nombre_candidato: project.nombre_candidato || '',
      cargo_busca: project.cargo_busca || '',
      slogan: project.slogan || '',
      dominio_personalizado: project.dominio_personalizado || '',
      foto_url: project.foto_url || '',
      plan: project.plan || 'basico',
      activo: project.activo ?? true,
    });
    setEditError('');
  };

  const closeEditModal = () => {
    setEditProject(null);
    setEditError('');
  };

  const resizeAndCompressImage = (
    file: File,
    { maxWidth = 600, maxHeight = 600, quality = 0.8, type = 'image/jpeg' }: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      type?: 'image/jpeg' | 'image/webp';
    } = {}
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No se pudo obtener contexto del canvas'));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('No se pudo comprimir la imagen'));
            resolve(blob);
          },
          type,
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Error al cargar la imagen'));
      };
      img.src = url;
    });
  };

  const blobToFile = (blob: Blob, name: string): File => {
    return new File([blob], name, { type: blob.type, lastModified: Date.now() });
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingFoto(true);
      setEditError('');

      // Comprimir y redimensionar antes de subir para evitar data URLs enormes
      const compressed = await resizeAndCompressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        quality: 0.85,
        type: 'image/jpeg',
      });
      const compressedFile = blobToFile(compressed, file.name.replace(/\.[^.]+$/, '.jpg'));

      if (compressedFile.size > 1.5 * 1024 * 1024) {
        setEditError('La imagen sigue siendo muy grande. Usa una imagen más pequeña.');
        setUploadingFoto(false);
        return;
      }

      const { data } = await uploadsApi.uploadFoto(compressedFile);
      const url = data?.foto_url || '';
      if (url.length > 200000) {
        setEditError('La imagen comprimida sigue siendo demasiado grande. Reduce calidad o tamaño.');
        setUploadingFoto(false);
        return;
      }
      setEditForm((f) => ({ ...f, foto_url: url }));
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.message || 'Error al subir la foto');
    } finally {
      setUploadingFoto(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;
    try {
      setEditSubmitting(true);
      setEditError('');
      await adminApi.updateProject(editProject.id, {
        nombre_candidato: editForm.nombre_candidato,
        cargo_busca: editForm.cargo_busca,
        slogan: editForm.slogan,
        dominio_personalizado: editForm.dominio_personalizado,
        foto_url: editForm.foto_url,
        plan: editForm.plan,
        activo: editForm.activo,
      });
      setEditProject(null);
      loadProjects();
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Error al actualizar el proyecto');
    } finally {
      setEditSubmitting(false);
    }
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
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-secondary-500">
                    No hay proyectos creados todavía.
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.foto_url ? (
                          <img
                            src={p.foto_url}
                            alt={p.nombre_candidato}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-secondary-200"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-xs font-bold">
                            {p.nombre_candidato.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-secondary-900">{p.nombre_candidato}</p>
                          {p.cargo_busca && <p className="text-xs text-secondary-500">{p.cargo_busca}</p>}
                        </div>
                      </div>
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary-100 px-2.5 py-1.5 text-xs font-semibold text-secondary-700 transition hover:bg-primary-100 hover:text-primary-700"
                        title="Editar proyecto"
                      >
                        <Icon name="seguridad" size={14} /> Editar
                      </button>
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

      {editProject && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="relative z-[10000] w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary-900">Editar proyecto</h3>
              <button
                onClick={closeEditModal}
                className="text-secondary-400 hover:text-secondary-600"
              >
                <Icon name="salir" size={20} />
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2 flex items-center gap-4">
                  {editForm.foto_url ? (
                    <img
                      src={editForm.foto_url}
                      alt="Vista previa"
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-secondary-200"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary-100 text-secondary-500 text-xs font-bold">
                      SIN FOTO
                    </div>
                  )}
                  <div className="flex-1">
                    <label className="label">Foto / Logo del proyecto</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFotoChange}
                      disabled={uploadingFoto}
                      className="block w-full text-xs text-secondary-600 file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-200"
                    />
                    {uploadingFoto && (
                      <p className="mt-1 text-xs text-secondary-500">Subiendo foto...</p>
                    )}
                    <p className="mt-1 text-[10px] text-secondary-400">
                      JPG, PNG o WebP. Máx 5 MB.
                    </p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label">Nombre del candidato *</label>
                  <input
                    type="text"
                    value={editForm.nombre_candidato}
                    onChange={(e) => setEditForm((f) => ({ ...f, nombre_candidato: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. Juan Pérez"
                    required
                  />
                </div>

                <div>
                  <label className="label">Cargo que busca</label>
                  <input
                    type="text"
                    value={editForm.cargo_busca}
                    onChange={(e) => setEditForm((f) => ({ ...f, cargo_busca: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. Presidente Municipal"
                  />
                </div>

                <div>
                  <label className="label">Slogan</label>
                  <input
                    type="text"
                    value={editForm.slogan}
                    onChange={(e) => setEditForm((f) => ({ ...f, slogan: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. Juntos por León"
                  />
                </div>

                <div>
                  <label className="label">Plan</label>
                  <select
                    value={editForm.plan}
                    onChange={(e) => setEditForm((f) => ({ ...f, plan: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="basico">Básico</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="label">Estado</label>
                  <select
                    value={editForm.activo ? 'activo' : 'inactivo'}
                    onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.value === 'activo' }))}
                    className="input w-full"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="label">Dominio personalizado</label>
                  <input
                    type="text"
                    value={editForm.dominio_personalizado}
                    onChange={(e) => setEditForm((f) => ({ ...f, dominio_personalizado: e.target.value }))}
                    className="input w-full"
                    placeholder="Ej. juanalcalde.mx"
                  />
                  <p className="mt-1 text-xs text-secondary-500">
                    Opcional. Se usa para landing personalizada.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="btn-secondary flex-1"
                  disabled={editSubmitting || uploadingFoto}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 disabled:opacity-60"
                  disabled={editSubmitting || uploadingFoto}
                >
                  {editSubmitting ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
