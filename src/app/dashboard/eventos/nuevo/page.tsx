'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { eventosApi, zonasApi, lideresApi } from '@/lib/api';
import { Zona, Lider } from '@/types';

function NuevoEventoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fechaParam = searchParams.get('fecha');

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    direccion: '',
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
    if (fechaParam) {
      const inicio = `${fechaParam}T10:00`;
      const fin = `${fechaParam}T13:00`;
      setFormData((prev) => ({
        ...prev,
        fecha_inicio: inicio,
        fecha_fin: fin,
      }));
    }
    loadCatalogos();
  }, [fechaParam]);

  const loadCatalogos = async () => {
    try {
      const [{ data: zonasData }, { data: lideresData }] = await Promise.all([
        zonasApi.getAll(),
        lideresApi.getAll(),
      ]);
      setZonas(zonasData || []);
      setLideres(lideresData || []);
    } catch (err: any) {
      // No bloquear la creación si fallan catálogos
    }
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
      await eventosApi.create({
        ...formData,
        asistentes_estimados: formData.asistentes_estimados ? parseInt(formData.asistentes_estimados, 10) : undefined,
      });
      router.push('/dashboard/eventos');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Nuevo Evento</h2>
        <p className="text-gray-600">Programa una reunión, mitin o actividad</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card max-w-4xl space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label htmlFor="nombre" className="label">Nombre del evento *</label>
            <input
              id="nombre"
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input"
              placeholder="Mitin de cierre de campaña"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="descripcion" className="label">Descripción</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="input min-h-[100px]"
              placeholder="Detalles del evento, agenda, etc."
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="direccion" className="label">Dirección</label>
            <input
              id="direccion"
              type="text"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              className="input"
              placeholder="Calle, número, colonia, ciudad"
            />
          </div>

          <div>
            <label htmlFor="fecha_inicio" className="label">Fecha y hora de inicio *</label>
            <input
              id="fecha_inicio"
              type="datetime-local"
              name="fecha_inicio"
              value={formData.fecha_inicio}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div>
            <label htmlFor="fecha_fin" className="label">Fecha y hora de fin</label>
            <input
              id="fecha_fin"
              type="datetime-local"
              name="fecha_fin"
              value={formData.fecha_fin}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="asistentes_estimados" className="label">Asistentes estimados</label>
            <input
              id="asistentes_estimados"
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
            <label htmlFor="status" className="label">Estado</label>
            <select
              id="status"
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

          {/* Campos para cruces informativos */}
          <div>
            <label htmlFor="zona_id" className="label">Zona electoral</label>
            <select
              id="zona_id"
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
            <label htmlFor="tematica" className="label">Temática de la reunión</label>
            <input
              id="tematica"
              type="text"
              name="tematica"
              value={formData.tematica}
              onChange={handleChange}
              className="input"
              placeholder="Ej. Seguridad, Salud, Juventud"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="lider_id" className="label">Líder principal / responsable</label>
            <select
              id="lider_id"
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

          <div className="md:col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <input
              id="generar_ficha"
              type="checkbox"
              name="generar_ficha"
              checked={formData.generar_ficha}
              onChange={handleChange}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="generar_ficha" className="text-sm font-medium text-gray-700 cursor-pointer">
              Generar ficha informativa para el candidato
              <span className="block text-xs font-normal text-gray-500">
                Se creará automáticamente un resumen con datos del evento para entregar al candidato.
              </span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button type="submit" disabled={loading} className="btn-primary disabled:opacity-60">
            {loading ? 'Guardando...' : 'Guardar Evento'}
          </button>
          <Link href="/dashboard/eventos" className="btn-secondary">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NuevoEventoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>}>
      <NuevoEventoForm />
    </Suspense>
  );
}
