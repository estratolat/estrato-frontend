'use client';

interface Props {
  activas: Record<string, boolean>;
  data: Record<string, any>;
}

const CAPAS = [
  { id: 'votantes', nombre: 'Calor de simpatizantes', color: '#EF4444', descripcion: 'Densidad de votantes registrados' },
  { id: 'recorridos', nombre: 'Calles recorridas', color: '#D73216', descripcion: 'Rutas de brigada caminando' },
  { id: 'apoyos', nombre: 'Apoyos entregados', color: '#F59E0B', descripcion: 'Entregas con foto y ubicación' },
  { id: 'peticiones', nombre: 'Peticiones ciudadanas', color: '#06B6D4', descripcion: 'Solicitudes reportadas en campo' },
  { id: 'eventos', nombre: 'Eventos / Mítines', color: '#D73216', descripcion: 'Eventos de campaña programados' },
  { id: 'lideres', nombre: 'Líderes territoriales', color: '#383745', descripcion: 'Líderes y su radio de influencia' },
];

export default function LeyendaMapa({ activas, data }: Props) {
  const activasOrden = CAPAS.filter(c => activas[c.id]);
  if (activasOrden.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[500] max-w-xs rounded-lg border border-white/60 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-secondary-500">Capas activas</p>
      <div className="space-y-1.5">
        {activasOrden.map(c => {
          const cantidad = data[c.id]?.features?.length || 0;
          return (
            <div key={c.id} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-xs font-medium text-secondary-700">{c.nombre}</span>
              {cantidad > 0 && <span className="ml-auto rounded-full bg-secondary-100 px-1.5 py-0.5 text-[10px] text-secondary-600">{cantidad}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
