'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fichasApi } from '@/lib/api';
import { FileText } from 'lucide-react';

export default function FichaSeccionalPage() {
  const [secciones, setSecciones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecciones();
  }, []);

  const loadSecciones = async () => {
    try {
      const { data } = await fichasApi.getSecciones();
      setSecciones(data || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Fichas Seccionales</h2>
        <p className="text-secondary-600">Selecciona una sección para ver su ficha completa de territorio.</p>
      </div>

      {secciones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-secondary-300 p-8 text-center text-secondary-500">
          No hay secciones con votantes registrados.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {secciones.map((s) => (
            <Link
              key={s}
              href={`/dashboard/ficha-seccional/${s}`}
              className="card flex items-center gap-4 transition hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                <FileText size={22} />
              </div>
              <div>
                <p className="text-lg font-bold text-secondary-900">Sección {s}</p>
                <p className="text-sm text-primary-600">Ver ficha completa →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
