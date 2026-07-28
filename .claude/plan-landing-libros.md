# Plan: Sección de venta de libros en `/nosotros`

## Contexto
El usuario quiere un apartado especial para vender dos libros:
1. **Guerra de Mensajes** (libro de Gabriel Ibarra) — **de pago**
   - PDF: $300 MXN
   - Impreso: $550 MXN
2. **El Arte de la Guerra** (Sun Tzu) — **gratuito** — PDF de descarga libre

## Diagnóstico
- Ya existe `/images/guerra-mensajes.png` como portada del libro de Gabriel.
- No hay portada de Sun Tzu, ni PDFs subidos en `public/libros/`.
- No hay pasarela de pagos implementada en el frontend (Stripe, Mercado Pago, PayPal, etc.).

## Opciones para la venta

### Opción A — Botón de pago con Stripe/PayPal (externo)
- Requiere abrir cuenta y crear producto/precio en el dashboard del proveedor.
- Link directo al checkout.
- **Ventaja**: cobro inmediato, seguro.
- **Desventaja**: requiere configurar el proveedor fuera del código.

### Opción B — Botón de WhatsApp / correo con mensaje predefinido
- "Quiero comprar Guerra de Mensajes PDF / impreso".
- El usuario concreta pago por transferencia u otro medio manual.
- **Ventaja**: rápido de implementar, no depende de pasarela.
- **Desventaja**: no es automatizado.

### Opción C — Página de checkout manual con formulario
- Formulario de compra que envía lead a backend o email.
- **No recomendada**: agrega complejidad sin pasarela.

## Recomendación
**Opción A + B combinadas**: 
- Mostrar precios claros.
- Botón primario de compra con pasarela (placeholder de link externo, configurable).
- Botón secundario de WhatsApp para venta manual inmediata.
- Separar claramente el libro gratuito de Sun Tzu con su botón de descarga directa.

## Estructura propuesta de la sección

### Bloque 1: Libro de pago — Guerra de Mensajes
- Portada del libro (imagen existente).
- Título: *Guerra de Mensajes* — Gabriel Ibarra.
- Frase de venta corta.
- Precios:
  - PDF digital: **$300 MXN**
  - Ejemplar impreso: **$550 MXN**
- Botones:
  - "Comprar PDF $300" → link de pago externo.
  - "Comprar impreso $550" → link de pago externo o WhatsApp.
  - "Preguntar por WhatsApp" → `https://wa.me/...`.

### Bloque 2: Libro gratuito — El Arte de la Guerra
- Portada placeholder (SVG o icono hasta que suban imagen).
- Título: *El Arte de la Guerra* — Sun Tzu.
- Texto: “Versión gratuita para descargar”.
- Botón: "Descargar PDF gratis" → `/libros/arte-de-la-guerra.pdf`.

## Archivos a modificar
- `src/app/nosotros/page.tsx` — reemplazar la sección actual del libro por esta sección de libros dual.
- Crear `public/libros/arte-de-la-guerra.pdf` cuando esté disponible.
- Opcional: subir `public/libros/guerra-de-mensajes.pdf` si se decide entrega automática post-pago.

## Notas
- Los links de pago (Stripe/Mercado Pago/PayPal) deben ser configurados por el usuario. Dejaremos comentarios o variables al inicio del componente para que sean fáciles de cambiar.
- El PDF de Sun Tzu debe ser libre de derechos o con licencia permitida. Verificar antes de publicar.

## Pregunta al usuario
- ¿Qué pasarela de pagos prefieres (Stripe, Mercado Pago, PayPal, otro)?
- ¿Tienes el PDF de Sun Tzu listo?
- ¿Tienes un número de WhatsApp específico para recibir pedidos del libro?
