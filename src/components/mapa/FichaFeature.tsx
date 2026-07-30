'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { X, MapPin, ExternalLink, Edit3, Users, Crown, Gift, Calendar, FileText, GripVertical } from 'lucide-react';
import { ElementoCapa } from './ExploradorCapa';
import { mapaApi, resultadosHistoricosApi } from '@/lib/api';
import { errorToString } from '@/lib/error-utils';

interface Props {
  elemento: ElementoCapa | null;
  onCerrar: () => void;
  onVerDetalle?: (elemento: ElementoCapa) => void;
  onEditar?: (elemento: ElementoCapa) => void;
}

function formatearPropiedad(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/^feature /i, '')
    .replace(/^id$/i, 'ID')
    .replace(/^[a-z]/, (m) => m.toUpperCase());
}

function esValorInteresante(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object') return true;
  return true;
}

function formatearValor(value: any): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80);
  return String(value);
}

interface CruceResumen {
  votantes: { count: number };
  lideres: { count: number };
  apoyos: { count: number };
  eventos: { count: number };
  peticiones: { count: number };
}

interface DatosOficiales {
  partido_ganador?: string | null;
  votos_ganador?: number | null;
  votos_totales?: number | null;
  participacion_pct?: number | null;
}

const POS_INICIAL = { x: 16, y: 80 };

