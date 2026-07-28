# Plan: Wizard universal de sábanas electorales

## Objetivo
Hacer que el wizard de **Histórico Electoral** soporte cualquier formato de sábana oficial (IEEG, PREP, IEES, INE, etc.) con la menor fricción posible. El sistema debe detectar automáticamente la estructura, pero también dar herramientas manuales claras cuando la detección falle.

## Alcance de esta fase (no reescribe todo)
- **Entrada**: archivos `.csv` (la sábana actual del usuario).
- **Foco**: robustecer detección de encabezado, mapeo de columnas, detección de actores/partidos, filtro de municipio y feedback de validación.
- **Fuera de alcance por ahora**: subida de `.xlsx`, múltiples hojas, sábanas sin encabezado, o formatos no tabulares. Se deja documentado como fase 2.

## Problemas actuales a resolver
1. Fila de encabezado a veces no se detecta bien (metadatos, líneas en blanco, resumen arriba).
2. La columna de filtro de municipio se asume `UBICACION`, pero en distritos la ubicación es el distrito, no el municipio.
3. Los actores se detectan con un set fijo de partidos; coaliciones raras o nombres locales no se detectan.
4. No hay feedback claro cuando 0 filas pasan la validación.
5. El usuario no puede ver el archivo crudo para entender qué está pasando.
6. No se descartan filas de resumen/totales que aparecen después del encabezado.

## Cambios en backend (`estrato-backend`)

### 1. Nuevo endpoint `preview-raw`
Devuelve las primeras 30 líneas del archivo tal cual, con su número de línea original. Permite que el frontend muestre una tabla de exploración.

### 2. Mejorar `detectarFilaEncabezado`
- Además de palabras clave, usar heurísticas:
  - Línea con la mayor cantidad de columnas no vacías.
  - Línea que contenga al menos 2 campos clave (`SECCION`, `CASILLA`, `ID_CASILLA`, `TIPO_CASILLA`, `LISTA_NOMINAL`).
  - No elegir líneas que parezcan fila de totales (columnas con textos como `TOTAL`, `ACTAS_ESPERADAS`).
- Si no hay confianza, devolver `null` y dejar que el usuario elija.

### 3. Normalización de nombres de columnas
Crear un mapa de aliases para campos de control:
- Sección: `SECCION`, `SECCIÓN`, `SECC`, `NO_SECCION`.
- Casilla: `ID_CASILLA`, `CASILLA`, `NO_CASILLA`, `IDCASILLA`.
- Tipo: `TIPO_CASILLA`, `TIPO`, `TIPO_CAS`.
- Extensión: `EXT_CONTIGUA`, `EXTCONTIGUA`, `CONTIGUA`.
- Lista nominal: `LISTA_NOMINAL`, `LISTA_NOMINAL_CASILLA`, `LN`, `LN_CASILLA`.
- Nulos: `NUM_VOTOS_NULOS`, `VOTOS_NULOS`, `NULOS`.
- No registrados: `NUM_VOTOS_CAN_NREG`, `NUM_VOTOS_NO_REGISTRADOS`, `VOTOS_NO_REGISTRADOS`, `NOREG`.
- Válidos: `NUM_VOTOS_VALIDOS`, `VOTOS_VALIDOS`.
- Total: `TOTAL_VOTOS`.
- Participación: `PARTICIPACION_CONTABILIZADA`, `PARTICIPACION`, `PORC_PARTICIPACION`, `P_PARTICIPACION`.
- Filtro municipio: `MUNICIPIO`, `NOMBRE_MUNICIPIO`, `MUN`, `UBICACION` (con menor prioridad).

### 4. Detección flexible de actores
- No depender de un set fijo de partidos.
- Detectar columnas candidatas que:
  - Sean numéricas en las primeras filas de datos.
  - No estén en el mapa de aliases de campos de sistema.
  - No tengan prefijo `P_` o `P.` (que suelen ser porcentajes).
- Para cada candidato, separar partido individual vs coalición:
  - Si el nombre contiene `_` o `-` y múltiples partidos conocidos, marcar como coalición.
  - Si no, individual por defecto.
- Permitir mapear columnas de porcentaje como informativas, no como actores de votos.
- En preview, devolver la lista de actores sugeridos con una muestra de valores.

### 5. Filtro de municipio inteligente
- Si la columna elegida no contiene el texto de filtro en ninguna fila, devolver un warning con los valores únicos encontrados.
- Permitir múltiples textos de filtro separados por coma.
- Hacer `includes` insensible a mayúsculas, acentos y espacios extra.

### 6. Descartar filas inválidas (resumen/totales)
Durante `procesarFila`, si una fila no tiene sección o casilla después de formatear, omitirla silenciosamente (no contar como error ni como válida), a menos que el usuario haya mapeado esos campos. Evita que filas de totales contaminen.

