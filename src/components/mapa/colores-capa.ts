// Paleta de colores unificada para la numeralía del mapa y los pines de cada capa.
// Cada categoría tiene un color propio y lo más distintivo posible de las demás.

export const COLORES_CAPA = {
  votantes: '#DC2626',     // rojo vivo
  apoyos: '#F59E0B',       // naranja ámbar
  peticiones: '#0EA5E9',   // azul cielo
  eventos: '#7C3AED',      // violeta intenso
  lideres: '#059669',      // verde bosque
  secciones: '#2563EB',    // azul royal
  casillas: '#DB2777',     // fucsia
  riesgo: '#991B1B',       // rojo vino oscuro
  propio: '#16A34A',       // verde hoja
  recorridos: '#475569',   // slate oscuro
  custom: '#EA580C',       // naranja quemado
} as const;

export type CapaColorKey = keyof typeof COLORES_CAPA;
