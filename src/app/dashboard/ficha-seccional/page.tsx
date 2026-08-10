'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fichasApi } from '@/lib/api';
import { FileText, AlertCircle } from 'lucide-react';

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

  const seccionesReales = secciones.filter((s) => s !== 'Sin sección');
  const sinSeccion = secciones.includes('Sin sección');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Fichas Seccionales</h2>
        <p className="text-secondary-600">Selecciona una sección para ver su ficha completa de territorio.</p>
      </div>

      {secciones.length === 0 ? (
        <div className="rounded-lg border border-dashed border-secondary-300 p-8 text-center text-secondary-500">
          <p className="font-medium">No hay secciones registradas.</p>
          <p className="mt-1 text-sm">
            Carga votantes, casillas, histórico electoral, secciones INE o zonas para que aparezcan aquí.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {seccionesReales.map((s) => (
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
          {sinSeccion && (
            <Link
              key="sin-seccion"
              href="/dashboard/ficha-seccional/Sin%20sección"
              className="card flex items-center gap-4 border-dashed border-secondary-300 bg-secondary-50/50 transition hover:border-secondary-400"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-100 text-secondary-600">
                <AlertCircle size={22} />
              </div>
              <div>
                <p className="text-lg font-bold text-secondary-700">Sin sección</p>
                <p className="text-sm text-secondary-500">Votantes no asignados →</p>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
