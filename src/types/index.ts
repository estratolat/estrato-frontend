// Tipos base para ESTRATO

export interface Tenant {
  id: string;
  slug: string;
  nombre_candidato: string;
  cargo_busca?: string;
  slogan?: string;
  plan: 'basico' | 'pro' | 'enterprise';
  veda_activa: boolean;
  activo: boolean;
  created_at: string;
}

export type UserRole = 'owner' | 'candidato' | 'coord_general' | 'coord_zona' | 'brigadista' | 'cm';

export interface User {
  id: string;
  email: string;
  nombre?: string;
  rol: UserRole;
  tenant_id: string;
  zona_id?: string;
  activo: boolean;
}

export interface Votante {
  id: string;
  tenant_id: string;
  nombre?: string;
  telefono?: string;
  email?: string;
  seccion_electoral?: string;
  colonia?: string;
  municipio?: string;
  coordenadas?: { lat: number; lng: number };
  nivel_apoyo?: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  origen_qr?: string;
  ultimo_contacto?: string;
  es_lider: boolean;
  activo: boolean;
  created_at: string;
}

export interface Lider {
  id: string;
  tenant_id: string;
  votante_id: string;
  votante?: Votante;
  lider_padre_id?: string;
  liderPadre?: Lider;
  lideresHijos: Lider[];
  zonas?: { id: string; nombre: string; secciones: string[]; color: string }[];
  alcance_estimado?: number;
  score: number;
  activo: boolean;
}

export interface Zona {
  id: string;
  tenant_id: string;
  nombre: string;
  secciones: string[];
  coordenadas?: any;
  color: string;
  activa: boolean;
  created_at: string;
}

export interface Evento {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  coordenadas?: { lat: number; lng: number };
  fecha_inicio: string;
  fecha_fin?: string;
  qr_code: string;
  asistentes_estimados?: number;
  status: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
  zona_id?: string;
  tematica?: string;
  lider_id?: string;
  ficha_informativa?: string;
  generar_ficha?: boolean;
  asistencias: Asistencia[];
}

export interface Asistencia {
  id: string;
  evento_id: string;
  votante_id: string;
  votante: Votante;
  registrado_por?: string;
  coordenadas?: { lat: number; lng: number };
  created_at: string;
}

export interface Apoyo {
  id: string;
  tenant_id: string;
  votante_id: string;
  votante: Votante;
  tipo_apoyo: string;
  cantidad: number;
  foto_url?: string;
  coordenadas?: { lat: number; lng: number };
  entregado_por: string;
  observaciones?: string;
  verificado: boolean;
  fecha_entrega: string;
}

export interface Mensaje {
  id: string;
  tenant_id: string;
  votante_id: string;
  votante: Votante;
  canal: 'whatsapp' | 'messenger' | 'form' | 'sms' | 'email';
  direccion: 'inbound' | 'outbound';
  contenido: string;
  template_usado?: string;
  tags_auto: string[];
  atendido_por?: string;
  tiempo_respuesta_seg?: number;
  leido: boolean;
  created_at: string;
}

export interface Boletin {
  id: string;
  tenant_id: string;
  prompt_usuario: string;
  copy_generado?: string;
  imagen_url?: string;
  caption_redes?: string;
  aprobado: boolean;
  aprobado_por?: string;
  fecha_publicacion?: string;
  created_by: string;
  created_at: string;
}

export interface CampanaLlamada {
  id: string;
  tenant_id: string;
  nombre: string;
  script?: string;
  voz_id_elevenlabs?: string;
  total_numeros: number;
  llamadas_exitosas: number;
  status: 'borrador' | 'activa' | 'pausada' | 'finalizada';
  created_at: string;
}

export interface Llamada {
  id: string;
  campana_id: string;
  votante_id: string;
  telefono: string;
  duracion_seg?: number;
  status: 'pendiente' | 'en_curso' | 'contestada' | 'no_contesta' | 'buzon' | 'fallida' | 'completada';
  transcripcion?: string;
  sentimiento?: 'positivo' | 'neutral' | 'negativo';
  created_at: string;
}

export interface MetricaDiaria {
  id: number;
  tenant_id: string;
  seccion: string;
  fecha: string;
  nuevos_registros: number;
  asistencias_eventos: number;
  apoyos_entregados: number;
  mensajes_enviados: number;
  cobertura_porcentaje?: number;
  recorrido_km: number;
}

