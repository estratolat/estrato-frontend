'use client';

import { useEffect, useState } from 'react';
import { eventosApi, zonasApi, lideresApi } from '@/lib/api';
import { Zona, Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (id: string, lat?: number, lng?: number) => void;
  coordenadasIniciales?: { lat: number; lng: number } | null;
}

export default function NuevoEventoModal({ abierto, onCerrar, onExito, coordenadasIniciales }: Props) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    direccion: '',
    lat: '',
    lng: '',
    fecha_inicio: '',
    fecha_fin: '',
    asistentes_estimados: '',
    status: 'programado',
    zona_id: '',
    tematica: '',
    lider_id: '',
    generar_ficha: false,
  });
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [lideres, setLideres] = useState<Lider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    loadCatalogos();

    const ahora = new Date();
    const inicio = new Date(ahora.getTime() + 60 * 60 * 1000);
    const fin = new Date(ahora.getTime() + 3 * 60 * 60 * 1000);

    setFormData((prev) => ({
      ...prev,
      nombre: '',
      descripcion: '',
      direccion: '',
      fecha_inicio: toDatetimeLocal(inicio),
      fecha_fin: toDatetimeLocal(fin),
      asistentes_estimados: '',
      status: 'programado',
      zona_id: '',
      tematica: '',
      lider_id: '',
      generar_ficha: false,
      lat: coordenadasIniciales?.lat.toFixed(6) || '',
      lng: coordenadasIniciales?.lng.toFixed(6) || '',
    }));
  }, [abierto, coordenadasIniciales]);

  const loadCatalogos = async () => {
    try {
      const [{ data: zonasData }, { data: lideresData }] = await Promise.all([
        zonasApi.getAll(),
        lideresApi.getAll(),
      ]);
      setZonas(zonasData || []);
      setLideres(lideresData || []);
    } catch {}
  };

  const toDatetimeLocal = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: any = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        direccion: formData.direccion,
        fecha_inicio: formData.fecha_inicio,
        fecha_fin: formData.fecha_fin,
        asistentes_estimados: formData.asistentes_estimados ? parseInt(formData.asistentes_estimados, 10) : undefined,
        status: formData.status,
        zona_id: formData.zona_id || undefined,
        tematica: formData.tematica,
        lider_id: formData.lider_id || undefined,
        generar_ficha: formData.generar_ficha,
      };

      if (formData.lat && formData.lng) {
        payload.coordenadas = { lat: parseFloat(formData.lat), lng: parseFloat(formData.lng) };
      }

      const res = await eventosApi.create(payload);
      onExito(res.data?.id, payload.coordenadas?.lat, payload.coordenadas?.lng);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear evento');
    } finally {
      setLoading(false);
    }
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="relative z-[10000] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-secondary-900">Nuevo evento / mitin</h2>
          <button
            onClick={onCerrar}
            className="rounded-full p-1 text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
          >
            <Icon name="salir" size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="label">Nombre del evento *</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input"
              placeholder="Mitin de cierre de campaña"
              required
            />
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Detalles del evento, agenda, etc."
            />
          </div>

          <div>
            <label className="label">Dirección</label>
            <input
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              className="input"
              placeholder="Calle, número, colonia, ciudad"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Fecha y hora de inicio *</label>
              <input
                type="datetime-local"
                name="fecha_inicio"
                value={formData.fecha_inicio}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="label">Fecha y hora de fin</label>
              <input
                type="datetime-local"
                name="fecha_fin"
                value={formData.fecha_fin}
                onChange={handleChange}
                className="input"
              />
            </div>
            <div>
              <label className="label">Asistentes estimados</label>
              <input
                type="number"
                name="asistentes_estimados"
                value={formData.asistentes_estimados}
                onChange={handleChange}
                className="input"
                placeholder="500"
                min={0}
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="programado">Programado</option>
                <option value="en_curso">En curso</option>
                <option value="finalizado">Finalizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Zona electoral</label>
              <select
                name="zona_id"
                value={formData.zona_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">— Seleccionar zona —</option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre} {z.secciones?.length ? `(Secciones: ${z.secciones.join(', ')})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Temática</label>
              <input
                type="text"
                name="tematica"
                value={formData.tematica}
                onChange={handleChange}
                className="input"
                placeholder="Ej. Seguridad, Salud, Juventud"
              />
            </div>
          </div>

          <div>
            <label className="label">Líder principal / responsable</label>
            <select
              name="lider_id"
              value={formData.lider_id}
              onChange={handleChange}
              className="input"
            >
              <option value="">— Seleccionar líder —</option>
              {lideres.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.votante?.nombre || 'Sin nombre'} {l.alcance_estimado ? `(Alcance: ${l.alcance_estimado})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 rounded-lg border border-secondary-100 bg-secondary-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500">Ubicación en el mapa</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="number"
                step="any"
                name="lat"
                value={formData.lat}
                onChange={handleChange}
                placeholder="Latitud"
                className="input"
              />
              <input
                type="number"
                step="any"
                name="lng"
                value={formData.lng}
                onChange={handleChange}
                placeholder="Longitud"
                className="input"
              />
            </div>
            <p className="text-xs text-secondary-500">
              Coordenadas del punto seleccionado en el mapa. Puedes corregirlas.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <input
              id="generar_ficha"
              type="checkbox"
              name="generar_ficha"
              checked={formData.generar_ficha}
              onChange={handleChange}
              className="h-5 w-5 rounded text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="generar_ficha" className="cursor-pointer text-sm font-medium text-gray-700">
              Generar ficha informativa para el candidato
              <span className="block text-xs font-normal text-gray-500">
                Se creará automáticamente un resumen con datos del evento.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
