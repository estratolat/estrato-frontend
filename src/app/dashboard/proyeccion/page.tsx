'use client';

import { useEffect, useState } from 'react';
import { proyeccionApi } from '@/lib/api';
import { ProyeccionSeccion, MetaVotacion } from '@/types';
import { Target, TrendingUp, TrendingDown, Minus, Save, Trash2, Plus } from 'lucide-react';

const tendenciaColors: Record<string, string> = {
  arriba: 'bg-green-100 text-green-700',
  peleado: 'bg-yellow-100 text-yellow-700',
  abajo: 'bg-red-100 text-red-700',
  sin_datos: 'bg-gray-100 text-gray-700',
};

const tendenciaIcons: Record<string, any> = {
  arriba: TrendingUp,
  peleado: Minus,
  abajo: TrendingDown,
  sin_datos: Minus,
};

export default function ProyeccionPage() {
  const [resumen, setResumen] = useState<any>(null);
  const [secciones, setSecciones] = useState<ProyeccionSeccion[]>([]);
  const [metas, setMetas] = useState<MetaVotacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMetaForm, setShowMetaForm] = useState(false);
  const [metaForm, setMetaForm] = useState({ seccion: '', proceso: '2027', meta_votos: '', meta_lista_nominal: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, sec, mets] = await Promise.all([
        proyeccionApi.getResumen(),
        proyeccionApi.getSecciones(),
        proyeccionApi.getMetas({}),
      ]);
      setResumen(res.data);
      setSecciones(sec.data || []);
      setMetas(mets.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaForm.seccion || !metaForm.meta_votos) return;
    try {
      await proyeccionApi.createMeta({
        seccion: metaForm.seccion,
        proceso: metaForm.proceso,
        meta_votos: parseInt(metaForm.meta_votos, 10),
        meta_lista_nominal: metaForm.meta_lista_nominal ? parseInt(metaForm.meta_lista_nominal, 10) : undefined,
      });
      setShowMetaForm(false);
      setMetaForm({ seccion: '', proceso: '2027', meta_votos: '', meta_lista_nominal: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar meta');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Proyección de Votaciones</h2>
          <p className="text-secondary-600">Compara simpatizantes, metas y tendencia por sección</p>
        </div>
        <button onClick={() => setShowMetaForm(!showMetaForm)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> {showMetaForm ? 'Cancelar' : 'Nueva meta'}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <p className="text-sm text-secondary-600">Simpatizantes</p>
          <p className="text-2xl font-bold text-secondary-900">{(resumen?.votantes_registrados || 0).toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary-600">Meta total</p>
          <p className="text-2xl font-bold text-secondary-900">{(resumen?.meta_votos_total || 0).toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary-600">Apoyos</p>
          <p className="text-2xl font-bold text-secondary-900">{(resumen?.apoyos_registrados || 0).toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-secondary-600">Brecha vs meta</p>
          <p className={`text-2xl font-bold ${(resumen?.brecha || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {(resumen?.brecha || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {showMetaForm && (
        <form onSubmit={handleSaveMeta} className="card grid gap-4 sm:grid-cols-4">
          <input
            type="text"
            value={metaForm.seccion}
            onChange={(e) => setMetaForm({ ...metaForm, seccion: e.target.value })}
            placeholder="Sección"
            className="input"
            required
          />
          <input
            type="text"
            value={metaForm.proceso}
            onChange={(e) => setMetaForm({ ...metaForm, proceso: e.target.value })}
            placeholder="Proceso"
            className="input"
            required
          />
          <input
            type="number"
            value={metaForm.meta_votos}
            onChange={(e) => setMetaForm({ ...metaForm, meta_votos: e.target.value })}
            placeholder="Meta de votos"
            className="input"
            required
          />
          <div className="flex gap-2">
            <input
              type="number"
              value={metaForm.meta_lista_nominal}
              onChange={(e) => setMetaForm({ ...metaForm, meta_lista_nominal: e.target.value })}
              placeholder="Lista nominal"
              className="input flex-1"
            />
            <button type="submit" className="btn-primary flex items-center gap-2 px-4">
              <Save size={18} />
            </button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-secondary-200 bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Sección</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Simp.</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Líderes</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Meta votos</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Votos estim.</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Faltan</th>
                <th className="px-4 py-3 text-left font-medium text-secondary-600">Tendencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {secciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">No hay datos de proyección.</td>
                </tr>
              ) : (
                secciones.map((s) => {
                  const Icon = tendenciaIcons[s.tendencia] || Minus;
                  return (
                    <tr key={s.seccion}>
                      <td className="px-4 py-3 font-medium text-secondary-900">Sección {s.seccion}</td>
                      <td className="px-4 py-3 text-secondary-600">{s.votantes}</td>
                      <td className="px-4 py-3 text-secondary-600">{s.lideres}</td>
                      <td className="px-4 py-3 text-secondary-600">{s.meta_votos?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3 text-secondary-600">{s.votos_estimados.toLocaleString()}</td>
                      <td className="px-4 py-3 text-secondary-600">{s.faltan_para_ganar?.toLocaleString() || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tendenciaColors[s.tendencia]}`}>
                          <Icon size={12} /> {s.tendencia.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
