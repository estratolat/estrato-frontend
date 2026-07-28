# Plan: Simplificar landing de ESTRATO (`src/app/page.tsx`)

## Diagnóstico
La landing actual (`src/app/page.tsx`) es extensa, repite CTAs y mezcla:
- **Funcionalidades reales ya operativas**: CRM, Mapa Territorial, App Brigada, Casillas, Votantes, Eventos, Encuestas, Histórico Electoral, Ficha Seccional, Proyección, Monitoreo, Informes INE, Boletines, Admin multi-tenant.
- **Funcionalidades inventadas o exageradas**: "Llamadas con voz clonada 24/7", "Boletines IA genera posts y diseños", números sociales inventados ("+40 campañas", "200k+ votantes", "98% uptime"), "Docs API", "Blog", "Casos de éxito", "Precios".
- **Secciones redundantes**: dos CTAs de demo, prueba social sin base real, modo veda electoral sin confirmarse que esté automatizado en la plataforma.
- **Componente huérfano**: `src/components/landing/HeroEstrato.tsx` no se usa en ninguna ruta.

## Objetivo
Reemplazar la landing por una página de entrada más corta, honesta y alineada a lo que hoy hace ESTRATO, manteniendo el tono político/campaña y el diseño oscuro con acento `#d73216`.

## Estructura propuesta (6 secciones, no 10)

1. **Navbar simplificado**
   - Logo, links: Funciones, Nosotros, Contacto.
   - CTAs: "Iniciar sesión" y "Solicitar Demo".
   - Eliminar "Precios", "Casos de éxito" y menú hamburguesa vacío.

2. **Hero directo**
   - Título: "ESTRATO: el cuartel digital de tu campaña".
   - Subtítulo enfocado a organizar territorio, votantes y brigadas en tiempo real.
   - CTAs: "Solicitar Demo" y "Entrar al Panel".
   - Mantener el mockup del dashboard como visual.

3. **Módulos reales (grid de 6 tarjetas)**
   - **Territorio**: Mapa con secciones INE, KMLs, calor y búsqueda por polígono.
   - **Inteligencia electoral**: Histórico Electoral cruzado, Ficha Seccional, Proyección, Informes INE.
   - **Operación de campo**: App Brigada, Votantes, Líderes, Apoyos, Casillas, Eventos.
   - **Comunicación**: CRM con WhatsApp/mensajes, Encuestas, Boletines.
   - **Cumplimiento**: Monitoreo, Aviso de privacidad, multi-tenant por campaña.
   - **Control centralizado**: Dashboard, candidato, usuarios/permisos, admin de tenant.

4. **Cómo funciona (3 pasos)**
   - "Importa tu padrón" → georreferencia.
   - "Asigna territorio y equipo" → zonas y app brigada.
   - "Mide y ajusta" → mapa + histórico + proyección.

5. **Seguridad / confianza**
   - Reducir a 3 tarjetas: Multi-tenant aislado, control de accesos/permisos, aviso de privacidad LFPDPPP.
   - Quitar afirmaciones técnicas no verificables ("encriptación desde el origen", "analytics propio").

6. **Footer mínimo**
   - Logo.
   - Links reales: Nosotros, Contacto, Aviso de Privacidad, Login.
   - Quitar "Docs API", "Blog", "Precios".
   - Copyright.

## Archivos a modificar
- `src/app/page.tsx` — reescritura completa de la landing.
- `src/app/layout.tsx` — ajustar metadata si es necesario.
- Opcionalmente eliminar `src/components/landing/HeroEstrato.tsx` (huérfano).

## Criterios de éxito
- Build de Next.js pasa sin errores.
- Ninguna landing promete funcionalidades que no existan en el dashboard.
- Longitud del archivo se reduce aproximadamente a la mitad.
- Todos los links apuntan a rutas existentes.

## Pendiente de decisión del usuario
- ¿Se elimina definitivamente `HeroEstrato.tsx`? Está sin uso y contiene la misma imagen `/images/guerra-mensajes.png` que ya no aparece en `page.tsx`.
- ¿Se conserva la sección "Modo veda electoral"? En el dashboard no hay evidencia clara de bloqueo automático en veda; se propone quitarla por ahora.