export default function FichaFeature({ elemento, onCerrar, onVerDetalle, onEditar }: Props) {
  const [cruce, setCruce] = useState<CruceResumen | null>(null);
  const [datosOficiales, setDatosOficiales] = useState<DatosOficiales | null>(null);
  const [historicoCompleto, setHistoricoCompleto] = useState<any[]>([]);
  const [cargandoHistorico, setCargandoHistorico] = useState(false);
  const [cargandoCruce, setCargandoCruce] = useState(false);
  const [errorCruce, setErrorCruce] = useState<string | null>(null);
  const [pos, setPos] = useState(POS_INICIAL);
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const seccion = elemento?.feature?.properties?.seccion || elemento?.feature?.properties?.SECCION || elemento?.feature?.properties?._feature_metadata?.seccion || null;

  useEffect(() => {
    if (!elemento?.capaId || !elemento?.id) {
      setCruce(null);
      setDatosOficiales(null);
      setHistoricoCompleto([]);
      return;
    }
    const featureId = elemento.featureId || elemento.id.split('-').slice(1).join('-') || elemento.id;
    const cargar = async () => {
      try {
        setCargandoCruce(true);
        setCargandoHistorico(true);
        setErrorCruce(null);
        const { data } = await mapaApi.cruceFeature(elemento.capaId, featureId);
        setCruce(data.resumen || null);
        setDatosOficiales(data.datos_oficiales || null);

        const seccionBusqueda = elemento?.feature?.properties?.seccion || elemento?.feature?.properties?.SECCION || data?.seccion || null;
        if (seccionBusqueda) {
          try {
            const res = await resultadosHistoricosApi.getAll({ seccion: seccionBusqueda, limit: 50 });
            setHistoricoCompleto(res.data?.resultados || res.data || []);
          } catch (e) {
            console.error('Error cargando histórico completo:', e);
            setHistoricoCompleto([]);
          }
        } else {
          setHistoricoCompleto([]);
        }
      } catch (err) {
        setErrorCruce(errorToString(err));
      } finally {
        setCargandoCruce(false);
        setCargandoHistorico(false);
      }
    };
    cargar();
  }, [elemento]);

  // Resetear posición cuando cambia el elemento, para que no quede perdida fuera de pantalla
  useEffect(() => {
    setPos(prev => ({
      x: Math.max(8, Math.min((window.innerWidth || 800) - 320, prev.x)),
      y: Math.max(8, Math.min((window.innerHeight || 600) - 200, prev.y)),
    }));
  }, [elemento?.id]);

  const iniciarDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { dragging: true, startX: clientX, startY: clientY, initialX: pos.x, initialY: pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current?.dragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const dx = clientX - dragRef.current.startX;
      const dy = clientY - dragRef.current.startY;
      const ancho = wrapperRef.current?.offsetWidth || 320;
      const alto = wrapperRef.current?.offsetHeight || 360;
      setPos({
        x: Math.max(8, Math.min((window.innerWidth || 800) - ancho, dragRef.current.initialX + dx)),
        y: Math.max(8, Math.min((window.innerHeight || 600) - alto, dragRef.current.initialY + dy)),
      });
    };
    const onEnd = () => {
      if (dragRef.current) dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  if (!elemento) return null;

  const props = elemento.feature?.properties || {};
  const metadata = props._feature_metadata || {};
  const entries = Object.entries(props).filter(([k, v]) =>
    !['_feature_color', '_feature_nombre', '_feature_id', '_feature_opacidad', '_feature_bloqueado', '_feature_metadata', 'geometry', 'capa_id', 'capa_nombre', 'capa_tipo', 'capa_origen', 'color'].includes(k) && esValorInteresante(v)
  );

  const tarjetas = [
    { key: 'votantes', label: 'Votantes', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'lideres', label: 'Líderes', icon: Crown, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'apoyos', label: 'Apoyos', icon: Gift, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'eventos', label: 'Eventos', icon: Calendar, color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'peticiones', label: 'Peticiones', icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ] as const;

  return (
    <div
      ref={wrapperRef}
      className="fixed z-[650] w-[92vw] max-w-sm lg:w-80"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="rounded-xl border border-secondary-200 bg-white p-3 shadow-xl">
        <div
          onMouseDown={iniciarDrag}
          onTouchStart={iniciarDrag}
          className="mb-2 flex cursor-grab items-center justify-between gap-2 rounded-lg bg-secondary-50/70 px-2 py-1.5 active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-secondary-400" />
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: elemento.color || '#3B82F6' }}
            >
              <MapPin size={13} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-secondary-900">{elemento.nombre}</p>
              <p className="truncate text-[10px] text-secondary-500">{elemento.capaNombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onEditar && (
              <button
                onClick={() => onEditar(elemento)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary-400 transition hover:bg-primary-50 hover:text-primary-600"
                title="Editar polígono"
              >
                <Edit3 size={14} />
              </button>
            )}
            <button
              onClick={onCerrar}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
              title="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-44 overflow-y-auto px-1">
          {metadata.tags?.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {metadata.tags.map((t: string) => (
                <span key={t} className="rounded-full bg-secondary-100 px-2 py-0.5 text-[10px] font-medium text-secondary-700">
                  {t}
                </span>
              ))}
            </div>
          )}

          {metadata.seccion && (
            <p className="mb-1 text-xs text-secondary-600">
              Sección: <span className="font-semibold">{metadata.seccion}</span>
            </p>
          )}

          {entries.length === 0 ? (
            <p className="text-xs text-secondary-500">No hay propiedades adicionales.</p>
          ) : (
            <div className="space-y-1">
              {entries.slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-2 text-xs">
                  <span className="font-medium text-secondary-600">{formatearPropiedad(key)}:</span>
                  <span className="max-w-[60%] text-right text-secondary-800">{formatearValor(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {seccion && (
          <div className="mt-3 border-t border-secondary-100 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase text-secondary-500">Histórico electoral</p>
            <p className="mb-2 text-[10px] text-secondary-500">Sección detectada: <span className="font-semibold text-secondary-700">{seccion}</span></p>

            {datosOficiales && (datosOficiales.partido_ganador || datosOficiales.votos_totales) && (
              <div className="mb-2 space-y-1.5 rounded-lg bg-secondary-50 p-2">
                {datosOficiales.partido_ganador && (
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-medium text-secondary-600">Partido ganador:</span>
                    <span className="max-w-[60%] text-right font-semibold text-secondary-900">{datosOficiales.partido_ganador}</span>
                  </div>
                )}
                {datosOficiales.votos_ganador != null && (
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-medium text-secondary-600">Votos ganador:</span>
                    <span className="max-w-[60%] text-right text-secondary-800">{Number(datosOficiales.votos_ganador).toLocaleString()}</span>
                  </div>
                )}
                {datosOficiales.votos_totales != null && (
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-medium text-secondary-600">Votos totales:</span>
                    <span className="max-w-[60%] text-right text-secondary-800">{Number(datosOficiales.votos_totales).toLocaleString()}</span>
                  </div>
                )}
                {datosOficiales.participacion_pct != null && (
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-medium text-secondary-600">Participación:</span>
                    <span className="max-w-[60%] text-right text-secondary-800">{Number(datosOficiales.participacion_pct).toFixed(2)}%</span>
                  </div>
                )}
              </div>
            )}

            {cargandoHistorico ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-secondary-500">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                Cargando histórico...
              </div>
            ) : historicoCompleto.length > 0 ? (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-secondary-100">
                <table className="w-full text-[10px]">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-2 py-1 text-left font-semibold text-secondary-600">Año</th>
                      <th className="px-2 py-1 text-left font-semibold text-secondary-600">Elección</th>
                      <th className="px-2 py-1 text-left font-semibold text-secondary-600">Ganador</th>
                      <th className="px-2 py-1 text-right font-semibold text-secondary-600">Votos</th>
                      <th className="px-2 py-1 text-right font-semibold text-secondary-600">Particip.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoCompleto.map((h, idx) => (
                      <tr key={idx} className="border-t border-secondary-100">
                        <td className="px-2 py-1 text-secondary-900">{h.anio}</td>
                        <td className="px-2 py-1 capitalize text-secondary-700">{String(h.tipo_eleccion).replace(/_/g, ' ')}</td>
                        <td className="px-2 py-1 font-medium text-secondary-900">{h.partido_ganador || '-'}</td>
                        <td className="px-2 py-1 text-right text-secondary-800">{h.total_votos != null ? Number(h.total_votos).toLocaleString() : '-'}</td>
                        <td className="px-2 py-1 text-right text-secondary-800">{h.participacion_pct != null ? `${Number(h.participacion_pct).toFixed(2)}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-[10px] text-secondary-500">No hay histórico cargado para la sección {seccion}.</p>
            )}
          </div>
        )}

        <div className="mt-3 border-t border-secondary-100 pt-3">
          <p className="mb-2 text-[10px] font-semibold uppercase text-secondary-500">Datos de campaña dentro</p>
          {cargandoCruce ? (
            <div className="flex items-center gap-2 text-xs text-secondary-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              Calculando...
            </div>
          ) : errorCruce ? (
            <p className="text-xs text-red-600">{errorCruce}</p>
          ) : cruce ? (
            <div className="grid grid-cols-3 gap-2">
              {tarjetas.map(({ key, label, icon: Icon, color, bg }) => {
                const count = (cruce as any)[key]?.count ?? 0;
                return (
                  <div key={key} className={`rounded-lg ${bg} p-2 text-center`}>
                    <Icon size={14} className={`mx-auto mb-1 ${color}`} />
                    <p className="text-sm font-bold text-secondary-900">{count}</p>
                    <p className="text-[10px] text-secondary-600">{label}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {onVerDetalle && (
          <button
            onClick={() => onVerDetalle(elemento)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-50 py-2 text-xs font-semibold text-primary-700 transition hover:bg-primary-100"
          >
            <ExternalLink size={14} /> Ver detalle completo
          </button>
        )}
      </div>
    </div>
  );
}
