export function errorToString(err: any): string {
  if (err === null || err === undefined) return 'Error desconocido';
  if (typeof err === 'string') return truncar(err);
  if (Array.isArray(err)) {
    return err.map(errorToString).join('; ') || 'Error desconocido';
  }
  if (typeof err === 'object') {
    // Axios error: priorizar mensaje corto y evitar exponer request/response bodies grandes
    if (err.name === 'AxiosError' || err.isAxiosError) {
      if (err.response?.data?.message) {
        return errorToString(err.response.data.message);
      }
      if (err.response?.data?.error) {
        return errorToString(err.response.data.error);
      }
      return truncar(err.message) || `Error de red (${err.code || 'desconocido'})`;
    }

    if (err.response?.data?.message) {
      return errorToString(err.response.data.message);
    }
    if (err.response?.data?.error) {
      return errorToString(err.response.data.error);
    }
    if (err.message) {
      return errorToString(err.message);
    }
    if (err.error) {
      return errorToString(err.error);
    }

    // Último recurso: nunca exponer el objeto completo (puede contener configs, bodies, etc.)
    return 'Error inesperado. Revisa la consola del navegador para más detalles.';
  }
  return truncar(String(err));
}

function truncar(str: string, max = 220): string {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
