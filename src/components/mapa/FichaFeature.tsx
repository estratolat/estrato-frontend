'use client';

import { useEffect, useState } from 'react';
import { X, MapPin, ExternalLink, Edit3, Users, Crown, Gift, Calendar, FileText } from 'lucide-react';
import { ElementoCapa } from './ExploradorCapa';
import { mapaApi } from '@/lib/api';
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

export default function FichaFeature({ elemento, onCerrar, onVerDetalle, onEditar }: Props) {
  const [cruce, setCruce] = useState<CruceResumen | null>(null);
  const [cargandoCruce, setCargandoCruce] = useState(false);
  const [errorCruce, setErrorCruce] = useState<string | null>(null);

  useEffect(() => {
    if (!elemento?.capaId || !elemento?.id) {
      setCruce(null);
      return;
    }
    const featureId = elemento.featureId || elemento.id.split('-').slice(1).join('-') || elemento.id;
    const cargar = async () => {
      try {
        setCargandoCruce(true);
        setErrorCruce(null);
        const { data } = await mapaApi.cruceFeature(elemento.capaId, featureId);
        setCruce(data.resumen || null);
      } catch (err) {
        setErrorCruce(errorToString(err));
      } finally {
        setCargandoCruce(false);
      }
    };
    cargar();
  }, [elemento]);

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
    <div className="fixed bottom-4 left-4 right-4 z-[650] mx-auto max-w-sm rounded-xl border border-secondary-200 bg-white p-4 shadow-xl lg:left-auto lg:right-4 lg:top-20 lg:max-w-xs">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: elemento.color || '#3B82F6' }}
          >
            <MapPin size={14} />
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
              <Edit3 size={15} />
            </button>
          )}
          <button
            onClick={onCerrar}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-40 overflow-y-auto">
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
  );
}
