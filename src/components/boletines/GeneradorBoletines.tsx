'use client';

import { useState } from 'react';
import { boletinesApi } from '@/lib/api';

interface GeneradorBoletinesProps {
  perfil?: any;
  onGenerado?: (boletin: any) => void;
}

const CAMPOS = [
  { key: 'tema', label: 'Tema', placeholder: 'Ej. inicio de campaña, seguridad, empleo...' },
  { key: 'que', label: '¿Qué?', placeholder: '¿Qué se anuncia o propone?' },
  { key: 'quien', label: '¿Quién?', placeholder: '¿Quién participa o se beneficia?' },
  { key: 'como', label: '¿Cómo?', placeholder: '¿Cómo se va a hacer?' },
  { key: 'cuando', label: '¿Cuándo?', placeholder: '¿En qué fecha o momento?' },
  { key: 'donde', label: '¿Dónde?', placeholder: '¿En qué lugar o zona?' },
  { key: 'por_que', label: '¿Por qué?', placeholder: '¿Por qué es importante?' },
  { key: 'para_que', label: '¿Para qué?', placeholder: '¿Con qué objetivo o beneficio?' },
] as const;

export default function GeneradorBoletines({ perfil, onGenerado }: GeneradorBoletinesProps) {
  const [tipo, setTipo] = useState<'boletin' | 'redes'>('boletin');
  const [contexto, setContexto] = useState<Record<string, string>>({
    tema: '',
    que: '',
    quien: '',
    como: '',
    cuando: '',
    donde: '',
    por_que: '',
    para_que: '',
  });
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [copiadoVersion, setCopiadoVersion] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleChange = (key: string, value: string) => {
    setContexto((prev) => ({ ...prev, [key]: value }));
  };

  const generar = async () => {
    if (!contexto.tema.trim()) {
      setError('El tema es obligatorio');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setResultado(null);
      const { data } = await boletinesApi.generar(tipo, contexto);
      setResultado(data);
      if (data.boletin && onGenerado) {
        onGenerado(data.boletin);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al generar contenido');
    } finally {
      setLoading(false);
    }
  };

  const copiar = (texto: string, versionIndex?: number) => {
    navigator.clipboard.writeText(texto).then(() => {
      if (typeof versionIndex === 'number') {
        setCopiadoVersion(versionIndex);
        setTimeout(() => setCopiadoVersion(null), 2000);
      } else {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    });
  };

  const puedeGenerar = contexto.tema.trim().length > 0;

  const textoGenerado =
    tipo === 'redes'
      ? resultado?.versiones_redes?.length > 0
        ? resultado.versiones_redes
            .map(
              (v: any, i: number) =>
                `Versión ${i + 1}:\n${v.caption}\n\n${v.hashtags?.join(' ') || ''}\n\nIdea de imagen: ${v.idea_imagen || ''}`,
            )
            .join('\n\n---\n\n')
        : resultado?.caption || ''
      : [resultado?.titulo, resultado?.bajada, resultado?.desarrollo || resultado?.texto]
          .filter(Boolean)
          .join('\n\n');

  return (
    <div className="rounded-xl border border-secondary-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-bold text-secondary-800">Generador con IA</h4>
        {resultado?.boletin && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
            Guardado como borrador
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-secondary-500">
        Responde las 7 preguntas básicas para crear boletines o captions que suenen como el candidato.
      </p>

      {!perfil?.analizado_en && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          ⚠️ Primero debes guardar el perfil en la sección{' '}
          <strong>Candidato</strong> y presionar <strong>“Analizar con IA”</strong>{' '}
          para generar la huella de comunicación.
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setTipo('boletin');
            setResultado(null);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tipo === 'boletin'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          Boletín
        </button>
        <button
          type="button"
          onClick={() => {
            setTipo('redes');
            setResultado(null);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            tipo === 'redes'
              ? 'bg-primary-600 text-white'
              : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
          }`}
        >
          Redes sociales
        </button>
      </div>

      <div className="mb-4 grid gap-3">
        {CAMPOS.map((campo) => (
          <div key={campo.key}>
            <label className="label flex items-center gap-1">
              {campo.label}
              {campo.key === 'tema' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              className="input w-full"
              value={contexto[campo.key]}
              onChange={(e) => handleChange(campo.key, e.target.value)}
              placeholder={campo.placeholder}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={generar}
        disabled={loading || !puedeGenerar}
        className="btn-primary w-full py-2.5 disabled:opacity-60"
      >
        {loading
          ? 'Generando con IA...'
          : `Generar ${tipo === 'boletin' ? 'boletín' : tipo === 'redes' ? '5 versiones de posts' : 'caption'}`}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {resultado && (
        <div className="mt-5 rounded-lg border border-secondary-100 bg-secondary-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-secondary-500">
              Resultado generado
            </p>
            {textoGenerado && (
              <button
                type="button"
                onClick={() => copiar(textoGenerado)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                {copiado ? '¡Copiado!' : 'Copiar texto'}
              </button>
            )}
          </div>

          {tipo === 'redes' ? (
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase text-secondary-500">
                5 versiones de post
              </p>
              {(resultado.versiones_redes?.length > 0
                ? resultado.versiones_redes
                : resultado.caption
                ? [{ caption: resultado.caption, hashtags: resultado.hashtags || [], idea_imagen: resultado.idea_imagen || '' }]
                : []
              ).map((v: any, i: number) => {
                const textoCompleto = [v.caption, v.hashtags?.join(' ') || '', v.idea_imagen ? `Idea de imagen: ${v.idea_imagen}` : '']
                  .filter(Boolean)
                  .join('\n\n');
                return (
                  <div key={i} className="rounded-lg border border-secondary-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-primary-600">Versión {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => copiar(textoCompleto, i)}
                        className="text-xs font-medium text-primary-600 hover:text-primary-700"
                      >
                        {copiadoVersion === i ? '¡Copiado!' : 'Copiar'}
                      </button>
                    </div>
                    {v.caption && (
                      <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">
                        {v.caption}
                      </p>
                    )}
                    {v.hashtags?.length > 0 && (
                      <p className="mb-2 text-sm text-primary-700">{v.hashtags.join(' ')}</p>
                    )}
                    {v.idea_imagen && <TextBlock title="Idea de imagen" text={v.idea_imagen} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {resultado.titulo && (
                <div>
                  <p className="text-xs font-semibold uppercase text-secondary-500">Título</p>
                  <h5 className="font-bold text-secondary-800">{resultado.titulo}</h5>
                </div>
              )}
              {resultado.bajada && (
                <div>
                  <p className="text-xs font-semibold uppercase text-secondary-500">Bajada</p>
                  <p className="text-sm font-medium italic leading-relaxed text-secondary-700">
                    {resultado.bajada}
                  </p>
                </div>
              )}
              {resultado.desarrollo && (
                <div>
                  <p className="text-xs font-semibold uppercase text-secondary-500">Desarrollo</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">
                    {resultado.desarrollo}
                  </p>
                </div>
              )}
              {!resultado.desarrollo && resultado.texto && (
                <div>
                  <p className="text-xs font-semibold uppercase text-secondary-500">
                    Cuerpo del boletín
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">
                    {resultado.texto}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="pt-2">
      <p className="text-xs font-semibold uppercase text-secondary-500">{title}</p>
      <p className="text-sm text-secondary-700">{text}</p>
    </div>
  );
}
