'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { eventosApi } from '@/lib/api';
import { Evento } from '@/types';
import { Calendar as CalendarIcon, MapPin, Users, ChevronLeft, ChevronRight, Plus, List } from 'lucide-react';

export default function EventosPage() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'calendario' | 'lista'>('calendario');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroLugar, setFiltroLugar] = useState<string>('');

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadEventos();
  }, [router]);

  const loadEventos = async () => {
    try {
      setLoading(true);
      const { data } = await eventosApi.getAll({ limit: 500 });
      setEventos(data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar eventos');
    } finally {
      setLoading(false);
    }
  };

  const opcionesStatus = useMemo(() => {
    const set = new Set(eventos.map((e) => e.status));
    return Array.from(set).sort();
  }, [eventos]);

  const opcionesTematica = useMemo(() => {
    const set = new Set(eventos.map((e) => e.tematica).filter(Boolean));
    return Array.from(set).sort();
  }, [eventos]);

  const opcionesLugar = useMemo(() => {
    const set = new Set(eventos.map((e) => e.direccion).filter(Boolean));
    return Array.from(set).sort();
  }, [eventos]);

  const filtered = useMemo(() => {
    return eventos.filter((e) => {
      const matchSearch =
        e.nombre.toLowerCase().includes(search.toLowerCase()) ||
        e.direccion?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !filtroStatus || e.status === filtroStatus;
      const matchTipo = !filtroTipo || e.tematica === filtroTipo;
      const matchLugar = !filtroLugar || e.direccion === filtroLugar;
      return matchSearch && matchStatus && matchTipo && matchLugar;
    });
  }, [eventos, search, filtroStatus, filtroTipo, filtroLugar]);

  const eventosPorDia = useMemo(() => {
    const map: Record<string, Evento[]> = {};
    for (const e of filtered) {
      const key = new Date(e.fecha_inicio).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [filtered]);

  const calendar = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const start = new Date(firstDay);
    start.setDate(start.getDate() - firstDay.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return { year, month, days, firstDay, lastDay };
  }, [currentDate]);

  const changeMonth = (delta: number) => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleDayClick = (date: Date) => {
    const key = date.toISOString().split('T')[0];
    const eventosDelDia = eventosPorDia[key] || [];
    if (eventosDelDia.length === 1) {
      router.push(`/dashboard/eventos/${eventosDelDia[0].id}`);
    } else if (eventosDelDia.length > 1) {
      setSelectedDate(date);
      setSelectedEvent(null);
      setModalOpen(true);
    } else {
      setSelectedDate(date);
      setSelectedEvent(null);
      setModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Eventos</h2>
          <p className="text-gray-600">Mítines, reuniones y actividades de campaña</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('calendario')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'calendario' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarIcon size={16} className="inline mr-1" /> Calendario
            </button>
            <button
              onClick={() => setView('lista')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'lista' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={16} className="inline mr-1" /> Lista
            </button>
          </div>
          <Link href="/dashboard/eventos/nuevo" className="btn-primary flex items-center gap-2">
            <Plus size={18} /> Nuevo
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Contenido principal: calendario o lista */}
        <div className="flex-1 min-w-0">
          {view === 'calendario' ? (
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronLeft size={20} />
                </button>
                <h3 className="text-lg font-bold text-gray-800 capitalize">
                  {currentDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                  <div key={d} className="bg-gray-50 text-center py-2 text-sm font-semibold text-gray-600">
                    {d}
                  </div>
                ))}
                {calendar.days.map((date, i) => {
                  const key = date.toISOString().split('T')[0];
                  const eventosDelDia = eventosPorDia[key] || [];
                  const isCurrentMonth = date.getMonth() === calendar.month;
                  const isToday = key === new Date().toISOString().split('T')[0];

                  return (
                    <button
                      key={i}
                      onClick={() => handleDayClick(date)}
                      className={`min-h-[100px] p-2 text-left transition-colors hover:bg-primary-50 ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'
                      } ${isToday ? 'ring-2 ring-inset ring-primary-500' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {eventosDelDia.slice(0, 3).map((e) => (
                          <div
                            key={e.id}
                            className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 truncate"
                            title={e.nombre}
                          >
                            {e.nombre}
                          </div>
                        ))}
                        {eventosDelDia.length > 3 && (
                          <div className="text-xs text-gray-500 px-1.5">+{eventosDelDia.length - 3} más</div>
                        )}
                        {eventosDelDia.length === 0 && isCurrentMonth && (
                          <div className="text-xs text-gray-300 px-1.5 opacity-0 hover:opacity-100 transition-opacity">
                            + Agregar
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-2 gap-6">
              {filtered.length === 0 ? (
                <div className="card text-center py-12 text-gray-500 md:col-span-2">
                  {search || filtroStatus || filtroTipo || filtroLugar ? 'No se encontraron eventos con esos filtros.' : 'No hay eventos registrados aún.'}
                </div>
              ) : (
                filtered.map((evento) => <EventoCard key={evento.id} evento={evento} />)
              )}
            </div>
          )}
        </div>

        {/* Panel derecho: filtros y fichas */}
        <aside className="w-full lg:w-80 xl:w-96 shrink-0 space-y-6">
          {/* Buscador */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <List size={18} /> Filtros
            </h3>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar evento..."
              className="input"
            />

            <div className="space-y-3">
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="input"
              >
                <option value="">Todos los estados</option>
                {opcionesStatus.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>

              <label className="text-xs font-semibold text-gray-500">Temática / Tipo</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="input"
              >
                <option value="">Todas las temáticas</option>
                {opcionesTematica.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <label className="text-xs font-semibold text-gray-500">Lugar</label>
              <select
                value={filtroLugar}
                onChange={(e) => setFiltroLugar(e.target.value)}
                className="input"
              >
                <option value="">Todos los lugares</option>
                {opcionesLugar.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {(search || filtroStatus || filtroTipo || filtroLugar) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFiltroStatus('');
                  setFiltroTipo('');
                  setFiltroLugar('');
                }}
                className="w-full py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
              >
                Limpiar filtros
              </button>
            )}

            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Mostrando <span className="font-semibold text-gray-700">{filtered.length}</span> de {eventos.length} eventos
              </p>
            </div>
          </div>

          {/* Fichas de eventos */}
          <div className="card space-y-4">
            <h3 className="font-bold text-gray-800">Próximos eventos</h3>
            <div className="max-h-[500px] overflow-y-auto space-y-3 pr-1">
              {filtered.slice(0, 20).map((evento) => (
                <Link
                  key={evento.id}
                  href={`/dashboard/eventos/${evento.id}`}
                  className="block p-3 rounded-lg border border-gray-100 bg-white hover:border-primary-300 hover:bg-primary-50 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{evento.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(evento.fecha_inicio).toLocaleDateString('es-MX', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                        {' '}•{' '}
                        {new Date(evento.fecha_inicio).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        statusBadge[evento.status] || statusBadge.programado
                      }`}
                    >
                      {evento.status.replace('_', ' ')}
                    </span>
                  </div>
                  {evento.direccion && (
                    <p className="mt-1 text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin size={12} /> {evento.direccion}
                    </p>
                  )}
                </Link>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No hay eventos para mostrar</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {modalOpen && selectedDate && (
        <DayModal
          date={selectedDate}
          eventos={eventosPorDia[selectedDate.toISOString().split('T')[0]] || []}
          onClose={() => {
            setModalOpen(false);
            setSelectedDate(null);
            setSelectedEvent(null);
          }}
          onCreate={() => {
            const params = selectedDate
              ? `?fecha=${selectedDate.toISOString().split('T')[0]}`
              : '';
            router.push(`/dashboard/eventos/nuevo${params}`);
          }}
          onSelectEvent={(e) => router.push(`/dashboard/eventos/${e.id}`)}
        />
      )}
    </div>
  );
}

const statusBadge: Record<string, string> = {
  programado: 'bg-blue-100 text-blue-700',
  en_curso: 'bg-green-100 text-green-700',
  finalizado: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
};

function EventoCard({ evento }: { evento: Evento }) {
  const fecha = new Date(evento.fecha_inicio);
  const asistentes = evento.asistencias?.length || 0;

  return (
    <Link href={`/dashboard/eventos/${evento.id}`} className="card hover:shadow-md transition-shadow group">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-primary-100 text-primary-600 p-3 rounded-lg">
          <CalendarIcon size={24} />
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[evento.status] || statusBadge.programado}`}>
          {evento.status.replace('_', ' ')}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{evento.nombre}</h3>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} />
          <span>{fecha.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
        {evento.direccion && (
          <div className="flex items-center gap-2">
            <MapPin size={16} />
            <span className="truncate">{evento.direccion}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>{asistentes} asistentes registrados</span>
        </div>
      </div>

      <div className="text-primary-600 text-sm font-medium">Ver detalle →</div>
    </Link>
  );
}

function DayModal({
  date,
  eventos,
  onClose,
  onCreate,
  onSelectEvent,
}: {
  date: Date;
  eventos: Evento[];
  onClose: () => void;
  onCreate: () => void;
  onSelectEvent: (e: Evento) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">
            {date.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <span className="sr-only">Cerrar</span> ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {eventos.length === 0 ? (
            <p className="text-gray-500 text-center">No hay eventos programados para este día.</p>
          ) : (
            <div className="space-y-2">
              {eventos.map((e) => (
                <button
                  key={e.id}
                  onClick={() => onSelectEvent(e)}
                  className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-primary-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{e.nombre}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(e.fecha_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    {e.direccion && ` • ${e.direccion}`}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onCreate}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Crear evento este día
          </button>
        </div>
      </div>
    </div>
  );
}
