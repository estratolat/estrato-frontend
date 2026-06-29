'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { encuestasApi } from '@/lib/api';
import { Encuesta } from '@/types';
import EncuestaForm from '@/components/encuestas/EncuestaForm';

export default function EditarEncuestaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadEncuesta();
  }, [id]);

  const loadEncuesta = async () => {
    try {
      setLoading(true);
      const { data } = await encuestasApi.getOne(id as string);
      setEncuesta(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar encuesta');
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

  if (error || !encuesta) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error || 'Encuesta no encontrada'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-secondary-900">Editar Encuesta</h2>
          <p className="text-secondary-600">Modifica título, estatus y preguntas.</p>
        </div>
        <button onClick={() => router.push(`/dashboard/encuestas/${id}/respuestas`)} className="btn-secondary text-sm">
          Ver respuestas
        </button>
      </div>
      <EncuestaForm encuesta={encuesta} />
    </div>
  );
}
