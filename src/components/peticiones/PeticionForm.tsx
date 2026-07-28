'use client';

import { useState, useEffect, useMemo } from 'react';
import { peticionesApi, votantesApi, usersApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { Peticion, TipoPeticion, OrigenPeticion, CategoriaPeticion, PrioridadPeticion, EstatusPeticion } from '@/types/peticiones';

const TIPOS: { value: TipoPeticion; label: string }[] = [
  { value: 'ciudadana', label: 'Ciudadana / Comunitaria' },
  { value: 'logistica', label: 'Logística de campaña' },
  { value: 'tramite', label: 'Trámite institucional' },
  { value: 'seguimiento_votante', label: 'Seguimiento a votante' },
  { value: 'tarea_interna', label: 'Tarea interna' },
];

const ORIGENES: { value: OrigenPeticion; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'app_brigada', label: 'App de brigada' },
  { value: 'landing', label: 'Landing / Web' },
  { value: 'encuesta', label: 'Encuesta' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

const CATEGORIAS: { value: CategoriaPeticion; label: string }[] = [
  { value: 'bache', label: 'Bache' },
  { value: 'alumbrado', label: 'Alumbrado' },
  { value: 'agua', label: 'Agua' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'limpia', label: 'Limpia' },
  { value: 'salud', label: 'Salud' },
  { value: 'apoyo', label: 'Apoyo' },
  { value: 'otro', label: 'Otro' },
];

const PRIORIDADES: { value: PrioridadPeticion; label: string; color: string }[] = [
  { value: 'baja', label: 'Baja', color: 'text-secondary-600 bg-secondary-100' },
  { value: 'media', label: 'Media', color: 'text-blue-700 bg-blue-50' },
  { value: 'alta', label: 'Alta', color: 'text-amber-700 bg-amber-50' },
  { value: 'critica', label: 'Crítica', color: 'text-red-700 bg-red-50' },
];

const ESTATUS: { value: EstatusPeticion; label: string; color: string }[] = [
  { value: 'propuesta', label: 'Propuesta', color: 'text-purple-700 bg-purple-50' },
  { value: 'pendiente', label: 'Pendiente', color: 'text-secondary-600 bg-secondary-100' },
  { value: 'en_proceso', label: 'En proceso', color: 'text-blue-700 bg-blue-50' },
  { value: 'resuelta', label: 'Resuelta', color: 'text-green-700 bg-green-50' },
  { value: 'cancelada', label: 'Cancelada', color: 'text-red-700 bg-red-50' },
  { value: 'rechazada', label: 'Rechazada', color: 'text-gray-700 bg-gray-100' },
];

interface Props {
  initial?: Peticion | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading?: boolean;
  soloPropuesta?: boolean;
}

export default function PeticionForm({ initial, onSubmit, onCancel, loading, soloPropuesta }: Props) {
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    votante_id: '',
    responsable_id: '',
    tipo: 'ciudadana' as TipoPeticion,
    origen: 'manual' as OrigenPeticion,
    categoria: 'otro' as CategoriaPeticion,
    prioridad: 'media' as PrioridadPeticion,
    estatus: 'propuesta' as EstatusPeticion,
    seccion_electoral: '',
    ubicacion_texto: '',
    fecha_compromiso: '',
    requiere_evidencia: true,
  });
  const [votantes, setVotantes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [buscandoVotante, setBuscandoVotante] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) {
      setForm({
        titulo: initial.titulo || '',
        descripcion: initial.descripcion || '',
        votante_id: initial.votante_id || '',
        responsable_id: initial.responsable_id || '',
        tipo: initial.tipo || 'ciudadana',
        origen: initial.origen || 'manual',
        categoria: initial.categoria || 'otro',
        prioridad: initial.prioridad || 'media',
        estatus: initial.estatus || 'propuesta',
        seccion_electoral: initial.seccion_electoral || '',
        ubicacion_texto: initial.ubicacion_texto || '',
        fecha_compromiso: initial.fecha_compromiso ? initial.fecha_compromiso.slice(0, 16) : '',
        requiere_evidencia: initial.requiere_evidencia !== false,
      });
    }
  }, [initial]);

  useEffect(() => {
    usersApi.getAll().then((res) => setUsuarios(res.data || [])).catch(() => {});
  }, []);

  const votantesFiltrados = useMemo(() => {
    const term = buscandoVotante.toLowerCase();
    if (!term) return [];
    return votantes.filter((v) =>
      (v.nombre?.toLowerCase().includes(term) || v.telefono?.toLowerCase().includes(term))
    );
  }, [buscandoVotante, votantes]);

  const buscarVotante = async () => {
    try {
      const { data } = await votantesApi.getAll({ limit: 50, search: buscandoVotante });
      setVotantes(data || []);
    } catch (e) {
      setError('No se pudieron cargar votantes');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim()) {
      setError('La descripción es obligatoria');
      return;
    }

    const payload: any = {
      ...form,
      votante_id: form.votante_id || undefined,
      responsable_id: form.responsable_id || undefined,
      seccion_electoral: form.seccion_electoral || undefined,
      ubicacion_texto: form.ubicacion_texto || undefined,
      fecha_compromiso: form.fecha_compromiso ? new Date(form.fecha_compromiso).toISOString() : undefined,
    };

    if (soloPropuesta) {
      payload.estatus = 'propuesta';
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Título</label>
          <input
            type="text"
            className="input"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ej. Luminaria apagada en calle Hidalgo"
            disabled={loading}
          />
        </div>
        <div>
          <label className="label">Tipo de gestión</label>
          <select
            className="input"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoPeticion })}
            disabled={loading}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Descripción *</label>
        <textarea
          className="input min-h-[80px]"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Describe la gestión con el mayor detalle posible..."
          disabled={loading}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Categoría</label>
          <select
            className="input"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaPeticion })}
            disabled={loading}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Prioridad</label>
          <select
            className="input"
            value={form.prioridad}
            onChange={(e) => setForm({ ...form, prioridad: e.target.value as PrioridadPeticion })}
            disabled={loading}
          >
            {PRIORIDADES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Origen</label>
          <select
            className="input"
            value={form.origen}
            onChange={(e) => setForm({ ...form, origen: e.target.value as OrigenPeticion })}
            disabled={loading || !!initial}
          >
            {ORIGENES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Responsable</label>
          <select
            className="input"
            value={form.responsable_id}
            onChange={(e) => setForm({ ...form, responsable_id: e.target.value })}
            disabled={loading}
          >
            <option value="">Sin asignar</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre || u.email} ({u.rol})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Votante relacionado</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              value={buscandoVotante}
              onChange={(e) => setBuscandoVotante(e.target.value)}
              placeholder="Buscar por nombre o teléfono"
              disabled={loading}
            />
            <button
              type="button"
              onClick={buscarVotante}
              className="btn-secondary px-3"
              disabled={loading || !buscandoVotante.trim()}
            >
              <Icon name="buscar" size={16} />
            </button>
          </div>
          {votantesFiltrados.length > 0 && (
            <div className="mt-1 max-h-32 overflow-auto rounded-md border border-secondary-200 bg-white text-sm">
              {votantesFiltrados.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, votante_id: v.id });
                    setBuscandoVotante(v.nombre || '');
                    setVotantes([]);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-secondary-50"
                >
                  {v.nombre || 'Sin nombre'} {v.telefono ? `• ${v.telefono}` : ''}
                </button>
              ))}
            </div>
          )}
          {form.votante_id && (
            <p className="mt-1 text-xs text-secondary-500">Votante seleccionado: {form.votante_id}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Sección electoral</label>
          <input
            type="text"
            className="input"
            value={form.seccion_electoral}
            onChange={(e) => setForm({ ...form, seccion_electoral: e.target.value })}
            placeholder="Ej. 0123"
            disabled={loading}
          />
        </div>
        <div>
          <label className="label">Fecha compromiso</label>
          <input
            type="datetime-local"
            className="input"
            value={form.fecha_compromiso}
            onChange={(e) => setForm({ ...form, fecha_compromiso: e.target.value })}
            disabled={loading}
          />
        </div>
        <div>
          <label className="label">Estatus</label>
          <select
            className="input"
            value={form.estatus}
            onChange={(e) => setForm({ ...form, estatus: e.target.value as EstatusPeticion })}
            disabled={loading || soloPropuesta}
          >
            {ESTATUS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Ubicación / Dirección</label>
        <input
          type="text"
          className="input"
          value={form.ubicacion_texto}
          onChange={(e) => setForm({ ...form, ubicacion_texto: e.target.value })}
          placeholder="Ej. Calle Hidalgo #123, entre Zaragoza y Madero"
          disabled={loading}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requiere_evidencia"
          checked={form.requiere_evidencia}
          onChange={(e) => setForm({ ...form, requiere_evidencia: e.target.checked })}
          disabled={loading}
        />
        <label htmlFor="requiere_evidencia" className="text-sm text-secondary-700">
          Requiere evidencia fotográfica para cerrar
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1" disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
