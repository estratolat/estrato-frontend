import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const TO_EMAIL = 'gabostudio@gmail.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, email, telefono, asunto, mensaje } = body;

    if (!nombre || !email || !asunto || !mensaje) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios.' },
        { status: 400 }
      );
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !port || !user || !pass) {
      console.warn('[contacto] Faltan variables de entorno SMTP. Mensaje no enviado.');
      return NextResponse.json(
        {
          error:
            'El servidor de correo no está configurado. Contacta al administrador.',
        },
        { status: 503 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"ESTRATO Contacto" <${user}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject: `Nuevo mensaje de ${nombre}: ${asunto}`,
      text: `
Nombre: ${nombre}
Correo: ${email}
Teléfono: ${telefono || 'No proporcionado'}
Asunto: ${asunto}

Mensaje:
${mensaje}
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; color: #111;">
          <h2 style="color: #d73216;">Nuevo mensaje desde estrato.com.mx</h2>
          <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
          <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
          <p><strong>Teléfono:</strong> ${escapeHtml(telefono || 'No proporcionado')}</p>
          <p><strong>Asunto:</strong> ${escapeHtml(asunto)}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
          <p style="white-space: pre-line;">${escapeHtml(mensaje)}</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true, message: 'Mensaje enviado correctamente.' });
  } catch (error) {
    console.error('[contacto] Error enviando mensaje:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al enviar el mensaje. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
