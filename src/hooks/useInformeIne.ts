'use client';

import { useEffect, useState, useCallback } from 'react';

export type Responsable = 'contador' | 'operador_estrato' | 'responsable_finanzas' | 'candidato' | 'todos';

export interface ChecklistItem {
  id: string;
  label: string;
  responsable: Responsable;
  ayuda?: string;
}

export interface NumeraliaItem {
  id: string;
  concepto: string;
  unidad: string;
  directo: number;
  centralizado: number;
}

export interface InformeIneState {
  checklist: Record<string, boolean>;
  numeralia: Record<string, NumeraliaItem>;
  notas: string;
  periodo: string;
  tipo: 'normal' | 'ajuste';
  lastUpdated?: string;
}

const STORAGE_KEY = 'estrato_informe_ine';

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'responsable_finanzas', label: 'Responsable de Finanzas registrado en SIF con RFC correcto', responsable: 'responsable_finanzas', ayuda: 'Verificar en módulo Administración > Responsable de Finanzas del SIF V2.0.' },
  { id: 'efirma_activa', label: 'e.firma (FIEL) del Responsable de Finanzas vigente', responsable: 'responsable_finanzas', ayuda: 'Archivos .cer y .key disponibles y contraseña actualizada.' },
  { id: 'lema_capturado', label: 'Lema de campaña capturado (opcional pero recomendado)', responsable: 'operador_estrato', ayuda: 'Capturar en Informes > Lema y Casas de Campaña.' },
  { id: 'casa_campagna', label: 'Al menos una Casa de Campaña registrada con domicilio', responsable: 'operador_estrato', ayuda: 'Obligatorio para enviar a firma. Si la casa de precampaña es la misma, se debe volver a capturar.' },
  { id: 'contabilidad_periodo', label: 'Pólizas contables del periodo capturadas en SIF', responsable: 'contador', ayuda: 'Ingresos, gastos, aportaciones en efectivo y en especie.' },
  { id: 'numeralia_completa', label: 'Numeralia de Gastos llenada por rubro', responsable: 'operador_estrato', ayuda: 'Cantidades físicas: bardas, volantes, espectaculares, eventos, etc.' },
  { id: 'eventos_exportados', label: 'Eventos políticos exportados desde ESTRATO para SIF', responsable: 'operador_estrato', ayuda: 'Descargar CSV/Excel y entregar al contador para carga en el anexo.' },
  { id: 'documentacion_600mb', label: 'Documentación adjunta dentro del límite de 600 MB', responsable: 'todos', ayuda: 'Si se excede, se debe cargar póliza contable en $0.00 con concepto Documentación Adjunta Adicional.' },
  { id: 'vista_previa_revisada', label: 'Vista previa del IC / IC-COA revisada', responsable: 'responsable_finanzas', ayuda: 'Verificar secciones I-VII y anexos antes de enviar a firma.' },
  { id: 'envio_firma', label: 'Informe enviado a firma del Responsable de Finanzas', responsable: 'responsable_finanzas' },
  { id: 'presentacion_exitosa', label: 'Informe presentado con acuse de recepción', responsable: 'responsable_finanzas', ayuda: 'Plazo: 3 días naturales posteriores al cierre del periodo.' },
];

export const CONCEPTOS_NUMERALIA: { id: string; concepto: string; unidad: string }[] = [
  { id: 'volantes', concepto: 'Volantes y propaganda impresa', unidad: 'piezas' },
  { id: 'carteles', concepto: 'Carteles / posters', unidad: 'piezas' },
  { id: 'bardas', concepto: 'Bardas pintadas', unidad: 'bardas' },
  { id: 'espectaculares', concepto: 'Anuncios espectaculares', unidad: 'espectaculares' },
  { id: 'cine', concepto: 'Propaganda en salas de cine', unidad: 'spots' },
  { id: 'radio_tv', concepto: 'Mensajes de radio y televisión', unidad: 'spots' },
  { id: 'internet', concepto: 'Propaganda en páginas de internet', unidad: 'anuncios' },
  { id: 'diarios_revistas', concepto: 'Anuncios en diarios, revistas e impresos', unidad: 'anuncios' },
  { id: 'eventos', concepto: 'Eventos políticos realizados', unidad: 'eventos' },
  { id: 'repap', concepto: 'REPAP (Representantes de Partido)', unidad: 'piezas' },
  { id: 'estructura_electoral', concepto: 'Estructura electoral', unidad: 'piezas' },
  { id: 'transporte', concepto: 'Transporte / movilización', unidad: 'servicios' },
  { id: 'alimentos', concepto: 'Alimentos y bebidas en eventos', unidad: 'servicios' },
  { id: 'sonido_iluminacion', concepto: 'Sonido e iluminación', unidad: 'servicios' },
];

