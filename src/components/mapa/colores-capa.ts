// Paleta de colores unificada para la numeralía del mapa y los pines de cada capa.
// Cada categoría tiene un color propio y lo más distintivo posible de las demás.

export const COLORES_CAPA = {
  votantes: '#E11D48',     // rojo rosado
  apoyos: '#F59E0B',       // naranja ámbar
  peticiones: '#0EA5E9',   // azul cielo
  eventos: '#8B5CF6',      // violeta
  lideres: '#10B981',      // verde esmeralda
  secciones: '#6366F1',    // índigo
  casillas: '#EC4899',     // rosa
  riesgo: '#DC2626',       // rojo fuego
  propio: '#22C55E',       // verde éxito
  recorridos: '#64748B',    // slate
  custom: '#F97316',        // naranja vivo
} as const;

export type CapaColorKey = keyof typeof COLORES_CAPA;
