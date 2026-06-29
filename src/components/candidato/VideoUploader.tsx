'use client';

import { useState, useRef, ChangeEvent } from 'react';

interface VideoUploaderProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  maxMb?: number;
}

export default function VideoUploader({ value, onChange, maxMb = 25 }: VideoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    if (file.size > maxMb * 1024 * 1024) {
      setError(`El video no debe exceder ${maxMb} MB`);
      return;
    }

    setLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      onChange(base64);
    } catch {
      setError('Error al leer el video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFile}
      />

      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-secondary-300 bg-secondary-50 p-8 text-secondary-500 transition hover:border-primary-400 hover:text-primary-600"
        >
          {loading ? (
            <span>Procesando video...</span>
          ) : (
            <>
              <svg className="mb-2 h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25ZM9 8.25c.966 0 1.75.784 1.75 1.75v4c0 .966-.784 1.75-1.75 1.75s-1.75-.784-1.75-1.75v-4C7.25 9.034 8.034 8.25 9 8.25Z" />
              </svg>
              <span className="font-medium">Subir video del candidato</span>
              <span className="text-xs">MP4, WebM. Máx. {maxMb} MB</span>
            </>
          )}
        </button>
      ) : (
        <div className="overflow-hidden rounded-xl border border-secondary-200 bg-black">
          <video src={value} controls className="max-h-64 w-full" />
          <div className="flex justify-end gap-2 bg-white p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Cambiar video
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Quitar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
