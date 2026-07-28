# Plan: Reorganización de vistas del Histórico Electoral

## Objetivo
Transformar el módulo **Histórico Electoral** de una lista/tabla plana en una experiencia de tablero de numeralia con navegación a detalle, y garantizar que esos datos sean consumibles por **Inteligencia Electoral**.

## Estado actual
- `src/app/dashboard/historico-electoral/page.tsx` tiene dos tabs: `listado` y `wizard`.
- El `listado` muestra todo junto: resumen agrupado, filtros y tabla detalle de casillas (mucha densidad, poco contexto).
- Ya existen endpoints: `getAll`, `getResumen`, importar y eliminar.
- Los datos ya se alimentan al consultor IA de Inteligencia Electoral (`obtenerHistorico` en `inteligencia-electoral.service.ts`), pero sin estructura de resumen por sección/histórico.

## Propuesta de navegación
Tres vistas dentro del mismo page, con `dashboard` como default:

1. **Dashboard** (nuevo, pantalla principal)
2. **Históricos** (listado de todos los históricos cargados, más compacto)
3. **Subir histórico** (wizard existente)

## 1. Dashboard de numeralia

### KPIs superior (4 tarjetas)
- Total de históricos cargados
- Total de votos acumulados (todos los históricos)
- Total de secciones distintas
- Total de casillas distintas

### Comparativa entre históricos
- Gráfico de barras verticales/horizontales con los top 5 actores de cada histórico.
- Selector de históricos a comparar (por defecto los últimos 2 cargados).

### Tarjetas de históricos cargados
Cada tarjeta muestra:
- Tipo de histórico + elección + año
- Territorio
- Registros, secciones, casillas
- Total votos
- Ganador (badge de actor con más votos)
- Actor principal (si es histórico principal)
- Botón **"Ver detalle"**
- Botón **"Eliminar"** (con confirmación)

### Filtros del dashboard
- Año
- Tipo de histórico
- Tipo de elección

## 2. Vista de detalle de un histórico

Al hacer clic en "Ver detalle" desde el dashboard o desde la lista, se navega a una vista detalle con:

### Encabezado del histórico
- Tipo, elección, año, territorio
- KPIs: registros, secciones, casillas, lista nominal total, votos totales, participación promedio
- Ganador y actor principal con votos

### Gráficos
- Gráfico de pastel/barras con votos por actor.
- Gráfico de participación por sección (scatter o barras).

### Tabla de casillas
Igual a la tabla detalle actual, pero con paginación/lazy loading y filtros por sección.

### Mapa de secciones (fase 1 básica)
- Si existen polígonos de secciones en el mapa territorial, mostrar mapa con coloración por ganador.
- Si no hay polígonos, mostrar mensaje informativo.

### Acciones
- Botón **"Analizar en Inteligencia Electoral"** que redirige a `/dashboard/inteligencia-electoral` pasando contexto.
- Botón **"Volver al dashboard"**.

## 3. Integración con Inteligencia Electoral

### Backend
Mejorar `obtenerHistorico` en `inteligencia-electoral.service.ts` para que devuelva un resumen por sección y por histórico, no solo filas crudas:
- Agrupar por `tipo_historico`, `tipo_eleccion`, `anio`, `estado_id`, `municipio_id`.
- Para cada grupo, devolver totales por actor, ganador por sección, participación promedio.
- Incluir metadata del histórico (año, tipo, territorio).

Esto permite que el consultor IA responda preguntas como:
- "¿Cómo le fue al PRI en diputado local 2024 vs ayuntamiento 2024?"
- "¿Qué secciones ganó MORENA en la última elección?"

### Frontend
- En la vista detalle del histórico, agregar botón para abrir Inteligencia Electoral con pregunta sugerida.
- En Inteligencia Electoral, asegurar que la fuente "Histórico electoral" funcione con la nueva estructura.

## 4. Listado de históricos (tab "Históricos")

Reemplazar la vista actual por una tabla más ligera:
- Columnas: Histórico, Elección, Año, Territorio, Registros, Secciones, Casillas, Total votos, Ganador, Acciones.
- Acciones: Ver detalle, Eliminar.
- Filtros por año, tipo, elección.

## Archivos a modificar

### Frontend
- `src/app/dashboard/historico-electoral/page.tsx`
  - Reorganizar en sub-vistas: Dashboard, Detalle, Listado, Wizard.
  - Extraer componentes internos a funciones/mini-componentes.
- `src/lib/api.ts`
  - Agregar `getDetalleLote` si es necesario (puede reusar `getAll` con filtros).

### Backend
- `src/resultados-historicos/resultados-historicos.service.ts`
  - `findAll` ya soporta filtros; agregar `resumenPorLote` si se requiere para dashboard.
- `src/inteligencia-electoral/inteligencia-electoral.service.ts`
  - Refactorizar `obtenerHistorico` para devolver resumen agrupado por histórico/sección.

## Fases sugeridas

### Fase 1 (esta sesión): Dashboard + Detalle
- Reorganizar `page.tsx` en Dashboard, Detalle, Listado, Wizard.
- Crear KPIs y tarjetas de históricos.
- Crear vista de detalle con resumen, gráficos y tabla.
- Dejar funcional el wizard actual.

### Fase 2: Gráficos comparativos
- Agregar gráfico de barras comparando actores entre históricos.
- Agregar selector de históricos a comparar.

### Fase 3: Mapa de secciones
- Cruzar históricos con polígonos de secciones del mapa territorial.
- Mostrar mapa coloreado por ganador en la vista de detalle.

### Fase 4: Integración con Inteligencia Electoral
- Mejorar `obtenerHistorico` en backend.
- Agregar botón de análisis en detalle del histórico.

## Preguntas para el usuario
1. ¿Querés empezar con la Fase 1 (dashboard + detalle) ahora mismo?
2. ¿Preferís usar un componente de gráficos externo (recharts) o uno interno simple con CSS?
3. ¿El mapa de secciones en detalle es prioritario o lo dejamos para después?
4. ¿Querés que el actor principal se defina al importar o se pueda elegir/actualizar desde el dashboard?