export type CategoriaPeticion = 'bache' | 'alumbrado' | 'agua' | 'seguridad' | 'limpia' | 'salud' | 'otro';
export type PrioridadPeticion = 'baja' | 'media' | 'alta' | 'critica';
export type EstatusPeticion = 'reportada' | 'en_proceso' | 'atendida' | 'cancelada';

export interface Peticion {
  id: string;
  tenant_id: string;
  votante_id?: string;
  votante?: Votante;
  categoria: CategoriaPeticion;
  prioridad: PrioridadPeticion;
  estatus: EstatusPeticion;
  titulo?: string;
  descripcion: string;
  coordenadas?: { lat: number; lng: number };
  foto_url?: string;
  created_by: string;
  created_at: string;
}

export interface BitacoraINE {
  id: string;
  tenant_id: string;
  tipo: 'gasto_pauta' | 'donativo' | 'apoyo_entregado' | 'evento';
  descripcion: string;
  monto?: number;
  evidencia_url?: string;
  usuario_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  votantes: { total: number; nuevos: number };
  mensajes: { total: number; pendientes: number };
  eventos: { total: number; proximos: number };
  apoyos: { total: number; mes: number };
  llamadas: { total: number; contestadas: number };
  territorio: { recorrido: string; secciones: number };
}

export type EstatusEncuesta = 'borrador' | 'activa' | 'cerrada';
export type TipoPreguntaEncuesta = 'texto' | 'opcion_unica' | 'opcion_multiple' | 'escala' | 'si_no';

export interface PreguntaEncuesta {
  id: string;
  texto: string;
  tipo: TipoPreguntaEncuesta;
  opciones?: string[];
  requerida?: boolean;
  min?: number;
  max?: number;
}

export interface Encuesta {
  id: string;
  tenant_id: string;
  titulo: string;
  descripcion?: string;
  status: EstatusEncuesta;
  preguntas: PreguntaEncuesta[];
  created_by: string;
  created_at: string;
  updated_at?: string;
  respuestas_count?: number;
}

export interface RespuestaEncuesta {
  id: string;
  tenant_id: string;
  encuesta_id: string;
  votante_id?: string;
  votante?: { id?: string; nombre?: string };
  votante_nombre?: string;
  respuestas: { pregunta_id: string; valores: (string | number)[] }[];
  coordenadas?: { lat: number; lng: number };
  created_by?: string;
  created_at: string;
}

export type TipoCasilla = 'basica' | 'contigua' | 'especial' | 'extranjero';

export interface Casilla {
  id: string;
  tenant_id: string;
  seccion: string;
  tipo: TipoCasilla;
  numero?: string;
  ubicacion?: string;
  direccion?: string;
  coordenadas?: { lat: number; lng: number };
  referencia?: string;
  mesa_directiva?: string;
  horario_apertura?: string;
  horario_cierre?: string;
  electores_esperados?: number;
  status: 'sin_reportar' | 'abierta' | 'cerrada' | 'incidencia';
  incidencia?: string;
  responsable_id?: string;
  notas?: string;
  created_at: string;
  updated_at?: string;
  responsable?: { id: string; nombre?: string };
}

export interface MetaVotacion {
  id: string;
  tenant_id: string;
  seccion?: string;
  zona_id?: string;
  proceso: string;
  meta_votos: number;
  meta_lista_nominal?: number;
  meta_participacion?: number;
  created_at: string;
  updated_at?: string;
  zona?: { id: string; nombre: string };
}

export interface ProyeccionSeccion {
  seccion: string;
  votantes: number;
  apoyos: number;
  lideres: number;
  lista_nominal_2024?: number;
  meta_votos?: number;
  votos_estimados: number;
  faltan_para_ganar?: number;
  tendencia: 'arriba' | 'peleado' | 'abajo' | 'sin_datos';
}

export interface ResumenMonitoreo {
  total_casillas: number;
  sin_reportar: number;
  abiertas: number;
  cerradas: number;
  incidencias: number;
  votantes_esperados: number;
  por_seccion: { seccion: string; total: number; cerradas: number; abiertas: number; incidencias: number }[];
}

export interface FichaSeccional {
  seccion: string;
  votantes: number;
  lideres: number;
  apoyos: number;
  eventos: number;
  mensajes: number;
  casillas: Casilla[];
  lista_nominal_2024?: number;
  metas?: MetaVotacion[];
  resultados?: { anio: number; partido_ganador: string; votos_ganador?: number; votos_totales?: number; participacion_pct?: number }[];
  proyeccion?: ProyeccionSeccion;
}
