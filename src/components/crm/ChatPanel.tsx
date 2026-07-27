'use client';

import { useState, useRef, useEffect } from 'react';
import { crmApi } from '@/lib/api';
import CanalBadge from './CanalBadge';

interface Mensaje {
  id: string;
  canal: string;
  canal_crm_id?: string | null;
  direccion: 'inbound' | 'outbound';
  contenido: string;
  leido: boolean;
  created_at: string;
  atendedor?: { id: string; nombre?: string } | null;
  canalCrm?: { id: string; nombre: string } | null;
}

interface Votante {
  id: string;
  nombre?: string | null;
  telefono?: string | null;
  email?: string | null;
  colonia?: string | null;
  municipio?: string | null;
  nivel_apoyo?: number | null;
  metadata?: any;
}

interface CanalCrm {
  id: string;
  canal: string;
  nombre: string;
  proveedor: string;
  cuenta_id?: string | null;
  activo?: boolean;
}

interface Props {
  votante: Votante | null;
  mensajes: Mensaje[];
  canal: string;
  loading?: boolean;
  onMensajeEnviado?: (mensaje: any) => void;
}

const CANALES_TIPO = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'messenger', label: 'Messenger' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

export default function ChatPanel({
  votante,
  mensajes,
  canal,
  loading,
  onMensajeEnviado,
}: Props) {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [canalTipo, setCanalTipo] = useState(canal || 'whatsapp');
  const [canales, setCanales] = useState<CanalCrm[]>([]);
  const [canalCrmId, setCanalCrmId] = useState<string>('');
  const [loadingCanales, setLoadingCanales] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanalTipo(canal || 'whatsapp');
  }, [canal]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    let mounted = true;
    async function cargarCanales() {
      try {
        setLoadingCanales(true);
        const { data } = await crmApi.getCanales(true);
        if (!mounted) return;
        const lista = Array.isArray(data) ? data : [];
        setCanales(lista);
      } catch {
        // Si falla, permitimos envío local sin canal configurado
      } finally {
        if (mounted) setLoadingCanales(false);
      }
    }
    cargarCanales();
    return () => {
      mounted = false;
    };
  }, []);

  // Cuando cambia el tipo de canal, elegir el primer canal CRM activo disponible
  useEffect(() => {
    const disponibles = canales.filter((c) => c.canal === canalTipo && c.activo !== false);
    if (disponibles.length === 1) {
      setCanalCrmId(disponibles[0].id);
    } else if (disponibles.length === 0) {
      setCanalCrmId('');
    }
  }, [canalTipo, canales]);

  const canalesDelTipo = canales.filter((c) => c.canal === canalTipo);

  const enviar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!votante || !texto.trim() || enviando) return;

    const payload: any = {
      votante_id: votante.id,
      canal: canalTipo,
      contenido: texto.trim(),
    };
    if (canalCrmId) {
      payload.canal_crm_id = canalCrmId;
    }

    try {
      setEnviando(true);
      const { data } = await crmApi.enviarMensaje(payload);
      setTexto('');
      onMensajeEnviado?.(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al enviar mensaje');
    } finally {
      setEnviando(false);
    }
  };

  const formatearHora = (fecha: string) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!votante) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-secondary-200 bg-white">
        <p className="text-sm text-secondary-500">Selecciona una conversación para ver los mensajes.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-secondary-200 bg-white">
      {/* Header */}
      <div className="border-b border-secondary-100 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-secondary-800">{votante.nombre || 'Sin nombre'}</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-secondary-500">
              {votante.telefono && <span>{votante.telefono}</span>}
              {votante.email && <span>· {votante.email}</span>}
              {votante.colonia && <span>· {votante.colonia}</span>}
              {votante.nivel_apoyo && <span>· Nivel {votante.nivel_apoyo}</span>}
            </div>
          </div>
          <CanalBadge canal={canalTipo} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-secondary-400">No hay mensajes con este contacto.</p>
          </div>
        ) : (
          mensajes.map((m) => {
            const esOutbound = m.direccion === 'outbound';
            return (
              <div key={m.id} className={`flex ${esOutbound ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    esOutbound
                      ? 'rounded-br-none bg-primary-600 text-white'
                      : 'rounded-bl-none bg-secondary-100 text-secondary-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.contenido}</p>
                  <div
                    className={`mt-1 flex flex-col gap-0.5 text-[10px] ${
                      esOutbound ? 'text-primary-100' : 'text-secondary-500'
                    }`}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>{formatearHora(m.created_at)}</span>
                      {esOutbound && m.atendedor && <span>· {m.atendedor.nombre || 'Tú'}</span>}
                    </div>
                    {m.canalCrm?.nombre && (
                      <div className={`text-right ${esOutbound ? 'text-primary-200' : 'text-secondary-400'}`}>
                        vía {m.canalCrm.nombre}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={enviar} className="border-t border-secondary-100 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500">Canal:</label>
            <select
              value={canalTipo}
              onChange={(e) => setCanalTipo(e.target.value)}
              className="input py-1 text-xs"
              disabled={loadingCanales}
            >
              {CANALES_TIPO.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {canalesDelTipo.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-secondary-500">Cuenta:</label>
              <select
                value={canalCrmId}
                onChange={(e) => setCanalCrmId(e.target.value)}
                className="input py-1 text-xs"
                disabled={loadingCanales}
              >
                {canalesDelTipo.length > 1 && <option value="">Canal por defecto</option>}
                {canalesDelTipo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.cuenta_id ? `(${c.cuenta_id})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {canalesDelTipo.length === 0 && !loadingCanales && (
            <span className="text-xs text-amber-600">
              No hay cuenta configurada para {CANALES_TIPO.find((c) => c.value === canalTipo)?.label}. El mensaje se guardará localmente.
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe una respuesta..."
            className="input flex-1"
            disabled={enviando}
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="btn-primary px-4 py-2 disabled:opacity-60"
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}
