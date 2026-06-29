'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api';
import { SECCIONES, permisosPorRol, labelSeccion } from '@/lib/permisos';
import { Icon } from '@/components/ui/Icon';

interface Zona {
  id: string;
  nombre: string;
}

interface PermisosSchema {
  secciones: { id: string; label: string; icon: string }[];
  roles: string[];
  defaults: Record<string, string[]>;
}

interface UsuarioFormProps {
  initial?: any;
  zonas: Zona[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
}

const ROLES_LABELS: Record<string, string> = {
  owner: 'Owner (super admin)',
  candidato: 'Candidato',
  coord_general: 'Coordinador General',
  coord_zona: 'Coordinador de Zona',
  brigadista: 'Brigadista',
  cm: 'Community Manager',
};

export default function UsuarioForm({ initial, zonas, onSubmit, onCancel, loading }: UsuarioFormProps) {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    pin: '',
    password: '',
    rol: 'brigadista',
    zona_id: '',
    activo: true,
    permisos: [] as string[],
  });
  const [schema, setSchema] = useState<PermisosSchema | null>(null);
  const [customPerms, setCustomPerms] = useState(false);

  useEffect(() => {
    usersApi
      .getPermisosSchema()
      .then((res) => setSchema(res.data))
      .catch(() => setSchema({ secciones: SECCIONES, roles: Object.keys(ROLES_LABELS), defaults: {} }));
  }, []);

  useEffect(() => {
    if (initial) {
      const perms = Array.isArray(initial.permisos) ? initial.permisos : permisosPorRol(initial.rol);
      const defaults = permisosPorRol(initial.rol);
      setForm({
        nombre: initial.nombre || '',
        email: initial.email || '',
        telefono: initial.telefono || '',
        pin: initial.pin || '',
        password: '',
        rol: initial.rol || 'brigadista',
        zona_id: initial.zona_id || '',
        activo: initial.activo !== false,
        permisos: perms,
      });
      setCustomPerms(JSON.stringify(perms.sort()) !== JSON.stringify(defaults.sort()));
    }
  }, [initial]);

  useEffect(() => {
    if (!initial && schema) {
      const defaults = schema.defaults[form.rol] || permisosPorRol(form.rol);
      if (!customPerms) {
        setForm((prev) => ({ ...prev, permisos: defaults }));
      }
    }
  }, [form.rol, schema, customPerms, initial]);

  const handleChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const togglePermiso = (id: string) => {
    setCustomPerms(true);
    setForm((prev) => {
      const next = prev.permisos.includes(id)
        ? prev.permisos.filter((p) => p !== id)
        : [...prev.permisos, id];
      return { ...prev, permisos: next };
    });
  };

  const aplicarDefaults = () => {
    const defaults = schema?.defaults?.[form.rol] || permisosPorRol(form.rol);
    setForm((prev) => ({ ...prev, permisos: defaults }));
    setCustomPerms(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      ...form,
      zona_id: form.zona_id || undefined,
      pin: form.pin || undefined,
      password: form.password || undefined,
      permisos: form.permisos.length > 0 ? form.permisos : undefined,
    };
    if (initial) {
      // En update no enviar password vacío
      if (!payload.password) delete payload.password;
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Nombre completo</label>
          <input
            type="text"
            className="input w-full"
            value={form.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input w-full"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Teléfono (para login de brigada)</label>
          <input
            type="tel"
            className="input w-full"
            value={form.telefono}
            onChange={(e) => handleChange('telefono', e.target.value)}
            placeholder="+52..."
          />
        </div>
        <div>
          <label className="label">PIN numérico (para brigada)</label>
          <input
            type="text"
            inputMode="numeric"
            className="input w-full"
            value={form.pin}
            onChange={(e) => handleChange('pin', e.target.value)}
            placeholder="1234"
          />
        </div>
        <div>
          <label className="label">Rol</label>
          <select
            className="input w-full"
            value={form.rol}
            onChange={(e) => handleChange('rol', e.target.value)}
          >
            {Object.entries(ROLES_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Zona asignada (opcional)</label>
          <select
            className="input w-full"
            value={form.zona_id}
            onChange={(e) => handleChange('zona_id', e.target.value)}
          >
            <option value="">Sin zona / Todo el territorio</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>{z.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Contraseña inicial {initial && '(dejar en blanco para no cambiar)'}</label>
          <input
            type="text"
            className="input w-full"
            value={form.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder={initial ? '••••••' : 'demo123'}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <button
            type="button"
            onClick={() => handleChange('activo', !form.activo)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 ${
              form.activo ? 'bg-primary-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={form.activo}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                form.activo ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-secondary-700">{form.activo ? 'Usuario activo' : 'Usuario inactivo'}</span>
        </div>
      </div>

      <div className="rounded-xl border border-secondary-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="font-bold text-secondary-800">Permisos por sección</h4>
          <button
            type="button"
            onClick={aplicarDefaults}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Restaurar defaults del rol
          </button>
        </div>        <p className="mb-4 text-sm text-secondary-500">
          Activa las secciones del dashboard a las que este usuario podrá acceder. También afecta si puede entrar a la App de Brigada.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(schema?.secciones || SECCIONES).map((seccion) => {
            const active = form.permisos.includes(seccion.id);
            return (
              <button
                key={seccion.id}
                type="button"
                onClick={() => togglePermiso(seccion.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  active
                    ? 'border-primary-300 bg-primary-50 text-primary-800'
                    : 'border-secondary-200 bg-white text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    active ? 'bg-primary-100' : 'bg-secondary-100'
                  }`}
                >
                  <Icon name={seccion.icon as any} size={18} className={active ? 'text-primary-600' : 'text-secondary-500'} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{seccion.label}</p>
                  <p className="text-xs opacity-75">{active ? 'Permitido' : 'Bloqueado'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="btn-secondary px-5 py-2.5">Cancelar</button>
        <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 disabled:opacity-60">
          {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear acceso'}
        </button>
      </div>
    </form>
  );
}
