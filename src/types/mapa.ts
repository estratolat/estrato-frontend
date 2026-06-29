export interface MapaPrefs {
  activas: Record<string, boolean>;
  capasExpandidas: Record<string, boolean>;
  gruposExpandidos: Record<string, boolean>;
  filtrosApoyos: Record<string, boolean>;
  grupoLideresPor: 'seccion' | 'colonia' | 'score';
  soloLideresPadre: boolean;
  scoreMin: number | '';
  zonaFiltro: string;
  conSinCoordenadas: 'todos' | 'con' | 'sin';
  topN: number | '';
  modoLideres: 'pines' | 'circulos' | 'heatmap' | 'solo_puntos';
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: Record<string, any>;
}

export interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface CapaMapa {
  id: string;
  tipo: string;
  nombre: string;
  origen: string;
  color: string;
  visible: boolean;
  orden: number;
  metadata?: Record<string, any>;
}

export interface MapaData {
  votantes?: GeoJSONCollection;
  apoyos?: GeoJSONCollection;
  eventos?: GeoJSONCollection;
  recorridos?: GeoJSONCollection;
  lideres?: GeoJSONCollection;
  zonas?: GeoJSONCollection;
  [key: string]: GeoJSONCollection | undefined;
}

export type CapaActiva =
  | 'votantes'
  | 'recorridos'
  | 'apoyos'
  | 'peticiones'
  | 'eventos'
  | 'lideres'
  | 'custom';

export interface SeccionStats {
  seccion: string;
  votantes: number;
  apoyos: number;
  lideres: number;
  votos_estimados: number;
  faltan_para_ganar?: number;
  color?: string;
}

export type TipoResultadoGlobal = 'capa';

export interface ResultadoGlobal {
  id: string;
  tipo: TipoResultadoGlobal;
  nombre: string;
  descripcion?: string;
  estado_id?: number;
  municipio_id?: number;
  estado?: string;
  municipio?: string;
  seccion?: string;
  clave?: string;
  bbox?: [number, number, number, number];
  geometry?: any;
}

export interface ItemTerritorial {
  id: string;
  nombre?: string;
  tipo?: string;
  [key: string]: any;
}

export interface ResumenTerritorial {
  votantes: { count: number; items: ItemTerritorial[] };
  lideres: { count: number; items: ItemTerritorial[] };
  apoyos: { count: number; items: ItemTerritorial[] };
  eventos: { count: number; items: ItemTerritorial[] };
  peticiones: { count: number; items: ItemTerritorial[] };
}

export interface DetalleTerritorial {
  tipo: TipoResultadoGlobal;
  id: string;
  nombre: string;
  geometry: any;
  bbox: [number, number, number, number];
  datos_oficiales: Record<string, any>;
  resumen: ResumenTerritorial;
}