export const RESPONSABLE_LABEL: Record<Responsable, string> = {
  contador: 'Contador',
  operador_estrato: 'Operador ESTRATO',
  responsable_finanzas: 'Responsable de Finanzas',
  candidato: 'Candidato',
  todos: 'Todos',
};

export function useInformeIne(tenantId?: string) {
  const key = tenantId ? `${STORAGE_KEY}_${tenantId}` : STORAGE_KEY;
  const [state, setState] = useState<InformeIneState>(() => {
    if (typeof window === 'undefined') {
      return buildDefaultState();
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return mergeWithDefaults(parsed);
      }
    } catch {
      // ignore
    }
    return buildDefaultState();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(state));
  }, [state, key]);

  const toggleCheck = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [id]: !prev.checklist[id] },
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const setNumeralia = useCallback((id: string, campo: 'directo' | 'centralizado', valor: number) => {
    setState(prev => ({
      ...prev,
      numeralia: {
        ...prev.numeralia,
        [id]: { ...prev.numeralia[id], [campo]: Number.isNaN(valor) ? 0 : valor },
      },
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const setNotas = useCallback((notas: string) => {
    setState(prev => ({ ...prev, notas, lastUpdated: new Date().toISOString() }));
  }, []);

  const setPeriodo = useCallback((periodo: string) => {
    setState(prev => ({ ...prev, periodo, lastUpdated: new Date().toISOString() }));
  }, []);

  const setTipo = useCallback((tipo: 'normal' | 'ajuste') => {
    setState(prev => ({ ...prev, tipo, lastUpdated: new Date().toISOString() }));
  }, []);

  const reset = useCallback(() => {
    setState(buildDefaultState());
  }, []);

  const completados = DEFAULT_CHECKLIST.filter(i => state.checklist[i.id]).length;
  const total = DEFAULT_CHECKLIST.length;
  const porcentaje = Math.round((completados / total) * 100);

  return {
    state,
    toggleCheck,
    setNumeralia,
    setNotas,
    setPeriodo,
    setTipo,
    reset,
    items: DEFAULT_CHECKLIST,
    conceptos: CONCEPTOS_NUMERALIA,
    responsables: RESPONSABLE_LABEL,
    progreso: { completados, total, porcentaje },
  };
}

function buildDefaultState(): InformeIneState {
  const numeralia: Record<string, NumeraliaItem> = {};
  CONCEPTOS_NUMERALIA.forEach(c => {
    numeralia[c.id] = { id: c.id, concepto: c.concepto, unidad: c.unidad, directo: 0, centralizado: 0 };
  });
  return {
    checklist: {},
    numeralia,
    notas: '',
    periodo: '',
    tipo: 'normal',
  };
}

function mergeWithDefaults(parsed: Partial<InformeIneState>): InformeIneState {
  const base = buildDefaultState();
  const mergedNumeralia = { ...base.numeralia, ...(parsed.numeralia || {}) };
  // Asegurar que todos los conceptos existan
  CONCEPTOS_NUMERALIA.forEach(c => {
    if (!mergedNumeralia[c.id]) {
      mergedNumeralia[c.id] = { id: c.id, concepto: c.concepto, unidad: c.unidad, directo: 0, centralizado: 0 };
    }
  });
  return {
    checklist: parsed.checklist || {},
    numeralia: mergedNumeralia,
    notas: parsed.notas || '',
    periodo: parsed.periodo || '',
    tipo: parsed.tipo || 'normal',
    lastUpdated: parsed.lastUpdated,
  };
}
