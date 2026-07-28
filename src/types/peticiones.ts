export type TipoPeticion = 'ciudadana' | 'logistica' | 'tramite' | 'seguimiento_votante' | 'tarea_interna';
export type OrigenPeticion = 'app_brigada' | 'dashboard' | 'landing' | 'encuesta' | 'whatsapp' | 'manual';
export type CategoriaPeticion = 'bache' | 'alumbrado' | 'agua' | 'seguridad' | 'limpia' | 'salud' | 'apoyo' | 'otro';
export type PrioridadPeticion = 'baja' | 'media' | 'alta' | 'critica';
export type EstatusPeticion = 'propuesta' | 'pendiente' | 'en_proceso' | 'resuelta' | 'cancelada' | 'rechazada';

export interface Peticion {
  id: string;
  tenant_id: string;
  folio: string;
  votante_id?: string;
  responsable_id?: string;
  tipo: TipoPeticion;
  origen: OrigenPeticion;
  categoria: CategoriaPeticion;
  prioridad: PrioridadPeticion;
  estatus: EstatusPeticion;
  titulo?: string;
  descripcion: string;
  seccion_electoral?: string;
  coordenadas?: { lat: number; lng: number };
  ubicacion_texto?: string;
  fecha_compromiso?: string;
  fecha_resolucion?: string;
  requiere_evidencia: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  votante?: { id: string; nombre?: string; telefono?: string };
  creador?: { id: string; nombre?: string };
  responsable?: { id: string; nombre?: string; zona_id?: string; rol?: string };
  evidencias?: EvidenciaPeticion[];
  _count?: { evidencias: number; historial: number };
}

export interface EvidenciaPeticion {
  id: string;
  tenant_id: string;
  peticion_id: string;
  imagen_url: string;
  latitud?: number;
  longitud?: number;
  distancia_m?: number;
  fecha_captura: string;
  comentario?: string;
  created_by: string;
  created_at: string;
  creador?: { id: string; nombre?: string };
}

export interface HistorialPeticion {
  id: string;
  tenant_id: string;
  peticion_id: string;
  estatus: string;
  estatus_anterior?: string;
  estatus_nuevo: string;
  comentario?: string;
  created_by: string;
  created_at: string;
  creador?: { id: string; nombre?: string };
}
