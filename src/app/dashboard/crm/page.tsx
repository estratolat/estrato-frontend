'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { puedeAcceder } from '@/lib/permisos';
import { crmApi } from '@/lib/api';
import ConversacionList from '@/components/crm/ConversacionList';
import ChatPanel from '@/components/crm/ChatPanel';

export default function CrmPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [conversaciones, setConversaciones] = useState<any[]>([]);
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pendientes: 0 });
  const [loadingConversaciones, setLoadingConversaciones] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [error, setError] = useState('');
  const [canalFiltro, setCanalFiltro] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!authLoading && user && !puedeAcceder(user.permisos, 'crm', user.rol)) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  const cargarConversaciones = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingConversaciones(true);
      const { data } = await crmApi.getConversaciones({
        canal: canalFiltro || undefined,
        search: busqueda || undefined,
        limit: 50,
      });
      setConversaciones(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar conversaciones');
    } finally {
      setLoadingConversaciones(false);
    }
  }, [user, canalFiltro, busqueda]);

  const cargarMensajes = useCallback(async (votanteId: string) => {
    try {
      setLoadingMensajes(true);
      const { data } = await crmApi.getMensajes({
        votante_id: votanteId,
        limit: 200,
      });
      setMensajes(Array.isArray(data) ? data : []);

      // Marcar inbound no leídos como leídos
      const noLeidos = (data || []).filter(
        (m: any) => m.direccion === 'inbound' && !m.leido
      );
      for (const m of noLeidos) {
        try {
          await crmApi.marcarLeido(m.id);
        } catch {}
      }
      if (noLeidos.length > 0) {
        cargarConversaciones();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar mensajes');
    } finally {
      setLoadingMensajes(false);
    }
  }, []);

  const cargarStats = useCallback(async () => {
    try {
      const { data } = await crmApi.getStats();
      setStats(data || { total: 0, pendientes: 0 });
    } catch {}
  }, []);

  useEffect(() => {
    if (user && puedeAcceder(user.permisos, 'crm', user.rol)) {
      cargarConversaciones();
      cargarStats();
    }
  }, [user, cargarConversaciones, cargarStats]);

  useEffect(() => {
    if (seleccionada) {
      cargarMensajes(seleccionada);
    } else {
      setMensajes([]);
    }
  }, [seleccionada, cargarMensajes]);

  const onSelect = (id: string) => {
    setSeleccionada(id);
    setError('');
  };

  const onMensajeEnviado = (mensaje: any) => {
    setMensajes((prev) => [...prev, mensaje]);
    cargarConversaciones();
  };

  const conversacionActiva = conversaciones.find((c) => c.votante_id === seleccionada);
  const canalActivo = conversacionActiva?.ultimo_mensaje?.canal || 'whatsapp';

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-7xl flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-secondary-800">Bandeja de entrada</h2>
          <p className="text-secondary-500">WhatsApp, Messenger, Instagram y más en un solo lugar.</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-lg border border-secondary-200 bg-white px-4 py-2 text-center">
            <p className="text-xs text-secondary-500">Pendientes</p>
            <p className="text-xl font-bold text-secondary-800">{stats.pendientes}</p>
          </div>
          <div className="rounded-lg border border-secondary-200 bg-white px-4 py-2 text-center">
            <p className="text-xs text-secondary-500">Total</p>
            <p className="text-xl font-bold text-secondary-800">{stats.total}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid flex-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ConversacionList
            conversaciones={conversaciones}
            seleccionada={seleccionada || undefined}
            onSelect={onSelect}
            canalFiltro={canalFiltro}
            onCanalChange={(v) => {
              setCanalFiltro(v);
              setSeleccionada(null);
            }}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
          />
        </div>
        <div className="lg:col-span-2">
          <ChatPanel
            votante={conversacionActiva?.votante || null}
            mensajes={mensajes}
            canal={canalActivo}
            loading={loadingMensajes}
            onMensajeEnviado={onMensajeEnviado}
          />
        </div>
      </div>
    </div>
  );
}
