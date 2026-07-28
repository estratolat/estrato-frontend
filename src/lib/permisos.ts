import { UserRole } from '@/hooks/useAuth';

export interface Seccion {
  id: string;
  label: string;
  icon: string;
  color?: string;
}

export const SECCIONES: Seccion[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: '#B91C1C' },
  { id: 'votantes', label: 'Votantes', icon: 'votantes', color: '#2563EB' },
  { id: 'crm', label: 'CRM', icon: 'crm', color: '#16A34A' },
  { id: 'peticiones', label: 'Operaciones', icon: 'apoyos', color: '#06B6D4' },
  { id: 'eventos', label: 'Eventos', icon: 'eventos', color: '#7C3AED' },
  { id: 'mapa', label: 'Mapa Territorial', icon: 'mapa', color: '#EA580C' },
  { id: 'boletines', label: 'Boletines IA', icon: 'boletines', color: '#0369A1' },
  { id: 'llamadas', label: 'Llamadas', icon: 'llamadas', color: '#9F1239' },
  { id: 'candidato', label: 'Perfil del Candidato', icon: 'user', color: '#BE185D' },
  { id: 'encuestas', label: 'Encuestas', icon: 'crm', color: '#D97706' },
  { id: 'casillas', label: 'Casillas', icon: 'mapa', color: '#DB2777' },
  { id: 'monitoreo', label: 'Monitoreo', icon: 'dashboard', color: '#0891B2' },
  { id: 'proyeccion', label: 'Proyección', icon: 'historico', color: '#0F766E' },
  { id: 'ficha_seccional', label: 'Ficha Seccional', icon: 'votantes', color: '#C2410C' },
  { id: 'usuarios', label: 'Configuración / Usuarios', icon: 'seguridad', color: '#475569' },
  { id: 'app_brigada', label: 'App de Brigada', icon: 'app', color: '#000000' },
  { id: 'historico_electoral', label: 'Histórico Electoral', icon: 'historico', color: '#4338CA' },
  { id: 'inteligencia_electoral', label: 'Inteligencia Electoral', icon: 'historico', color: '#9333EA' },
  { id: 'admin', label: 'Admin Proyectos', icon: 'seguridad', color: '#1E40AF' },
  { id: 'opositores', label: 'Opositores', icon: 'opositores', color: '#DC2626' },
  { id: 'data', label: 'Data', icon: 'data', color: '#0891B2' },
  { id: 'informes_ine', label: 'Informes INE', icon: 'documento', color: '#7C2D12' },
];

export function permisosPorRol(rol: UserRole | string): string[] {
  const defaults: Record<string, string[]> = {
    owner: ['dashboard', 'votantes', 'crm', 'peticiones', 'eventos', 'mapa', 'boletines', 'llamadas', 'candidato', 'encuestas', 'casillas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'usuarios', 'app_brigada', 'historico_electoral', 'inteligencia_electoral', 'opositores', 'data', 'informes_ine'],
    candidato: ['dashboard', 'votantes', 'crm', 'peticiones', 'eventos', 'mapa', 'boletines', 'llamadas', 'candidato', 'encuestas', 'casillas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'usuarios', 'app_brigada', 'historico_electoral', 'inteligencia_electoral', 'opositores', 'data', 'informes_ine'],
    coord_general: ['dashboard', 'votantes', 'crm', 'peticiones', 'eventos', 'mapa', 'boletines', 'llamadas', 'encuestas', 'casillas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'app_brigada', 'historico_electoral', 'inteligencia_electoral', 'opositores', 'data', 'informes_ine'],
    coord_zona: ['dashboard', 'votantes', 'crm', 'peticiones', 'eventos', 'mapa', 'encuestas', 'casillas', 'monitoreo', 'ficha_seccional', 'app_brigada'],
    brigadista: ['app_brigada'],
    cm: ['dashboard', 'crm', 'boletines', 'candidato', 'encuestas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'historico_electoral', 'inteligencia_electoral', 'opositores', 'data'],
    encargado_peticiones: ['dashboard', 'peticiones', 'votantes', 'crm', 'mapa', 'encuestas', 'monitoreo', 'ficha_seccional'],
    superadmin: ['admin'],
  };
  return defaults[rol] || [];
}

export function puedeAcceder(
  permisos: string[] | undefined,
  seccion: string,
  rol?: UserRole | string
): boolean {
  if (!permisos || permisos.length === 0) {
    // Fallback a permisos por rol si no hay permisos personalizados
    const fallback = rol ? permisosPorRol(rol) : [];
    return fallback.includes(seccion);
  }
  return permisos.includes(seccion);
}

export function labelSeccion(id: string): string {
  return SECCIONES.find((s) => s.id === id)?.label || id;
}

export function esSoloAppBrigada(
  permisos: string[] | undefined,
  rol?: UserRole | string
): boolean {
  const efectivos = permisos && permisos.length > 0 ? permisos : (rol ? permisosPorRol(rol) : []);
  return efectivos.length === 1 && efectivos[0] === 'app_brigada';
}
