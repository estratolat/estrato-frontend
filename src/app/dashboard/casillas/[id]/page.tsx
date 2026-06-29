'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { casillasApi } from '@/lib/api';
import { Casilla } from '@/types';
import CasillaForm from '@/components/casillas/CasillaForm';

export default function EditarCasillaPage() {
  const { id } = useParams();
  const [casilla, setCasilla] = useState<Casilla | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadCasilla();
  }, [id]);

  const loadCasilla = async () => {
    try {
      setLoading(true);
      const { data } = await casillasApi.getOne(id as string);
      setCasilla(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar casilla');
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

  if (error || !casilla) {
    return <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error || 'Casilla no encontrada'}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Editar Casilla</h2>
        <p className="text-secondary-600">Sección {casilla.seccion} • {casilla.ubicacion || 'Sin ubicación'}</p>
      </div>
      <CasillaForm casilla={casilla} />
    </div>
  );
}
