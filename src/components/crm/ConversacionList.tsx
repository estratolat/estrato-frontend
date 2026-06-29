'use client';

import CanalBadge from './CanalBadge';

interface Conversacion {
  votante_id: string;
  votante: {
    id: string;
    nombre?: string | null;
    telefono?: string | null;
    email?: string | null;
    colonia?: string | null;
    municipio?: string | null;
    nivel_apoyo?: number | null;
    metadata?: any;
  };
  ultimo_mensaje: {
    id: string;
    canal: string;
    direccion: 'inbound' | 'outbound';
    contenido: string;
    leido: boolean;
    created_at: string;
  };
  no_leidos: number;
}

interface Props {
  conversaciones: Conversacion[];
  seleccionada?: string;
  onSelect: (id: string) => void;
  canalFiltro?: string;
  onCanalChange?: (canal: string) => void;
  busqueda?: string;
  onBusqueda?: (v: string) => void;
}

export default function ConversacionList({
  conversaciones,
  seleccionada,
  onSelect,
  canalFiltro,
  onCanalChange,
  busqueda,
  onBusqueda,
}: Props) {
  const formatearHora = (fecha: string) => {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const resumen = (texto: string) => {
    if (!texto) return '—';
    return texto.length > 55 ? texto.slice(0, 55) + '…' : texto;
  };

  const canales = [
    { value: '', label: 'Todos' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'messenger', label: 'Messenger' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'form', label: 'Formulario' },
    { value: 'sms', label: 'SMS' },
    { value: 'email', label: 'Email' },
  ];

  return (
    <div className="flex h-full flex-col rounded-xl border border-secondary-200 bg-white">
      <div className="border-b border-secondary-100 p-4">
        <h3 className="mb-3 text-lg font-bold text-secondary-800">Conversaciones</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={busqueda || ''}
            onChange={(e) => onBusqueda?.(e.target.value)}
            placeholder="Buscar contacto..."
            className="input w-full"
          />
          <select
            value={canalFiltro || ''}
            onChange={(e) => onCanalChange?.(e.target.value)}
            className="input w-full"
          >
            {canales.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversaciones.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-secondary-500">No hay conversaciones aún.</p>
          </div>
        ) : (
          <ul className="divide-y divide-secondary-100">
            {conversaciones.map((c) => {
              const activa = seleccionada === c.votante_id;
              return (
                <li key={c.votante_id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.votante_id)}
                    className={`w-full px-4 py-3 text-left transition ${
                      activa ? 'bg-primary-50' : 'hover:bg-secondary-50'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-semibold text-secondary-800">
                        {c.votante?.nombre || 'Sin nombre'}
                      </span>
                      <span className="text-xs text-secondary-400">
                        {formatearHora(c.ultimo_mensaje.created_at)}
                      </span>
                    </div>
                    <div className="mb-1 flex items-center gap-2">
                      <CanalBadge canal={c.ultimo_mensaje.canal} />
                      {c.no_leidos > 0 && (
                        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {c.no_leidos}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${c.no_leidos > 0 ? 'font-medium text-secondary-800' : 'text-secondary-500'}`}>
                      {c.ultimo_mensaje.direccion === 'outbound' && (
                        <span className="text-secondary-400">Tú: </span>
                      )}
                      {resumen(c.ultimo_mensaje.contenido)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
