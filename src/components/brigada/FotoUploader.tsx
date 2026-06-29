'use client';

import { useState, useRef } from 'react';
import { uploadsApi } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';

interface Props {
  fotoUrl?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export default function FotoUploader({ fotoUrl, onChange, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe exceder 5 MB');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await uploadsApi.uploadFoto(file);
      onChange(res.data?.foto_url || null);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al subir foto';
      setError(msg);
      console.error('[FotoUploader] error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="label text-sm">Foto de evidencia</label>

      {fotoUrl ? (
        <div className="relative rounded-lg border border-secondary-200 overflow-hidden bg-white">
          <img
            src={fotoUrl}
            alt="Evidencia"
            className="w-full h-40 object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 text-red-600 shadow-sm"
            >
              <Icon name="salir" size={16} />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || loading}
          className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-secondary-300 bg-white p-6 transition hover:border-primary-400 hover:bg-primary-50 disabled:opacity-60"
        >
          <Icon name="apoyos" size={28} className="mb-2 text-secondary-400" />
          <span className="text-sm font-medium text-secondary-700">
            {loading ? 'Subiendo...' : 'Tomar o subir foto'}
          </span>
          <span className="mt-1 text-xs text-secondary-500">JPG, PNG. Máx 5 MB</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
        disabled={disabled || loading}
      />

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
