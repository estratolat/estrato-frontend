import { UserRole } from '@/hooks/useAuth';

export interface Seccion {
  id: string;
  label: string;
  icon: string;
  color?: string;
}

export const SECCIONES: Seccion[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', color: '#D73216' },
  { id: 'votantes', label: 'Votantes', icon: 'votantes', color: '#3B82F6' },
  { id: 'crm', label: 'CRM', icon: 'crm', color: '#25D366' },
  { id: 'eventos', label: 'Eventos', icon: 'eventos', color: '#F59E0B' },
  { id: 'mapa', label: 'Mapa Territorial', icon: 'mapa', color: '#8B5CF6' },
  { id: 'boletines', label: 'Boletines IA', icon: 'boletines', color: '#06B6D4' },
  { id: 'llamadas', label: 'Llamadas', icon: 'llamadas', color: '#EC4899' },
  { id: 'candidato', label: 'Perfil del Candidato', icon: 'user', color: '#D73216' },
  { id: 'encuestas', label: 'Encuestas', icon: 'crm', color: '#10B981' },
  { id: 'casillas', label: 'Casillas', icon: 'mapa', color: '#6366F1' },
  { id: 'monitoreo', label: 'Monitoreo', icon: 'dashboard', color: '#F43F5E' },
  { id: 'proyeccion', label: 'Proyección', icon: 'historico', color: '#8B5CF6' },
  { id: 'ficha_seccional', label: 'Ficha Seccional', icon: 'votantes', color: '#06B6D4' },
  { id: 'usuarios', label: 'Configuración / Usuarios', icon: 'seguridad', color: '#64748B' },
  { id: 'app_brigada', label: 'App de Brigada', icon: 'app', color: '#D73216' },
  { id: 'historico_electoral', label: 'Histórico Electoral', icon: 'historico', color: '#F59E0B' },
  { id: 'inteligencia_electoral', label: 'Inteligencia Electoral', icon: 'historico', color: '#7C3AED' },
  { id: 'admin', label: 'Admin Proyectos', icon: 'seguridad', color: '#7C3AED' },
];

export function permisosPorRol(rol: UserRole | string): string[] {
  const defaults: Record<string, string[]> = {
    owner: ['dashboard', 'votantes', 'crm', 'eventos', 'mapa', 'boletines', 'llamadas', 'candidato', 'encuestas', 'casillas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'usuarios', 'app_brigada', 'historico_electoral', 'inteligencia_electoral'],
    candidato: ['dashboard', 'votantes', 'crm', 'eventos', 'mapa', 'boletines', 'llamadas', 'candidato', 'encuestas', 'casillas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'usuarios', 'app_brigada', 'historico_electoral', 'inteligencia_electoral'],
    coord_general: ['dashboard', 'votantes', 'crm', 'eventos', 'mapa', 'boletines', 'llamadas', 'encuestas', 'casillas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'app_brigada', 'historico_electoral', 'inteligencia_electoral'],
    coord_zona: ['dashboard', 'votantes', 'crm', 'eventos', 'mapa', 'encuestas', 'casillas', 'monitoreo', 'ficha_seccional', 'app_brigada'],
    brigadista: ['app_brigada'],
    cm: ['dashboard', 'crm', 'boletines', 'candidato', 'encuestas', 'monitoreo', 'proyeccion', 'ficha_seccional', 'historico_electoral', 'inteligencia_electoral'],
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
