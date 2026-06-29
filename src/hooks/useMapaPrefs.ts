'use client';

import { useState, useCallback, useMemo, useRef } from 'react';

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

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function mergeRecords(
  saved: Record<string, any> | undefined,
  defaults: Record<string, any>
): Record<string, any> {
  const merged = { ...defaults };
  if (saved && typeof saved === 'object') {
    Object.entries(saved).forEach(([k, v]) => {
      merged[k] = v;
    });
  }
  return merged;
}

export function useMapaPrefs(key: string, defaults: MapaPrefs) {
  const storageKey = `estrato:${key}:prefs`;
  const defaultsRef = useRef(defaults);

  const initial = useMemo<MapaPrefs>(() => {
    const base = defaultsRef.current;
    if (typeof window === 'undefined') return base;
    const saved = safeParse<MapaPrefs>(localStorage.getItem(storageKey), {} as MapaPrefs);

    return {
      activas: mergeRecords(saved.activas, base.activas) as Record<string, boolean>,
      capasExpandidas: mergeRecords(saved.capasExpandidas, base.capasExpandidas) as Record<string, boolean>,
      gruposExpandidos: mergeRecords(saved.gruposExpandidos, base.gruposExpandidos) as Record<string, boolean>,
      filtrosApoyos: mergeRecords(saved.filtrosApoyos, base.filtrosApoyos) as Record<string, boolean>,
      grupoLideresPor: ['seccion', 'colonia', 'score'].includes(saved.grupoLideresPor)
        ? saved.grupoLideresPor
        : base.grupoLideresPor,
      soloLideresPadre: typeof saved.soloLideresPadre === 'boolean' ? saved.soloLideresPadre : base.soloLideresPadre,
      scoreMin: saved.scoreMin === '' || typeof saved.scoreMin === 'number' ? saved.scoreMin : base.scoreMin,
      zonaFiltro: typeof saved.zonaFiltro === 'string' ? saved.zonaFiltro : base.zonaFiltro,
      conSinCoordenadas: ['todos', 'con', 'sin'].includes(saved.conSinCoordenadas)
        ? saved.conSinCoordenadas
        : base.conSinCoordenadas,
      topN: saved.topN === '' || typeof saved.topN === 'number' ? saved.topN : base.topN,
      modoLideres: ['pines', 'circulos', 'heatmap', 'solo_puntos'].includes(saved.modoLideres)
        ? saved.modoLideres
        : base.modoLideres,
    };
  }, [storageKey]);

  const [prefs] = useState<MapaPrefs>(initial);

  const save = useCallback((next: Partial<MapaPrefs>) => {
    if (typeof window === 'undefined') return;
    try {
      const current = safeParse<MapaPrefs>(localStorage.getItem(storageKey), {} as MapaPrefs);
      const merged: MapaPrefs = {
        ...current,
        ...next,
        activas: { ...current.activas, ...next.activas },
        capasExpandidas: { ...current.capasExpandidas, ...next.capasExpandidas },
        gruposExpandidos: { ...current.gruposExpandidos, ...next.gruposExpandidos },
        filtrosApoyos: { ...current.filtrosApoyos, ...next.filtrosApoyos },
      };
      localStorage.setItem(storageKey, JSON.stringify(merged));
    } catch {
      // Silenciar errores de localStorage (modo privado, quota, etc.)
    }
  }, [storageKey]);

  const reset = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
    window.location.reload();
  }, [storageKey]);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { ...prefs, save, reset, clear };
}
