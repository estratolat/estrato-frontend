'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { eventosApi } from '@/lib/api';
import { Evento } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { useInformeIne, Responsable, ChecklistItem, CONCEPTOS_NUMERALIA, RESPONSABLE_LABEL } from '@/hooks/useInformeIne';
import {
  ClipboardDocumentCheckIcon,
  CalculatorIcon,
  FolderOpenIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
} from '@heroicons/react/24/solid';
import { XLSXIconPlaceholder } from '@/components/informes-ine/XlsxIcon';

type Tab = 'checklist' | 'numeralia' | 'documentos' | 'eventos';

export default function InformesInePage() {
  const router = useRouter();
  const { user } = useAuth();
  const tenantId = user?.tenant_id || 'default';
  const {
    state,
    toggleCheck,
    setNumeralia,
    setNotas,
    setPeriodo,
    setTipo,
    reset,
    items,
    conceptos,
    progreso,
  } = useInformeIne(tenantId);

  const [activeTab, setActiveTab] = useState<Tab>('checklist');
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loadingEventos, setLoadingEventos] = useState(false);
  const [filtroResponsable, setFiltroResponsable] = useState<Responsable | 'todos'>('todos');

  useEffect(() => {
    if (activeTab === 'eventos') {
      loadEventos();
    }
  }, [activeTab]);

  const loadEventos = async () => {
    try {
      setLoadingEventos(true);
      const { data } = await eventosApi.getAll({ limit: 1000 });
      setEventos(data || []);
    } catch (err: any) {
      console.error('Error cargando eventos:', err);
    } finally {
      setLoadingEventos(false);
    }
  };

  const exportarEventosCSV = () => {
    const rows = eventos.map((e) => ({
      id: e.id,
      nombre: e.nombre,
      descripcion: e.descripcion || '',
      fecha_inicio: e.fecha_inicio,
      fecha_fin: e.fecha_fin || '',
      direccion: e.direccion || '',
      lat: e.coordenadas?.lat ?? '',
      lng: e.coordenadas?.lng ?? '',
      tematica: e.tematica || '',
      status: e.status,
      asistentes_estimados: e.asistentes_estimados ?? '',
      asistentes_registrados: e.asistencias?.length ?? 0,
    }));

    if (rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = (r as any)[h];
            const str = val == null ? '' : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eventos_politicos_sif_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarEventosXLSX = async () => {
    // Placeholder: implementación real requiere xlsx.js.
    // Por ahora redirige al CSV con aviso.
    exportarEventosCSV();
  };

  const filteredItems = useMemo(() => {
    if (filtroResponsable === 'todos') return items;
    return items.filter((i) => i.responsable === filtroResponsable);
  }, [items, filtroResponsable]);

  const responsablesOptions: { key: Responsable | 'todos'; label: string; icon: any }[] = [
    { key: 'todos', label: 'Todos', icon: UserCircleIcon },
    { key: 'responsable_finanzas', label: 'Finanzas', icon: BanknotesIcon },
    { key: 'contador', label: 'Contador', icon: BuildingOfficeIcon },
    { key: 'operador_estrato', label: 'Operador ESTRATO', icon: UserCircleIcon },
    { key: 'candidato', label: 'Candidato', icon: UserCircleIcon },
  ];

  const tabs = [
    { id: 'checklist', label: 'Checklist General', icon: ClipboardDocumentCheckIcon },
    { id: 'numeralia', label: 'Numeralia de Gastos', icon: CalculatorIcon },
    { id: 'documentos', label: 'Documentación Adjunta', icon: FolderOpenIcon },
    { id: 'eventos', label: 'Eventos para SIF', icon: CalendarDaysIcon },
  ] as { id: Tab; label: string; icon: any }[];

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Informes de Campaña INE</h2>
          <p className="text-sm text-secondary-600">
            Preparación, numeralia, documentación y exportación para el SIF V2.0
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-secondary-50 px-3 py-2 text-sm">
            <span className="font-semibold text-secondary-700">Progreso:</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary-200">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${progreso.porcentaje}%` }}
              />
            </div>
            <span className="font-bold text-primary-700">{progreso.completados}/{progreso.total}</span>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded-lg border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-600 transition hover:bg-secondary-50"
            title="Reiniciar progreso guardado"
          >
            <ArrowPathIcon className="h-4 w-4" /> Reiniciar
          </button>
        </div>
      </div>

      {/* Selector periodo/tipo */}
      <div className="mb-6 grid gap-3 rounded-xl border border-secondary-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-secondary-500">Periodo del informe</label>
          <select
            value={state.periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="input w-full"
          >
            <option value="">Selecciona periodo</option>
            <option value="1">Periodo 1</option>
            <option value="2">Periodo 2</option>
            <option value="3">Periodo 3</option>
            <option value="cierre">Informe de Cierre</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-secondary-500">Tipo de informe</label>
          <select
            value={state.tipo}
            onChange={(e) => setTipo(e.target.value as 'normal' | 'ajuste')}
            className="input w-full"
          >
            <option value="normal">Normal</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase text-secondary-500">Última actualización</label>
          <p className="text-sm text-secondary-700">
            {state.lastUpdated
              ? new Date(state.lastUpdated).toLocaleString('es-MX')
              : 'Sin cambios guardados'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-secondary-600 shadow-sm hover:bg-secondary-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div className="rounded-xl border border-secondary-200 bg-white p-4 shadow-sm md:p-6">
        {activeTab === 'checklist' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-bold text-secondary-900">Checklist de preparación</h3>
              <select
                value={filtroResponsable}
                onChange={(e) => setFiltroResponsable(e.target.value as any)}
                className="input w-full sm:w-auto"
              >
                {responsablesOptions.map((r) => (
                  <option key={r.key} value={r.key}>
                    {RESPONSABLE_LABEL[r.key] || 'Todos'}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredItems.map((item) => (
                <ChecklistCard key={item.id} item={item} checked={!!state.checklist[item.id]} onToggle={() => toggleCheck(item.id)} />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="text-center text-sm text-secondary-500">No hay tareas para este responsable.</p>
            )}
          </div>
        )}

        {activeTab === 'numeralia' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <strong>Importante:</strong> la numeralia no es el monto gastado, sino la cantidad física de cada
              concepto (número de bardas, volantes, espectaculares, eventos, etc.).
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary-50 text-left text-xs font-semibold uppercase text-secondary-600">
                  <tr>
                    <th className="px-3 py-2">Concepto</th>
                    <th className="px-3 py-2">Unidad</th>
                    <th className="px-3 py-2">Gasto Directo</th>
                    <th className="px-3 py-2">Gasto Centralizado</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {conceptos.map((c) => {
                    const val = state.numeralia[c.id];
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2 font-medium text-secondary-900">{c.concepto}</td>
                        <td className="px-3 py-2 text-secondary-500">{c.unidad}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={val.directo}
                            onChange={(e) => setNumeralia(c.id, 'directo', parseInt(e.target.value, 10))}
                            className="input w-24"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={val.centralizado}
                            onChange={(e) => setNumeralia(c.id, 'centralizado', parseInt(e.target.value, 10))}
                            className="input w-24"
                          />
                        </td>
                        <td className="px-3 py-2 font-semibold text-secondary-900">
                          {(val.directo || 0) + (val.centralizado || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'documentos' && <DocumentosSection />}

        {activeTab === 'eventos' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-secondary-900">Eventos políticos para el Anexo de Eventos</h3>
                <p className="text-sm text-secondary-600">
                  Exporta los eventos registrados en ESTRATO y entrégalos al contador para carga en el SIF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportarEventosCSV}
                  disabled={eventos.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" /> Descargar CSV
                </button>
              </div>
            </div>
            {loadingEventos ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            ) : eventos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-secondary-300 p-8 text-center">
                <CalendarDaysIcon className="mx-auto mb-2 h-10 w-10 text-secondary-300" />
                <p className="text-sm text-secondary-600">No hay eventos registrados.</p>
                <button
                  onClick={() => router.push('/dashboard/eventos/nuevo')}
                  className="mt-3 text-sm font-semibold text-primary-600 hover:underline"
                >
                  Crear primer evento →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-secondary-200">
                <table className="w-full text-sm">
                  <thead className="bg-secondary-50 text-left text-xs font-semibold uppercase text-secondary-600">
                    <tr>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Fecha inicio</th>
                      <th className="px-3 py-2">Dirección</th>
                      <th className="px-3 py-2">Temática</th>
                      <th className="px-3 py-2">Asistentes</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {eventos.slice(0, 50).map((e) => (
                      <tr key={e.id}>
                        <td className="px-3 py-2 font-medium text-secondary-900">{e.nombre}</td>
                        <td className="px-3 py-2 text-secondary-600">
                          {new Date(e.fecha_inicio).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="px-3 py-2 text-secondary-600">{e.direccion || '-'}</td>
                        <td className="px-3 py-2 text-secondary-600">{e.tematica || '-'}</td>
                        <td className="px-3 py-2 text-secondary-600">{e.asistencias?.length ?? 0}</td>
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-700">
                            {e.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {eventos.length > 50 && (
                  <p className="px-3 py-2 text-xs text-secondary-500">
                    Mostrando 50 de {eventos.length} eventos. Descarga el CSV para ver todos.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notas generales */}
      <div className="mt-6 rounded-xl border border-secondary-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-secondary-900">Notas generales del informe</label>
        <textarea
          value={state.notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Anotaciones, pendientes, observaciones del contador..."
          className="input w-full"
        />
      </div>
    </div>
  );
}

function ChecklistCard({ item, checked, onToggle }: { item: ChecklistItem; checked: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
        checked ? 'border-primary-200 bg-primary-50/50' : 'border-secondary-200 bg-white hover:bg-secondary-50/70'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {checked ? (
          <CheckCircleIcon className="h-6 w-6 text-primary-600" />
        ) : (
          <div className="h-6 w-6 rounded-full border-2 border-secondary-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${checked ? 'text-primary-900 line-through' : 'text-secondary-900'}`}>
          {item.label}
        </p>
        {item.ayuda && <p className="mt-1 text-xs text-secondary-500">{item.ayuda}</p>}
        <span className="mt-2 inline-block rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] font-medium text-secondary-700">
          {RESPONSABLE_LABEL[item.responsable]}
        </span>
      </div>
    </div>
  );
}

function DocumentosSection() {
  const documentos = [
    { id: 1, nombre: 'Contratos de apertura y cierre de cuentas bancarias', extension: 'PDF', responsable: 'contador' },
    { id: 2, nombre: 'Estados de cuenta bancarios', extension: 'PDF', responsable: 'contador' },
    { id: 3, nombre: 'Conciliaciones bancarias', extension: 'PDF', responsable: 'contador' },
    { id: 4, nombre: 'Acuerdo de participación registrado ante el Instituto', extension: 'PDF', responsable: 'responsable_finanzas' },
    { id: 5, nombre: 'Inventario de Activo Fijo', extension: 'Excel', responsable: 'contador' },
    { id: 6, nombre: 'Controles de folios de recibos de simpatizantes', extension: 'Excel', responsable: 'contador' },
    { id: 7, nombre: 'Controles de folios de recibos de militantes', extension: 'Excel', responsable: 'contador' },
    { id: 8, nombre: 'Controles de folios de recibos REPAP', extension: 'Excel', responsable: 'contador' },
    { id: 9, nombre: 'Relación pormenorizada de gastos de propaganda en diarios, revistas e impresos', extension: 'Excel', responsable: 'contador' },
    { id: 10, nombre: 'Relación pormenorizada de gastos en anuncios espectaculares', extension: 'Excel', responsable: 'operador_estrato' },
    { id: 11, nombre: 'Relación pormenorizada de gastos de propaganda en bardas', extension: 'Excel', responsable: 'operador_estrato' },
    { id: 12, nombre: 'Relación pormenorizada de gastos de propaganda en salas de cine', extension: 'Excel', responsable: 'contador' },
    { id: 13, nombre: 'Relación pormenorizada de gastos de propaganda en páginas de internet', extension: 'Excel', responsable: 'contador' },
    { id: 14, nombre: 'Formato REL-PROM: diarios, revistas e impresos', extension: 'Excel', responsable: 'contador' },
    { id: 15, nombre: 'Formato REL-PROM: producción de mensajes para radio y televisión', extension: 'Excel', responsable: 'contador' },
    { id: 16, nombre: 'Formato REL-PROM: anuncios espectaculares', extension: 'Excel', responsable: 'contador' },
    { id: 17, nombre: 'Formato REL-PROM: propaganda en salas de cine', extension: 'Excel', responsable: 'contador' },
    { id: 18, nombre: 'Formato REL-PROM: propaganda en páginas de internet', extension: 'Excel', responsable: 'contador' },
    { id: 19, nombre: 'Formato REL-VIAT-GOB: viáticos y pasajes (Gobernador)', extension: 'Excel', responsable: 'contador' },
    { id: 20, nombre: 'Audios y transcripción de llamadas al 01-900', extension: 'Audio/Excel', responsable: 'operador_estrato' },
    { id: 21, nombre: 'Credencial de Elector del Candidato/Candidato Independiente', extension: 'PDF', responsable: 'candidato' },
    { id: 22, nombre: 'Integración del saldo final de bancos, cuentas por cobrar y cuentas por pagar', extension: 'Excel', responsable: 'contador' },
    { id: 23, nombre: 'Relación de proveedores y prestadores de servicios >500 y >5000 DSM', extension: 'Excel', responsable: 'contador' },
    { id: 24, nombre: 'Expedientes de proveedores >5000 DSM', extension: 'Excel', responsable: 'contador' },
    { id: 25, nombre: 'Otros adjuntos', extension: 'PDF/Excel/Audio/Video', responsable: 'todos' },
    { id: 26, nombre: 'Retroalimentación al Oficio de Errores y Omisiones', extension: 'PDF/Excel/Audio/Video', responsable: 'responsable_finanzas' },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
        <ExclamationTriangleIcon className="mb-1 inline h-4 w-4" /> Límite de 600 MB por informe. Si se excede,
        cargar póliza contable en $0.00 con concepto "Documentación Adjunta al Informe Adicional".
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 text-left text-xs font-semibold uppercase text-secondary-600">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Documento</th>
              <th className="px-3 py-2">Formato</th>
              <th className="px-3 py-2">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100">
            {documentos.map((d) => (
              <tr key={d.id}>
                <td className="px-3 py-2 text-secondary-500">{d.id}</td>
                <td className="px-3 py-2 font-medium text-secondary-900">{d.nombre}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-secondary-100 px-2 py-0.5 text-[10px] font-semibold text-secondary-700">
                    {d.extension}
                  </span>
                </td>
                <td className="px-3 py-2 text-secondary-700">{RESPONSABLE_LABEL[d.responsable as Responsable]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
