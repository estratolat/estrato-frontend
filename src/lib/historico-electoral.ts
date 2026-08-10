export type DesglosePartido = {
  partido: string;
  votos: number;
  tipo: "individual" | "coalicion";
  candidato?: string;
};

export type DesglosePartidoInputItem = {
  partido?: string;
  votos?: number | string;
  tipo?: string;
  candidato?: string;
};

export type DesglosePartidosInput =
  | DesglosePartidoInputItem[]
  | Record<string, number>
  | null
  | undefined;

/**
 * Normaliza el desglose de partidos que puede venir como array de objetos,
 * como un objeto Record<partido, votos>, o null/undefined.
 */
export function normalizarDesglose(
  desglose?: DesglosePartidosInput
): DesglosePartido[] {
  if (!desglose) return [];
  if (Array.isArray(desglose)) {
    return desglose.map((d) => ({
      partido: d?.partido ?? "",
      votos:
        typeof d?.votos === "number"
          ? d.votos
          : typeof d?.votos === "string"
            ? Number(d.votos) || 0
            : 0,
      tipo: d?.tipo === "coalicion" ? "coalicion" : "individual",
      candidato: d?.candidato,
    }));
  }
  if (typeof desglose === "object") {
    return Object.entries(desglose).map(([partido, votos]) => ({
      partido,
      votos: typeof votos === "number" ? votos : Number(votos) || 0,
      tipo: "individual" as const,
    }));
  }
  return [];
}
