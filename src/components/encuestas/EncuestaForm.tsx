'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { encuestasApi } from '@/lib/api';
import { Encuesta, PreguntaEncuesta } from '@/types';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';

const TIPOS = [
  { key: 'texto', label: 'Texto libre' },
  { key: 'opcion_unica', label: 'Opción única' },
  { key: 'opcion_multiple', label: 'Opción múltiple' },
  { key: 'escala', label: 'Escala 1-5' },
  { key: 'si_no', label: 'Sí / No' },
];

interface EncuestaFormProps {
  encuesta?: Encuesta;
}

export default function EncuestaForm({ encuesta }: EncuestaFormProps) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(encuesta?.titulo || '');
  const [descripcion, setDescripcion] = useState(encuesta?.descripcion || '');
  const [status, setStatus] = useState(encuesta?.status || 'borrador');
  const [preguntas, setPreguntas] = useState<PreguntaEncuesta[]>(
    encuesta?.preguntas?.length ? encuesta.preguntas : []
  );
  const [saving, setSaving] = useState(false);

  const addPregunta = () => {
    setPreguntas([
      ...preguntas,
      { id: crypto.randomUUID(), texto: '', tipo: 'opcion_unica', opciones: ['Opción 1', 'Opción 2'], requerida: true },
    ]);
  };

  const removePregunta = (id: string) => {
    setPreguntas(preguntas.filter((p) => p.id !== id));
  };

  const updatePregunta = (id: string, field: keyof PreguntaEncuesta, value: any) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };
        if (field === 'tipo') {
          if (['opcion_unica', 'opcion_multiple'].includes(value) && (!updated.opciones || updated.opciones.length < 2)) {
            updated.opciones = ['Opción 1', 'Opción 2'];
          }
        }
        return updated;
      })
    );
  };

  const updateOpcion = (preguntaId: string, idx: number, value: string) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id !== preguntaId) return p;
        const opciones = [...(p.opciones || [])];
        opciones[idx] = value;
        return { ...p, opciones };
      })
    );
  };

  const addOpcion = (preguntaId: string) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id !== preguntaId) return p;
        const next = `Opción ${(p.opciones?.length || 0) + 1}`;
        return { ...p, opciones: [...(p.opciones || []), next] };
      })
    );
  };

  const removeOpcion = (preguntaId: string, idx: number) => {
    setPreguntas(
      preguntas.map((p) => {
        if (p.id !== preguntaId) return p;
        const opciones = [...(p.opciones || [])];
        opciones.splice(idx, 1);
        return { ...p, opciones };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return alert('El título es requerido');
    for (const p of preguntas) {
      if (!p.texto.trim()) return alert('Toda pregunta debe tener texto');
      if (['opcion_unica', 'opcion_multiple'].includes(p.tipo) && (p.opciones || []).length < 2) {
        return alert(`La pregunta "${p.texto}" necesita al menos 2 opciones`);
      }
    }
    setSaving(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        status,
        preguntas: preguntas.map((p) => ({
          id: p.id,
          texto: p.texto.trim(),
          tipo: p.tipo,
          opciones: p.opciones,
          requerida: !!p.requerida,
        })),
      };
      if (encuesta) {
        await encuestasApi.update(encuesta.id, payload);
      } else {
        await encuestasApi.create(payload);
      }
      router.push('/dashboard/encuestas');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Título de la encuesta</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            className="input"
            placeholder="Ej. Encuesta de seguridad ciudadana"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Descripción</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="input min-h-[80px]"
            placeholder="Objetivo o contexto de la encuesta"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Estatus inicial</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input">
            <option value="borrador">Borrador</option>
            <option value="activa">Activa</option>
            <option value="cerrada">Cerrada</option>
          </select>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-secondary-900">Preguntas ({preguntas.length})</h3>
          <button
            type="button"
            onClick={addPregunta}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Agregar pregunta
          </button>
        </div>

        {preguntas.length === 0 && (
          <p className="text-sm text-secondary-500">Aún no hay preguntas. Agrega la primera.</p>
        )}

        <div className="space-y-4">
          {preguntas.map((p, idx) => (
            <div key={p.id} className="rounded-lg border border-secondary-200 bg-secondary-50/50 p-4">
              <div className="mb-3 flex items-start gap-3">
                <GripVertical size={18} className="mt-1 text-secondary-400" />
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={p.texto}
                    onChange={(e) => updatePregunta(p.id, 'texto', e.target.value)}
                    placeholder={`Pregunta ${idx + 1}`}
                    className="input"
                    required
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      value={p.tipo}
                      onChange={(e) => updatePregunta(p.id, 'tipo', e.target.value)}
                      className="input text-sm"
                    >
                      {TIPOS.map((t) => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-sm text-secondary-700">
                      <input
                        type="checkbox"
                        checked={!!p.requerida}
                        onChange={(e) => updatePregunta(p.id, 'requerida', e.target.checked)}
                        className="h-4 w-4 accent-primary-600"
                      />
                      Pregunta obligatoria
                    </label>
                  </div>

                  {['opcion_unica', 'opcion_multiple'].includes(p.tipo) && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase text-secondary-500">Opciones</p>
                      {p.opciones?.map((op, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={op}
                            onChange={(e) => updateOpcion(p.id, i, e.target.value)}
                            className="input text-sm"
                            placeholder={`Opción ${i + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeOpcion(p.id, i)}
                            className="rounded-md p-1 text-secondary-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addOpcion(p.id)}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        + Agregar opción
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePregunta(p.id)}
                  className="rounded-md p-1.5 text-secondary-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push('/dashboard/encuestas')}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={18} /> {saving ? 'Guardando...' : encuesta ? 'Actualizar' : 'Crear encuesta'}
        </button>
      </div>
    </form>
  );
}
