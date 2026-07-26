// Utilidades compartidas para evitar que movimientos programáticos del mapa
// disparen recargas de capas por cambio de bounds.

let ignoreMoveEndUntil = 0;

export function shouldIgnoreMoveEnd() {
  return Date.now() < ignoreMoveEndUntil;
}

export function registerProgrammaticMove(duration = 1200) {
  ignoreMoveEndUntil = Date.now() + duration + 200;
}
