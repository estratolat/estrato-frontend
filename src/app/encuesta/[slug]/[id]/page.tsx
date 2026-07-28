'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { encuestasApi } from '@/lib/api';
import { Encuesta, PreguntaEncuesta } from '@/types';
import { ClipboardList, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function EncuestaPublicaPage() {
  const { slug, id } = useParams();
  const [encuesta, setEncuesta] = useState<Encuesta | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'form' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, (string | number)[]>>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !id) return;
    encuestasApi
      .getPublica(slug as string, id as string)
      .then((res) => {
        setEncuesta(res.data.encuesta);
        setTenantName(res.data.tenant.nombre || '');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Encuesta no disponible');
        setLoading(false);
      });
  }, [slug, id]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarEmail(email)) {
      setSubmitError('Ingresa un correo electrónico válido');
      return;
    }
    setSubmitError(null);
    setStep('form');
  };

  const toggleValor = (preguntaId: string, valor: string | number, multiple: boolean) => {
    setRespuestas((prev) => {
      const actuales = prev[preguntaId] || [];
      if (multiple) {
        const existe = actuales.includes(valor);
        return { ...prev, [preguntaId]: existe ? actuales.filter((v) => v !== valor) : [...actuales, valor] };
      }
      return { ...prev, [preguntaId]: [valor] };
    });
  };

  const setTexto = (preguntaId: string, valor: string) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: [valor] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encuesta) return;
    setSaving(true);
    setSubmitError(null);

    const payloadRespuestas = encuesta.preguntas.map((p) => ({
      pregunta_id: p.id,
      valores: respuestas[p.id] || [],
    }));

    // Validar requeridas
    for (const p of encuesta.preguntas) {
      if (p.requerida) {
        const vals = respuestas[p.id] || [];
        if (vals.length === 0 || vals.every((v) => v === '' || v == null)) {
          setSubmitError(`La pregunta "${p.texto}" es obligatoria`);
          setSaving(false);
          return;
        }
      }
    }

    try {
      await encuestasApi.enviarRespuestaPublica(slug as string, id as string, {
        email,
        respuestas: payloadRespuestas,
      });
      setStep('done');
    } catch (err: any) {
      setSubmitError(err.response?.data?.message || 'Error al enviar respuesta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !encuesta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h1 className="text-xl font-bold text-secondary-900">Encuesta no disponible</h1>
          <p className="mt-2 text-secondary-600">{error || 'No se pudo cargar la encuesta.'}</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-50 p-6">
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
          <h1 className="text-xl font-bold text-secondary-900">¡Gracias por participar!</h1>
          <p className="mt-2 text-secondary-600">Tus respuestas han sido registradas correctamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50 py-8 px-4">
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary-100 p-2 text-primary-600">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">{tenantName || 'Encuesta'}</p>
            <h1 className="text-2xl font-bold text-secondary-900">{encuesta.titulo}</h1>
          </div>
        </div>

        {encuesta.descripcion && (
          <p className="mb-6 text-secondary-600">{encuesta.descripcion}</p>
        )}

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <p className="text-sm text-secondary-600">
              Para contininar ingresa tu correo electrónico. No podrás contestar dos veces con el mismo correo.
            </p>
            <div>
              <label className="mb-1 block text-sm font-semibold text-secondary-700">Correo electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="input w-full"
                required
              />
            </div>
            {submitError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
            )}
            <button type="submit" className="btn-primary w-full">
              Continuar
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {encuesta.preguntas.map((p, idx) => (
              <PreguntaField
                key={p.id}
                pregunta={p}
                idx={idx}
                valor={respuestas[p.id] || []}
                onToggle={(v) => toggleValor(p.id, v, p.tipo === 'opcion_multiple')}
                onTexto={(v) => setTexto(p.id, v)}
              />
            ))}

            {submitError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={18} />}
              {saving ? 'Enviando...' : 'Enviar respuestas'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function PreguntaField({
  pregunta,
  idx,
  valor,
  onToggle,
  onTexto,
}: {
  pregunta: PreguntaEncuesta;
  idx: number;
  valor: (string | number)[];
  onToggle: (v: string | number) => void;
  onTexto: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="font-semibold text-secondary-900">
        {idx + 1}. {pregunta.texto}
        {pregunta.requerida && <span className="ml-1 text-red-500">*</span>}
      </p>

      {pregunta.tipo === 'texto' && (
        <textarea
          value={valor[0] || ''}
          onChange={(e) => onTexto(e.target.value)}
          className="input min-h-[100px] w-full"
          placeholder="Escribe tu respuesta..."
        />
      )}

      {['opcion_unica', 'opcion_multiple'].includes(pregunta.tipo) && (
        <div className="space-y-2">
          {pregunta.opciones?.map((op) => {
            const selected = valor.includes(op);
            const inputType = pregunta.tipo === 'opcion_multiple' ? 'checkbox' : 'radio';
            return (
              <label
                key={op}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  selected ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:bg-secondary-50'
                }`}
              >
                <input
                  type={inputType}
                  name={pregunta.id}
                  checked={selected}
                  onChange={() => onToggle(op)}
                  className="h-4 w-4 accent-primary-600"
                />
                <span className="text-secondary-800">{op}</span>
              </label>
            );
          })}
        </div>
      )}

      {pregunta.tipo === 'si_no' && (
        <div className="flex gap-3">
          {['Sí', 'No'].map((op) => {
            const selected = valor.includes(op);
            return (
              <label
                key={op}
                className={`flex-1 cursor-pointer rounded-lg border p-3 text-center transition ${
                  selected ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:bg-secondary-50'
                }`}
              >
                <input
                  type="radio"
                  name={pregunta.id}
                  checked={selected}
                  onChange={() => onToggle(op)}
                  className="sr-only"
                />
                <span className="font-medium text-secondary-800">{op}</span>
              </label>
            );
          })}
        </div>
      )}

      {pregunta.tipo === 'escala' && (
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => {
            const selected = valor.includes(n);
            return (
              <label
                key={n}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition ${
                  selected ? 'border-primary-500 bg-primary-600 text-white' : 'border-secondary-200 hover:bg-secondary-50'
                }`}
              >
                <input
                  type="radio"
                  name={pregunta.id}
                  checked={selected}
                  onChange={() => onToggle(n)}
                  className="sr-only"
                />
                {n}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
