import axios from 'axios';

// Cliente API base
// En el navegador usamos /api para aprovechar los rewrites de Next.js y evitar CORS.
// En SSR usamos NEXT_PUBLIC_API_URL directamente cuando existe.
const isBrowser = typeof window !== 'undefined';
export const api = axios.create({
  baseURL: isBrowser ? '/api' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token y tenant
api.interceptors.request.use(
  (config) => {
    // En el navegador forzar URL absoluta al mismo origen para evitar problemas de baseURL
    if (typeof window !== 'undefined' && config.url && !config.url.startsWith('http')) {
      config.baseURL = `${window.location.origin}/api`;
    }

    // Si el body es FormData dejar que el navegador ponga el boundary correcto
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Obtener token del localStorage o cookie
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Agregar tenant ID si existe
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    // Bypass Vercel Deployment Protection en producción
    const bypassSecret = process.env.NEXT_PUBLIC_VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypassSecret) {
      config.headers['x-vercel-protection-bypass'] = bypassSecret;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirigir a login si el token expiró
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        const isBrigada = window.location.pathname.startsWith('/brigada');
        window.location.href = isBrigada ? '/brigada/login' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

// === API de Usuarios ===
export const usersApi = {
  getAll: () => api.get('/users'),
  getOne: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getPermisosSchema: () => api.get('/users/permisos/schema'),
};

// === API de Admin Central ===
export const adminApi = {
  getProjects: () => api.get('/admin/projects'),
  createProject: (data: any) => api.post('/admin/projects', data),
  getProject: (id: string) => api.get(`/admin/projects/${id}`),
};

// === API de Tenants ===
export const tenantsApi = {
  getBySlug: (slug: string) => api.get(`/tenants/${slug}`),
  getLanding: (slug: string) => api.get(`/tenants/${slug}/landing`),
  getStats: (slug: string) => api.get(`/tenants/${slug}/stats`),
  create: (data: any) => api.post('/tenants', data),
};

// === API de Votantes ===
export const votantesApi = {
  getAll: (filters?: any) => api.get('/votantes', { params: filters }),
  getOne: (id: string) => api.get(`/votantes/${id}`),
  create: (data: any) => api.post('/votantes', data),
  update: (id: string, data: any) => api.patch(`/votantes/${id}`, data),
  getStats: () => api.get('/votantes/stats'),
  importar: (votantes: any[]) => api.post('/votantes/importar', { votantes }),
};

// === API de Eventos ===
export const eventosApi = {
  getAll: (filters?: any) => api.get('/eventos', { params: filters }),
  getOne: (id: string) => api.get(`/eventos/${id}`),
  create: (data: any) => api.post('/eventos', data),
  update: (id: string, data: any) => api.patch(`/eventos/${id}`, data),
  registrarAsistencia: (eventoId: string, data: any) =>
    api.post(`/eventos/${eventoId}/asistencias`, data),
  eliminarAsistencia: (eventoId: string, votanteId: string) =>
    api.delete(`/eventos/${eventoId}/asistencias/${votanteId}`),
};

// === API de Auth ===
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  loginBrigada: (telefono: string, pin: string) =>
    api.post('/auth/brigada/login', { telefono, pin }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// === API de CRM ===
export const crmApi = {
  getConversaciones: (filters?: any) => api.get('/crm/conversaciones', { params: filters }),
  getMensajes: (filters?: any) => api.get('/crm/mensajes', { params: filters }),
  enviarMensaje: (data: any) => api.post('/crm/mensajes', data),
  marcarLeido: (id: string) => api.patch(`/crm/mensajes/${id}/leido`),
  getStats: () => api.get('/crm/stats'),
};

// === API de Apoyos ===
export const apoyosApi = {
  getAll: (filters?: any) => api.get('/apoyos', { params: filters }),
  create: (data: any) => api.post('/apoyos', data),
  getStats: () => api.get('/apoyos/stats'),
};

// === API de Zonas ===
export const zonasApi = {
  getAll: () => api.get('/zonas'),
  getOne: (id: string) => api.get(`/zonas/${id}`),
};

// === API de Líderes ===
export const lideresApi = {
  getAll: (filters?: any) => api.get('/lideres', { params: filters }),
  getOne: (id: string) => api.get(`/lideres/${id}`),
  create: (data: any) => api.post('/lideres', data),
  update: (id: string, data: any) => api.patch(`/lideres/${id}`, data),
  delete: (id: string) => api.delete(`/lideres/${id}`),
  updateScore: (id: string, score: number) => api.patch(`/lideres/${id}/score`, { score }),
  getStats: () => api.get('/lideres/stats/resumen'),
  getGeoJsonInfluencia: (radioM = 500) =>
    api.get('/lideres/geojson/influencia', { params: { radio_m: radioM } }),
};

// === API de Boletines ===
export const boletinesApi = {
  getAll: () => api.get('/boletines'),
  create: (data: any) => api.post('/boletines', data),
  generar: (tipo: 'boletin' | 'redes', contexto: ContextoGeneracion) =>
    api.post('/boletines/generar', { tipo, ...contexto }),
  aprobar: (id: string) => api.patch(`/boletines/${id}/aprobar`),
  rechazar: (id: string) => api.patch(`/boletines/${id}/rechazar`),
};

// === API de Llamadas Automáticas ===
export const llamadasApi = {
  getCampanas: () => api.get('/llamadas/campanas'),
  getCampana: (id: string) => api.get(`/llamadas/campanas/${id}`),
  createCampana: (data: any) => api.post('/llamadas/campanas', data),
  updateCampana: (id: string, data: any) => api.patch(`/llamadas/campanas/${id}`, data),
  deleteCampana: (id: string) => api.delete(`/llamadas/campanas/${id}`),
  importarVotantes: (id: string, votante_ids: string[]) =>
    api.post(`/llamadas/campanas/${id}/importar`, { votante_ids }),
  getLlamadas: (campanaId: string) => api.get(`/llamadas/campanas/${campanaId}/llamadas`),
  iniciarLlamada: (campanaId: string, votante_id: string) =>
    api.post(`/llamadas/campanas/${campanaId}/llamadas`, { votante_id }),
};

// === API de INE ===
export const ineApi = {
  getBitacora: () => api.get('/ine/bitacora'),
  registrar: (data: any) => api.post('/ine/bitacora', data),
  exportar: () => api.get('/ine/exportar', { responseType: 'blob' }),
};

// === API de Uploads ===
export const uploadsApi = {
  uploadFoto: (file: File) => {
    const formData = new FormData();
    formData.append('foto', file);
    return api.post('/uploads/foto', formData);
  },
};

// === API de Peticiones ===
export const peticionesApi = {
  getAll: (filters?: any) => api.get('/peticiones', { params: filters }),
  create: (data: any) => api.post('/peticiones', data),
  updateEstatus: (id: string, estatus: string) => api.patch(`/peticiones/${id}/estatus`, { estatus }),
};

// === API de Candidato ===
export interface ContextoGeneracion {
  tema?: string;
  que?: string;
  quien?: string;
  como?: string;
  cuando?: string;
  donde?: string;
  por_que?: string;
  para_que?: string;
}

export const candidatoApi = {
  getPerfil: () => api.get('/candidato/perfil'),
  upsertPerfil: (data: any) => api.post('/candidato/perfil', data),
  analizar: (transcribir_video = false) => api.post('/candidato/perfil/analizar', { transcribir_video }),
  generarContenido: (tipo: 'boletin' | 'redes', contexto: ContextoGeneracion) =>
    api.post('/candidato/generar', { tipo, ...contexto }),
};

// === API de Resultados Históricos ===
export const resultadosHistoricosApi = {
  getAll: (filters?: any) => api.get('/resultados-historicos', { params: filters }),
  getResumen: () => api.get('/resultados-historicos/resumen'),
  importar: (formData: FormData) => api.post('/resultados-historicos/importar', formData),
};

// === API de Encuestas ===
export const encuestasApi = {
  getAll: (filters?: any) => api.get('/encuestas', { params: filters }),
  getOne: (id: string) => api.get(`/encuestas/${id}`),
  create: (data: any) => api.post('/encuestas', data),
  update: (id: string, data: any) => api.patch(`/encuestas/${id}`, data),
  delete: (id: string) => api.delete(`/encuestas/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/encuestas/${id}/estatus`, { status }),
  getRespuestas: (id: string, filters?: any) => api.get(`/encuestas/${id}/respuestas`, { params: filters }),
  createRespuesta: (id: string, data: any) => api.post(`/encuestas/${id}/respuestas`, data),
  getResumen: (id: string) => api.get(`/encuestas/${id}/resumen`),
};

// === API de Casillas ===
export const casillasApi = {
  getAll: (filters?: any) => api.get('/casillas', { params: filters }),
  getOne: (id: string) => api.get(`/casillas/${id}`),
  create: (data: any) => api.post('/casillas', data),
  update: (id: string, data: any) => api.patch(`/casillas/${id}`, data),
  delete: (id: string) => api.delete(`/casillas/${id}`),
  updateStatus: (id: string, status: string, incidencia?: string) =>
    api.patch(`/casillas/${id}/estatus`, { status, incidencia }),
  importar: (formData: FormData) => api.post('/casillas/importar', formData),
};

// === API de Monitoreo ===
export const monitoreoApi = {
  getResumen: () => api.get('/monitoreo/resumen'),
  getCasillas: (filters?: any) => api.get('/monitoreo/casillas', { params: filters }),
  getIncidencias: () => api.get('/monitoreo/incidencias'),
};

// === API de Proyección ===
export const proyeccionApi = {
  getResumen: (params?: any) => api.get('/proyeccion/resumen', { params }),
  getSecciones: (params?: any) => api.get('/proyeccion/secciones', { params }),
  getMetas: (filters?: any) => api.get('/proyeccion/metas', { params: filters }),
  createMeta: (data: any) => api.post('/proyeccion/metas', data),
  updateMeta: (id: string, data: any) => api.patch(`/proyeccion/metas/${id}`, data),
  deleteMeta: (id: string) => api.delete(`/proyeccion/metas/${id}`),
};

// === API de Inteligencia Electoral ===
export const inteligenciaElectoralApi = {
  // Partidos
  getPartidos: () => api.get('/inteligencia-electoral/partidos'),
  createPartido: (data: any) => api.post('/inteligencia-electoral/partidos', data),
  updatePartido: (id: string, data: any) => api.patch(`/inteligencia-electoral/partidos/${id}`, data),
  deletePartido: (id: string) => api.delete(`/inteligencia-electoral/partidos/${id}`),

  // Elecciones
  getElecciones: (activas?: boolean) => api.get('/inteligencia-electoral/elecciones', { params: { activas } }),
  getEleccion: (id: string) => api.get(`/inteligencia-electoral/elecciones/${id}`),
  createEleccion: (data: any) => api.post('/inteligencia-electoral/elecciones', data),
  updateEleccion: (id: string, data: any) => api.patch(`/inteligencia-electoral/elecciones/${id}`, data),
  deleteEleccion: (id: string) => api.delete(`/inteligencia-electoral/elecciones/${id}`),

  // Actores
  getActores: (eleccionId: string) => api.get(`/inteligencia-electoral/elecciones/${eleccionId}/actores`),
  createActor: (eleccionId: string, data: any) => api.post(`/inteligencia-electoral/elecciones/${eleccionId}/actores`, data),
  updateActor: (id: string, data: any) => api.patch(`/inteligencia-electoral/actores/${id}`, data),
  deleteActor: (id: string) => api.delete(`/inteligencia-electoral/actores/${id}`),

  // Plantilla y carga
  descargarPlantilla: (eleccionId: string) =>
    api.get(`/inteligencia-electoral/elecciones/${eleccionId}/plantilla`, { responseType: 'blob' }),
  cargarExcel: (eleccionId: string, formData: FormData) =>
    api.post(`/inteligencia-electoral/elecciones/${eleccionId}/cargar-excel`, formData),

  // Análisis
  getSecciones: (eleccionId: string) => api.get(`/inteligencia-electoral/elecciones/${eleccionId}/secciones`),
  analizarSeccion: (eleccionId: string, seccion: string) =>
    api.post(`/inteligencia-electoral/elecciones/${eleccionId}/analizar-seccion/${seccion}`),
};

// === API de Fichas Seccionales ===
export const fichasApi = {
  getSecciones: () => api.get('/fichas-seccionales/secciones'),
  getFicha: (seccion: string) => api.get(`/fichas-seccionales/${seccion}`),
  getComparativa: (secciones: string[]) => api.post('/fichas-seccionales/comparativa', { secciones }),
};

// === API de Mapa Territorial ===
export const mapaApi = {
  getCapas: () => api.get('/mapas/capas'),
  getGeoJson: (capas: string[], params?: any) =>
    api.get('/mapas/geojson', { params: { capas: capas.join(','), ...params } }),
  getEstadisticas: (nivel: 'seccion' | 'zona' = 'seccion') =>
    api.get('/mapas/estadisticas', { params: { nivel } }),
  createCapa: (data: any) => api.post('/mapas/capas', data),
  updateCapa: (id: string, data: any) => api.patch(`/mapas/capas/${id}`, data),
  deleteCapa: (id: string) => api.delete(`/mapas/capas/${id}`),
  subirCapa: (formData: FormData) => api.post('/mapas/subir', formData),
  getSeccionesINE: (estado_id?: string | number, municipio_id?: string | number) => api.get('/mapas/secciones-ine', { params: { estado_id, municipio_id } }),
  importarSeccionesINE: (formData: FormData) => api.post('/mapas/secciones-ine/importar', formData),
  importarSeccionesExcel: (formData: FormData) => api.post('/mapas/secciones/importar-excel', formData),
  buscarGlobal: (q: string, limit = 15, tipo?: string) =>
    api.get('/mapas/buscar-global', { params: { q, limit, tipo } }),
  detalleTerritorial: (data: { tipo: string; id: string; nombre: string; geometry: any; estado_id?: number; municipio_id?: number; seccion?: string; clave?: string }) =>
    api.post('/mapas/buscar-global/detalle', data),
};
