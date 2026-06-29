'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { lideresApi } from '@/lib/api';
import { Lider } from '@/types';
import { Icon } from '@/components/ui/Icon';
import LiderMap from '@/components/lideres/LiderMap';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type LiderExtendido = Lider & {
  metricas?: any;
  actividad?: { recorridos: any[]; apoyos: any[] };
};

export default function LiderDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [lider, setLider] = useState<LiderExtendido | null>(null);
  const [otros, setOtros] = useState<{ id: string; nombre: string; lat: number; lng: number; radioM: number; score: number; alcance: number }[]>([]);
  const [radio, setRadio] = useState(500);
  const [tab, setTab] = useState<'mapa' | 'hijos' | 'actividad' | 'eventos' | 'apoyos'>('mapa');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadData();
  }, [id, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [liderRes, geoRes] = await Promise.all([lideresApi.getOne(id), lideresApi.getGeoJsonInfluencia(radio)]);
      setLider(liderRes.data);
      const features = (geoRes.data?.features || []).filter((f: any) => f.properties?.id !== id);
      setOtros(
        features.map((f: any) => {
          const c = f.geometry.coordinates;
          const p = f.properties || {};
          return {
            id: p.id,
            nombre: p.nombre || 'Sin nombre',
            lat: c[1],
            lng: c[0],
            radioM: p.radio_metros || 500,
            score: p.score || 0,
            alcance: p.alcance_estimado || 0,
          };
        })
      );
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar líder');
    } finally {
      setLoading(false);
    }
  };

  const refreshGeo = async () => {
    try {
      const geoRes = await lideresApi.getGeoJsonInfluencia(radio);
      const features = (geoRes.data?.features || []).filter((f: any) => f.properties?.id !== id);
      setOtros(
        features.map((f: any) => {
          const c = f.geometry.coordinates;
          const p = f.properties || {};
          return {
            id: p.id,
            nombre: p.nombre || 'Sin nombre',
            lat: c[1],
            lng: c[0],
            radioM: p.radio_metros || radio,
            score: p.score || 0,
            alcance: p.alcance_estimado || 0,
          };
        })
      );
    } catch {}
  };

  useEffect(() => {
    if (!lider) return;
    refreshGeo();
  }, [radio]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!lider) {
    return (
      <div className="p-6 text-center text-secondary-700">
        {error || 'No se encontró el líder'}
      </div>
    );
  }

  const v = lider.votante;
  const coords = v?.coordenadas;
  const metricas = lider.metricas || {};
  const actividad = lider.actividad || { recorridos: [], apoyos: [] };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/lideres"
            className="rounded-full p-2 text-secondary-500 hover:bg-secondary-100"
          >
            <Icon name="mapa" size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-secondary-900">{v?.nombre || 'Líder'}</h1>
            <p className="text-sm text-secondary-500">{v?.seccion_electoral ? `Sección ${v.seccion_electoral}` : 'Sin sección'} • {v?.colonia || 'Sin colonia'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {coords ? (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              Ubicado
            </span>
          ) : (
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
              Sin ubicación
            </span>
          )}
          <Link href={`/dashboard/lideres/${id}/editar`} className="btn-secondary">
            Editar
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Score</p>
          <p className="text-2xl font-bold text-secondary-900">{metricas.score ?? lider.score ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Alcance estimado</p>
          <p className="text-2xl font-bold text-primary-600">{(metricas.alcance_estimado ?? lider.alcance_estimado) || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Votantes bajo red</p>
          <p className="text-2xl font-bold text-secondary-900">{metricas.votantes_bajo_red || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Líderes hijos</p>
          <p className="text-2xl font-bold text-secondary-900">{metricas.lideres_hijos_count || lider.lideresHijos?.length || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-secondary-500">Eventos</p>
          <p className="text-2xl font-bold text-secondary-900">{metricas.eventos_count || 0}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-secondary-100">
          {(['mapa', 'hijos', 'actividad', 'apoyos'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                tab === t ? 'border-b-2 border-primary-600 text-primary-600' : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {t === 'mapa' && 'Mapa territorial'}
              {t === 'hijos' && `Líderes hijos (${lider.lideresHijos?.length || 0})`}
              {t === 'actividad' && `Recorridos (${actividad.recorridos.length})`}
              {t === 'apoyos' && `Apoyos (${actividad.apoyos.length})`}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'mapa' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-secondary-700">Radio de influencia:</label>
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={radio}
                  onChange={(e) => setRadio(parseInt(e.target.value))}
                  className="w-48 accent-primary-600"
                />
                <span className="rounded-full bg-secondary-100 px-3 py-1 text-sm font-semibold text-secondary-900">
                  {radio} m
                </span>
              </div>
              {coords ? (
                <LiderMap
                  lat={coords.lat}
                  lng={coords.lng}
                  nombre={v?.nombre || 'Líder'}
                  radioM={radio}
                  color="#D73216"
                  otros={otros}
                  height="420px"
                />
              ) : (
                <div className="flex h-[420px] flex-col items-center justify-center rounded-xl border border-dashed border-secondary-300 bg-secondary-50">
                  <Icon name="mapa" size={40} className="mb-3 text-secondary-400" />
                  <p className="text-secondary-700">Este líder no tiene coordenadas registradas.</p>
                  <Link href={`/dashboard/lideres/${id}/editar`} className="mt-2 text-primary-600 hover:underline">
                    Asignar ubicación
                  </Link>
                </div>
              )}
            </div>
          )}

          {tab === 'hijos' && (
            <div className="space-y-3">
              {(lider.lideresHijos || []).length === 0 ? (
                <p className="text-secondary-500">No tiene líderes hijos registrados.</p>
              ) : (
                lider.lideresHijos!.map((hijo) => (
                  <Link
                    key={hijo.id}
                    href={`/dashboard/lideres/${hijo.id}`}
                    className="flex items-center justify-between rounded-lg border border-secondary-100 bg-white p-3 hover:border-primary-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-100 text-secondary-600">
                        <Icon name="lideres" size={20} />
                      </div>
                      <p className="font-medium text-secondary-900">{hijo.votante?.nombre || 'Sin nombre'}</p>
                    </div>
                    <span className="text-sm text-secondary-500">Score {hijo.score}</span>
                  </Link>
                ))
              )}
            </div>
          )}

          {tab === 'actividad' && (
            <div className="space-y-3">
              {actividad.recorridos.length === 0 ? (
                <p className="text-secondary-500">No hay recorridos registrados.</p>
              ) : (
                actividad.recorridos.map((r: any) => (
                  <div key={r.id} className="rounded-lg border border-secondary-100 bg-white p-3">
                    <p className="font-medium text-secondary-900">Recorrido {r.id?.slice(0, 8)}</p>
                    <p className="text-sm text-secondary-500">{formatFecha(r.created_at || r.fecha)}</p>
                    {r.usuario_nombre && <p className="text-sm text-secondary-500">Por: {r.usuario_nombre}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'apoyos' && (
            <div className="space-y-3">
              {actividad.apoyos.length === 0 ? (
                <p className="text-secondary-500">No hay apoyos entregados bajo este líder.</p>
              ) : (
                actividad.apoyos.map((a: any) => (
                  <div key={a.id} className="rounded-lg border border-secondary-100 bg-white p-3">
                    <p className="font-medium text-secondary-900">{a.tipo_apoyo}</p>
                    {a.votante?.nombre && <p className="text-sm text-secondary-600">A: {a.votante.nombre}</p>}
                    <p className="text-sm text-secondary-500">
                      {a.cantidad} unidad(es) • {formatFecha(a.fecha_entrega)}
                    </p>
                    {a.verificado && (
                      <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                        Verificado
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatFecha(fecha?: string) {
  if (!fecha) return '';
  try {
    return format(new Date(fecha), "d 'de' MMMM, h:mm a", { locale: es });
  } catch {
    return fecha;
  }
}
