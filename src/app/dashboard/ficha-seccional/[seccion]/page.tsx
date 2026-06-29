'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fichasApi } from '@/lib/api';
import { FichaSeccional } from '@/types';
import { Users, HandHeart, Crown, Calendar, MessageSquare, MapPin, ChevronLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const tendenciaConfig: Record<string, { label: string; color: string; icon: any }> = {
  arriba: { label: 'Vamos arriba', color: 'bg-green-100 text-green-700', icon: TrendingUp },
  peleado: { label: 'Peleado', color: 'bg-yellow-100 text-yellow-700', icon: Minus },
  abajo: { label: 'Hay que remontar', color: 'bg-red-100 text-red-700', icon: TrendingDown },
  sin_datos: { label: 'Sin datos', color: 'bg-gray-100 text-gray-700', icon: Minus },
};

export default function FichaSeccionalDetallePage() {
  const { seccion } = useParams();
  const router = useRouter();
  const [ficha, setFicha] = useState<FichaSeccional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!seccion) return;
    loadFicha();
  }, [seccion]);

  const loadFicha = async () => {
    try {
      setLoading(true);
      const { data } = await fichasApi.getFicha(seccion as string);
      setFicha(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!ficha) {
    return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">No se pudo cargar la ficha.</div>;
  }

  const tendencia = ficha.proyeccion?.tendencia || 'sin_datos';
  const TIcon = tendenciaConfig[tendencia].icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/ficha-seccional')} className="rounded-md p-2 hover:bg-secondary-100">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Ficha Seccional {ficha.seccion}</h2>
          <p className="text-secondary-600">Resumen territorial y proyección</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatBox icon={Users} label="Simpatizantes" value={ficha.votantes} color="bg-blue-100 text-blue-600" />
        <StatBox icon={Crown} label="Líderes" value={ficha.lideres} color="bg-purple-100 text-purple-600" />
        <StatBox icon={HandHeart} label="Apoyos entregados" value={ficha.apoyos} color="bg-orange-100 text-orange-600" />
        <StatBox icon={Calendar} label="Eventos" value={ficha.eventos} color="bg-pink-100 text-pink-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-secondary-900">Proyección</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-secondary-50 p-4">
              <p className="text-xs text-secondary-500 uppercase">Lista nominal</p>
              <p className="text-xl font-bold text-secondary-900">{ficha.lista_nominal_2024?.toLocaleString() || '-'}</p>
            </div>
            <div className="rounded-lg bg-secondary-50 p-4">
              <p className="text-xs text-secondary-500 uppercase">Meta de votos</p>
              <p className="text-xl font-bold text-secondary-900">{ficha.proyeccion?.meta_votos?.toLocaleString() || '-'}</p>
            </div>
            <div className="rounded-lg bg-secondary-50 p-4">
              <p className="text-xs text-secondary-500 uppercase">Votos estimados</p>
              <p className="text-xl font-bold text-secondary-900">{ficha.proyeccion?.votos_estimados?.toLocaleString() || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${tendenciaConfig[tendencia].color}`}>
              <TIcon size={16} />
              {tendenciaConfig[tendencia].label}
            </span>
            {ficha.proyeccion?.faltan_para_ganar !== undefined && (
              <span className="text-sm text-secondary-600">Faltan {ficha.proyeccion.faltan_para_ganar.toLocaleString()} votos para ganar</span>
            )}
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="text-lg font-bold text-secondary-900">Resultados históricos</h3>
          {ficha.resultados?.length ? (
            ficha.resultados.map((r) => (
              <div key={r.anio} className="flex items-center justify-between rounded-lg bg-secondary-50 p-3">
                <span className="font-bold text-secondary-900">{r.anio}</span>
                <div className="text-right">
                  <p className="text-sm font-medium text-secondary-900">{r.partido_ganador}</p>
                  <p className="text-xs text-secondary-500">{r.votos_totales?.toLocaleString()} votos</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-secondary-500">No hay resultados históricos para esta sección.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 text-lg font-bold text-secondary-900">Casillas en la sección</h3>
        {ficha.casillas.length === 0 ? (
          <p className="text-sm text-secondary-500">No hay casillas registradas.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ficha.casillas.map((c) => (
              <div key={c.id} className="rounded-lg border border-secondary-100 bg-secondary-50/50 p-3">
                <div className="flex items-center gap-2 text-secondary-900">
                  <MapPin size={16} className="text-primary-600" />
                  <span className="font-bold capitalize">{c.tipo}{c.numero ? ` ${c.numero}` : ''}</span>
                </div>
                <p className="text-sm text-secondary-600">{c.ubicacion || 'Sin ubicación'}</p>
                <p className="text-xs text-secondary-500">{c.direccion || ''}</p>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tendenciaConfig[c.status === 'incidencia' ? 'abajo' : c.status === 'cerrada' ? 'arriba' : 'sin_datos'].color}`}>
                  {c.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-bold text-secondary-900">{value.toLocaleString()}</p>
        <p className="text-sm text-secondary-600">{label}</p>
      </div>
    </div>
  );
}
