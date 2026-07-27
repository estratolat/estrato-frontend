'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { crmApi } from '@/lib/api';

const CANALES = [
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'bg-green-100 text-green-700' },
  { value: 'messenger', label: 'Messenger', icon: '💬', color: 'bg-blue-100 text-blue-700' },
  { value: 'instagram', label: 'Instagram', icon: '📷', color: 'bg-pink-100 text-pink-700' },
  { value: 'sms', label: 'SMS', icon: '📱', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'email', label: 'Email', icon: '✉️', color: 'bg-gray-100 text-gray-700' },
];

const PROVEEDORES = [
  { value: 'meta', label: 'Meta (WhatsApp / Messenger / Instagram)' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'vonage', label: 'Vonage' },
  { value: 'smtp', label: 'SMTP' },
  { value: 'custom', label: 'Custom / Webhook manual' },
];

interface CanalCrm {
  id: string;
  canal: string;
  nombre: string;
  proveedor: string;
  cuenta_id: string | null;
  access_token: string | null;
  desde_numero: string | null;
  webhook_path: string | null;
  verify_token: string | null;
  activo: boolean;
  metadata?: any;
}

const canalLabel = (canal: string) =>
  CANALES.find((c) => c.value === canal)?.label || canal;

const canalBadge = (canal: string) => {
  const c = CANALES.find((x) => x.value === canal);
  if (!c) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${c.color}`}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
};

export default function CrmCanalesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [canales, setCanales] = useState<CanalCrm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CanalCrm | null>(null);

  const [form, setForm] = useState<Partial<CanalCrm>>({
    canal: 'whatsapp',
    proveedor: 'meta',
    nombre: '',
    cuenta_id: '',
    access_token: '',
    desde_numero: '',
    webhook_path: '',
    verify_token: '',
    activo: true,
    metadata: {},
  });

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'crm', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const tenantSlug = user?.tenant_slug || '';

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await crmApi.getCanales(false);
      setCanales(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar canales');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && puedeAcceder(user.permisos, 'crm', user.rol)) {
      cargar();
    }
  }, [user, cargar]);

  const abrirCrear = () => {
    setEditing(null);
    setForm({
      canal: 'whatsapp',
      proveedor: 'meta',
      nombre: '',
      cuenta_id: '',
      access_token: '',
      desde_numero: '',
      webhook_path: '',
      verify_token: '',
      activo: true,
      metadata: {},
    });
    setModalOpen(true);
  };

  const abrirEditar = (canal: CanalCrm) => {
    setEditing(canal);
    setForm({ ...canal });
    setModalOpen(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre || !form.canal) return;

    const payload = {
      canal: form.canal,
      nombre: form.nombre,
      proveedor: form.proveedor,
      cuenta_id: form.cuenta_id || undefined,
      access_token: form.access_token || undefined,
      desde_numero: form.desde_numero || undefined,
      webhook_path: form.webhook_path || undefined,
      verify_token: form.verify_token || undefined,
      activo: form.activo,
      metadata: form.metadata || {},
    };

    try {
      if (editing) {
        await crmApi.updateCanal(editing.id, payload);
      } else {
        await crmApi.createCanal(payload);
      }
      setModalOpen(false);
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar canal');
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este canal? Los mensajes históricos se conservan.')) return;
    try {
      await crmApi.deleteCanal(id);
      cargar();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar canal');
    }
  };

  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto);
    alert('Copiado al portapapeles');
  };

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Canales CRM</h2>
          <p className="text-secondary-500">
            Configura cuentas de WhatsApp, Messenger, Instagram, SMS y email por proyecto.
          </p>
        </div>
        <button onClick={abrirCrear} className="btn-primary">
          + Agregar canal
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
        </div>
      ) : canales.length === 0 ? (
        <div className="rounded-xl border border-secondary-200 bg-white p-8 text-center">
          <p className="text-secondary-500">No hay canales configurados todavía.</p>
          <button onClick={abrirCrear} className="btn-primary mt-4">
            Configurar primer canal
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {canales.map((c) => {
            const webhookUrl = `${apiUrl}/crm/webhook/${tenantSlug}/${c.webhook_path}`;
            return (
              <div
                key={c.id}
                className={`rounded-xl border bg-white p-5 ${c.activo ? 'border-secondary-200' : 'border-secondary-200 opacity-60'}`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {canalBadge(c.canal)}
                    <div>
                      <h3 className="font-bold text-secondary-800">{c.nombre}</h3>
                      <p className="text-xs text-secondary-500">{c.proveedor}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => abrirEditar(c)}
                      className="action-button text-blue-600 hover:bg-blue-50"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => eliminar(c.id)}
                      className="action-button text-red-600 hover:bg-red-50"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {c.cuenta_id && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">ID de cuenta:</span>
                      <span className="font-mono text-secondary-700">{c.cuenta_id}</span>
                    </div>
                  )}
                  {c.desde_numero && (
                    <div className="flex justify-between">
                      <span className="text-secondary-500">Número origen:</span>
                      <span className="text-secondary-700">{c.desde_numero}</span>
                    </div>
                  )}

                  {c.webhook_path && tenantSlug && (
                    <div className="mt-3 rounded-lg border border-secondary-100 bg-secondary-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-secondary-600">Webhook URL</p>
                      <div className="flex items-center gap-2">
                        <code className="block flex-1 truncate text-xs text-secondary-800">
                          {webhookUrl}
                        </code>
                        <button
                          onClick={() => copiar(webhookUrl)}
                          className="rounded bg-white px-2 py-1 text-xs font-medium text-secondary-600 shadow-sm hover:text-primary-600"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}

                  {c.verify_token && (
                    <div className="mt-2 rounded-lg border border-secondary-100 bg-secondary-50 p-3">
                      <p className="mb-1 text-xs font-semibold text-secondary-600">Verify Token</p>
                      <div className="flex items-center gap-2">
                        <code className="block flex-1 truncate text-xs text-secondary-800">
                          {c.verify_token}
                        </code>
                        <button
                          onClick={() => copiar(c.verify_token!)}
                          className="rounded bg-white px-2 py-1 text-xs font-medium text-secondary-600 shadow-sm hover:text-primary-600"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {!c.activo && (
                  <span className="mt-3 inline-block rounded bg-secondary-100 px-2 py-1 text-xs text-secondary-500">
                    Inactivo
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-bold text-secondary-800">
              {editing ? 'Editar canal' : 'Nuevo canal CRM'}
            </h3>

            <form onSubmit={guardar} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">Canal</label>
                <select
                  value={form.canal}
                  onChange={(e) => setForm({ ...form, canal: e.target.value })}
                  className="input w-full"
                >
                  {CANALES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. WhatsApp Oficial de Yaz"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">Proveedor</label>
                <select
                  value={form.proveedor}
                  onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                  className="input w-full"
                >
                  {PROVEEDORES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">
                  ID de cuenta / Número
                </label>
                <input
                  type="text"
                  value={form.cuenta_id || ''}
                  onChange={(e) => setForm({ ...form, cuenta_id: e.target.value })}
                  placeholder="phone_number_id, page_id, instagram_id..."
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-secondary-500">
                  Para Meta WhatsApp es el phone_number_id. Para Messenger/Instagram es el page_id.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">
                  Access Token
                </label>
                <input
                  type="password"
                  value={form.access_token || ''}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  placeholder="Token permanente de Meta o Twilio"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">
                  Número origen (opcional)
                </label>
                <input
                  type="text"
                  value={form.desde_numero || ''}
                  onChange={(e) => setForm({ ...form, desde_numero: e.target.value })}
                  placeholder="+521234567890"
                  className="input w-full"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">
                  Webhook path
                </label>
                <input
                  type="text"
                  value={form.webhook_path || ''}
                  onChange={(e) => setForm({ ...form, webhook_path: e.target.value })}
                  placeholder="whatsApp-yaz-2024"
                  className="input w-full"
                />
                <p className="mt-1 text-xs text-secondary-500">
                  Slug único para la URL del webhook. Ej: <code>crm/webhook/tu-slug/whatsApp-yaz</code>
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-secondary-700">
                  Verify Token
                </label>
                <input
                  type="text"
                  value={form.verify_token || ''}
                  onChange={(e) => setForm({ ...form, verify_token: e.target.value })}
                  placeholder="Token de verificación de Meta"
                  className="input w-full"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm text-secondary-700">Activo</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-secondary-200 px-4 py-2 text-sm font-medium text-secondary-600 hover:bg-secondary-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editing ? 'Guardar cambios' : 'Crear canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
