'use client';

import { X, MapPin, ExternalLink } from 'lucide-react';
import { ElementoCapa } from './ExploradorCapa';

interface Props {
  elemento: ElementoCapa | null;
  onCerrar: () => void;
  onVerDetalle?: (elemento: ElementoCapa) => void;
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

export default function FichaFeature({ elemento, onCerrar, onVerDetalle }: Props) {
  if (!elemento) return null;

  const props = elemento.feature?.properties || {};
  const entries = Object.entries(props).filter(([k, v]) =>
    !['_feature_color', '_feature_nombre', '_feature_id', 'geometry'].includes(k) && esValorInteresante(v)
  );

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
        <button
          onClick={onCerrar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="text-xs text-secondary-500">No hay propiedades adicionales.</p>
        ) : (
          <div className="space-y-1.5">
            {entries.slice(0, 12).map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-2 text-xs">
                <span className="font-medium text-secondary-600">{formatearPropiedad(key)}:</span>
                <span className="max-w-[60%] text-right text-secondary-800">
                  {Array.isArray(value)
                    ? value.join(', ')
                    : typeof value === 'object'
                    ? JSON.stringify(value).slice(0, 80)
                    : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
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
