'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/lib/api';
import { permisosPorRol } from '@/lib/permisos';

export type UserRole =
  | 'owner'
  | 'candidato'
  | 'coord_general'
  | 'coord_zona'
  | 'brigadista'
  | 'cm'
  | 'superadmin';

export interface AuthUser {
  id: string;
  email: string;
  nombre?: string;
  rol: UserRole;
  tenant_id: string;
  tenant_slug?: string;
  zona_id?: string;
  permisos?: string[];
}

function readStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = useCallback((raw: AuthUser | null): AuthUser | null => {
    if (!raw) return null;
    // Asegurar que permisos sea un array; si no, fallback por rol
    let permisos = Array.isArray(raw.permisos) ? raw.permisos : readStorage<string[]>('permisos');
    if (!permisos || permisos.length === 0) {
      permisos = permisosPorRol(raw.rol);
    }
    return { ...raw, permisos };
  }, []);

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    let parsed = readStorage<AuthUser>('user');

    // Si hay token, siempre refrescar permisos desde /auth/me para mantenerlos actualizados
    if (token) {
      try {
        const { data } = await authApi.getMe();
        if (data && data.id) {
          const refreshed: AuthUser = {
            id: data.id,
            email: data.email,
            nombre: data.nombre || undefined,
            rol: data.rol as UserRole,
            tenant_id: data.tenant_id,
            tenant_slug: data.tenant?.slug || readStorage<string>('tenantSlug') || undefined,
            zona_id: data.zona_id || undefined,
            permisos: Array.isArray(data.permisos) ? data.permisos : undefined,
          };
          localStorage.setItem('user', JSON.stringify(refreshed));
          parsed = refreshed;
        }
      } catch (e) {
        // Si falla /auth.me, seguimos con lo que haya en localStorage
      }
    }

    setUser(normalizeUser(parsed));
    setLoading(false);
  }, [normalizeUser]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveUser = useCallback((u: AuthUser) => {
    if (typeof window !== 'undefined') {
      const normalized = Array.isArray(u.permisos) ? u.permisos : permisosPorRol(u.rol);
      const toSave = { ...u, permisos: normalized };
      localStorage.setItem('user', JSON.stringify(toSave));
      localStorage.setItem('permisos', JSON.stringify(normalized));
      setUser(toSave);
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('tenantId');
      localStorage.removeItem('tenantSlug');
      localStorage.removeItem('user');
      localStorage.removeItem('permisos');
      document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      window.location.href = '/login';
    }
  }, []);

  return { user, loading, refresh, saveUser, logout };
}