### 7. Mejores mensajes de error
Devolver en el preview:
- Primeras 10 filas con error detallado: `Fila X, columna Y: "Z" no es un número válido`.
- Warning si hay actores mapeados pero ninguno tiene votos > 0.

## Cambios en frontend (`estrato-frontend`)

### 1. Nuevo paso: "Explorar archivo" (entre Archivo y Metadatos, o integrado en Encabezado)
Mostrar tabla con:
- Número de línea original.
- Contenido de las primeras columnas truncado.
- Botón "Usar esta línea como encabezado" por fila.
- Indicador de cuál línea se detectó automáticamente.

### 2. Rediseñar paso "Encabezado"
- Mostrar la tabla de exploración.
- Input de fila del encabezado con validación visual.
- Botón "Detectar automáticamente".
- Mostrar cantidad de columnas detectadas.

### 3. Mejorar paso "Mapeo"
- Dividir en 3 tarjetas: **Campos de control**, **Filtro de municipio**, **Actores**.
- **Campos de control**: dropdowns con búsqueda, mostrando preview del primer valor no vacío de cada columna. Marcar los campos ya usados por actores.
- **Filtro de municipio**: al elegir columna, mostrar los 10 valores únicos más frecuentes. Input de filtro con chips o texto libre. Botón "Probar filtro" para ver cuántas filas coinciden.
- **Actores**: lista de columnas candidatas con checkbox; al marcar, permitir editar nombre y elegir tipo (individual/coalición). Detectar automáticamente si parece coalición.

### 4. Validación en tiempo real
- Al cambiar cualquier mapeo, ofrecer un botón "Vista previa rápida" que llame al endpoint preview y actualice conteos sin cambiar de paso.
- Mostrar alerta inmediata si 0 filas válidas.

### 5. Mejorar paso "Validación"
- Mantener los 5 contadores: Filas leídas, Válidas, Omitidas por filtro, Errores, Actores con votos.
- Tabla de preview con columna del filtro de municipio visible.
- Resumen de errores plegable con detalles.

### 6. Estado del wizard persistente
- Guardar en `sessionStorage` el progreso del wizard (metadatos, mapeo, actores) para que no se pierda al recargar.

## Orden de implementación
1. Backend: endpoint `preview-raw` y normalización de aliases.
2. Backend: mejorar `detectarFilaEncabezado` y descarte de filas inválidas.
3. Backend: detección flexible de actores.
4. Backend: filtro de municipio inteligente y mejores errores.
5. Frontend: nuevo paso de exploración de archivo y rediseño de encabezado.
6. Frontend: rediseño del paso de mapeo (campos de control, filtro, actores).
7. Frontend: validación en tiempo real y persistencia en sessionStorage.
8. Testing con CSVs reales: ayuntamiento GTO 2024, diputado local GTO 2024, y otros si están disponibles.

## Decisiones pendientes (para el usuario)
1. **¿Soporte de `.xlsx` en esta fase?** Agregarlo requiere librería (`xlsx` o `sheetjs`). Propuesta: dejarlo para una fase 2 y enfocarse en CSV ahora.
2. **¿Detectar automáticamente el municipio por ID numérico?** Algunos CSVs usan `ID_MUNICIPIO = 14` en lugar del nombre. Actualmente el filtro solo hace `includes` de texto. Se puede agregar opción de filtro por ID, pero complica la UI. Propuesta: agregar un segundo campo opcional "ID de municipio" si surge la necesidad.
3. **¿Permitir importar sin filtro de municipio?** Actualmente si se mapea la columna de filtro pero no el texto, no filtra. Se mantendrá así; si no se mapea columna de filtro, se importa todo.

## Riesgos
- **Tamaño de archivo**: leer el archivo completo en memoria puede ser lento si son miles de filas. Mitigación: el preview solo lee las primeras 30 líneas para exploración; el procesamiento real ya itera de a una.
- **Complejidad de UI**: más opciones pueden confundir. Mitigación: mantener valores por defecto inteligentes y mostrar opciones avanzadas colapsadas.
- **Falsos positivos en actores**: columnas que no son partidos pueden detectarse como actores. Mitigación: el usuario puede desmarcarlas; no se guarda nada hasta que confirme.

## Criterios de aceptación
- El CSV de ayuntamiento GTO 2024 sigue importándose sin errores.
- El CSV de diputado local GTO 2024 se importa con el filtro `MUNICIPIO` + `DOLORES HIDALGO`.
- Un CSV con estructura diferente (otro estado u otro año) puede ser mapeado manualmente en menos de 3 minutos.
- Si 0 filas pasan la validación, el usuario ve claramente por qué en la UI.
