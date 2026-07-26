'use client';

import { useState } from 'react';
import { boletinesApi } from '@/lib/api';

interface GeneradorBoletinesProps {
  perfil?: any;
  onGenerado?: (boletin: any) => void;
}

const CAMPOS = [
  { key: 'tema', label: 'Tema', placeholder: 'Ej. inicio de campaña, seguridad, empleo...' },
  { key: 'que', label: '¿Qué pasó?', placeholder: '¿Qué sucedió o se anuncia?' },
  { key: 'quien', label: '¿Quién participó?', placeholder: '¿Quiénes estuvieron involucrados?' },
  { key: 'como', label: '¿Cómo sucedió el hecho?', placeholder: '¿De qué forma ocurrió?' },
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
  const [copiadoRed, setCopiadoRed] = useState<string | null>(null);
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

  const copiar = (texto: string, red?: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      if (red) {
        setCopiadoRed(red);
        setTimeout(() => setCopiadoRed(null), 2000);
      } else {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      }
    });
  };

  const puedeGenerar = contexto.tema.trim().length > 0;

  const textoGenerado =
    tipo === 'redes'
      ? [resultado?.posts_redes?.facebook, resultado?.posts_redes?.instagram, resultado?.posts_redes?.tiktok]
          .filter(Boolean)
          .map(
            (v: any, i: number) =>
              `${['Facebook', 'Instagram', 'TikTok'][i]}:\n${v.caption}\n\n${v.hashtags?.join(' ') || ''}\n\nIdea: ${v.idea_imagen || ''}`,
          )
          .join('\n\n---\n\n')
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
        Responde las 7 preguntas básicas para crear boletines y posts para redes sociales con la voz del candidato.
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
          : `Generar ${tipo === 'boletin' ? 'boletín + posts' : 'posts para redes'}`}
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

          {tipo === 'boletin' && (
            <div className="mb-5 space-y-3">
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
                  <p className="text-xs font-semibold uppercase text-secondary-500">Cuerpo del boletín</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">{resultado.texto}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase text-secondary-500">
              {tipo === 'boletin' ? 'Posts para redes sociales' : 'Posts por red social'}
            </p>
            <PostRedSocial
              red="facebook"
              label="Facebook"
              post={resultado.posts_redes?.facebook}
              copiado={copiadoRed === 'facebook'}
              onCopiar={copiar}
            />
            <PostRedSocial
              red="instagram"
              label="Instagram"
              post={resultado.posts_redes?.instagram}
              copiado={copiadoRed === 'instagram'}
              onCopiar={copiar}
            />
            <PostRedSocial
              red="tiktok"
              label="TikTok"
              post={resultado.posts_redes?.tiktok}
              copiado={copiadoRed === 'tiktok'}
              onCopiar={copiar}
            />
          </div>
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

function PostRedSocial({
  red,
  label,
  post,
  copiado,
  onCopiar,
}: {
  red: string;
  label: string;
  post?: { caption: string; hashtags: string[]; idea_imagen: string };
  copiado: boolean;
  onCopiar: (texto: string, red: string) => void;
}) {
  if (!post?.caption) return null;
  const textoCompleto = [post.caption, post.hashtags?.join(' ') || '', post.idea_imagen ? `Idea: ${post.idea_imagen}` : '']
    .filter(Boolean)
    .join('\n\n');

  const colores: Record<string, string> = {
    facebook: '#1877F2',
    instagram: '#E1306C',
    tiktok: '#000000',
  };

  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase" style={{ color: colores[red] || '#4B5563' }}>
          {label}
        </span>
        <button
          type="button"
          onClick={() => onCopiar(textoCompleto, red)}
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          {copiado ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      {post.caption && (
        <p className="mb-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary-800">{post.caption}</p>
      )}
      {post.hashtags?.length > 0 && (
        <p className="mb-2 text-sm text-primary-700">{post.hashtags.join(' ')}</p>
      )}
      {post.idea_imagen && <TextBlock title="Idea de imagen / video" text={post.idea_imagen} />}
    </div>
  );
}
