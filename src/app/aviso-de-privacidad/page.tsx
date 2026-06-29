import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Mail, Shield } from 'lucide-react';

export const metadata = {
  title: 'Aviso de Privacidad - ESTRATO',
  description:
    'Aviso de Privacidad de ESTRATO. Conoce cómo protegemos tus datos personales de acuerdo con la LFPDPPP.',
};

export default function AvisoPrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#16171e]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#16171e]/95 px-6 py-4 backdrop-blur-md lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/estratobcl.svg"
              alt="ESTRATO"
              width={140}
              height={60}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={18} />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <section className="px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d73216]/15 text-[#d73216]">
              <Shield size={32} />
            </div>
            <h1 className="text-3xl font-black text-white lg:text-5xl">
              Aviso de Privacidad
            </h1>
            <p className="mt-3 text-white/60">
              Última actualización: 20 de junio de 2026
            </p>
          </div>

          <div className="space-y-10 rounded-3xl border border-white/10 bg-[#1a1b24] p-8 md:p-12">
            <article>
              <h2 className="text-xl font-bold text-white">
                1. Responsable del tratamiento de datos personales
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                <strong className="text-white">ESTRATO LAT S.A.S. de C.V.</strong>, en adelante
                “ESTRATO”, con domicilio en México, es responsable del tratamiento de los datos
                personales que nos proporciones a través de nuestra plataforma web, aplicación
                móvil, formularios físicos o digitales, y cualquier otro medio autorizado.
              </p>
              <p className="mt-3 leading-relaxed text-white/70">
                Para cualquier duda relacionada con este Aviso de Privacidad puedes contactarnos
                en:
              </p>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/5 p-4">
                <Mail className="h-5 w-5 text-[#d73216]" />
                <a
                  href="mailto:contacto@estrato.lat"
                  className="font-medium text-white transition hover:text-[#d73216]"
                >
                  contacto@estrato.lat
                </a>
              </div>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                2. Datos personales que recabamos
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                Para las finalidades descritas en el presente Aviso de Privacidad, podemos recabar
                de manera directa o indirecta los siguientes datos personales:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-white/70">
                <li>Nombre completo</li>
                <li>Dirección de correo electrónico</li>
                <li>Número telefónico (fijo y/o móvil)</li>
                <li>CURP</li>
                <li>Sección electoral</li>
                <li>Dirección o ubicación geográfica (colonia, municipio, estado)</li>
                <li>Coordenadas GPS (cuando autorices el uso de ubicación)</li>
                <li>Fotografías o evidencia de apoyos, eventos o recorridos</li>
                <li>Preferencias políticas, nivel de apoyo e intereses de participación ciudadana</li>
                <li>Datos de uso de la plataforma, logs y metadata de seguridad</li>
              </ul>
              <p className="mt-4 leading-relaxed text-white/70">
                No recabamos datos personales sensibles, conforme a la Ley, sin tu consentimiento
                expreso previo y por escrito.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                3. Finalidades del tratamiento de datos personales
              </h2>
              <p className="mt-3 font-medium text-white">Finalidades primarias:</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-white/70">
                <li>Proveer los servicios de ESTRATO contratados por tu campaña o candidatura.</li>
                <li>Gestionar votantes, simpatizantes, brigadistas, eventos y apoyos.</li>
                <li>Comunicarnos contigo por WhatsApp, correo electrónico, llamadas o mensajes.</li>
                <li>Georreferenciar datos de campo para análisis territorial.</li>
                <li>Generar reportes, bitácoras y evidencias ante el INE u otra autoridad.</li>
                <li>Cumplir con obligaciones legales y regulatorias aplicables.</li>
              </ul>
              <p className="mt-5 font-medium text-white">Finalidades secundarias:</p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-white/70">
                <li>Enviarte comunicaciones sobre nuevos productos, servicios o promociones.</li>
                <li>Realizar encuestas de satisfacción y estudios de mercado.</li>
                <li>Mejorar la plataforma con base en estadísticas de uso anónimas.</li>
              </ul>
              <p className="mt-4 leading-relaxed text-white/70">
                Puedes negarte en cualquier momento al tratamiento de tus datos para finalidades
                secundarias enviando un correo a{' '}
                <a
                  href="mailto:contacto@estrato.lat"
                  className="font-medium text-[#d73216] transition hover:underline"
                >
                  contacto@estrato.lat
                </a>
                .
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                4. Transferencia de datos personales
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                ESTRATO no vende ni alquila tus datos personales. Solo compartimos información en
                los siguientes casos:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-white/70">
                <li>
                  <strong className="text-white">Prestadores de servicios:</strong> empresas de
                  hosting, nube, mensajería (WhatsApp Business API) y soporte técnico, siempre bajo
                  obligaciones de confidencialidad.
                </li>
                <li>
                  <strong className="text-white">Autoridades competentes:</strong> cuando exista
                  un requerimiento legal, orden judicial o obligación regulatoria (INE, INAI,
                  Ministerio Público, entre otros).
                </li>
                <li>
                  <strong className="text-white">Equipo de campaña autorizado:</strong> dentro de
                  la misma cuenta de ESTRATO, según los permisos y roles asignados por el titular de
                  la campaña.
                </li>
              </ul>
              <p className="mt-4 leading-relaxed text-white/70">
                En todos los casos, los terceros solo acceden a los datos estrictamente necesarios
                para cumplir la finalidad autorizada.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                5. Derechos ARCO
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                Tienes derecho a conocer qué datos personales tenemos de ti, para qué los utilizamos
                y las condiciones del uso que les damos. Asimismo, es tu derecho solicitar la
                rectificación de tu información personal en caso de que esté desactualizada, sea
                inexacta o esté incompleta; solicitarnos su cancelación cuando consideres que no
                está siendo utilizada conforme a los principios, deberes y obligaciones previstos
                en la Ley; así como oponerte al uso de tus datos personales para fines específicos.
                Estos derechos se conocen como derechos ARCO.
              </p>
              <p className="mt-4 leading-relaxed text-white/70">
                Para ejercer tus derechos ARCO, envía una solicitud a{' '}
                <a
                  href="mailto:contacto@estrato.lat"
                  className="font-medium text-[#d73216] transition hover:underline"
                >
                  contacto@estrato.lat
                </a>{' '}
                con la siguiente información:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-white/70">
                <li>Nombre completo del titular.</li>
                <li>Correo electrónico o teléfono asociado a tu cuenta.</li>
                <li>Derecho que deseas ejercer (acceso, rectificación, cancelación u oposición).</li>
                <li>Descripción clara de los datos personales objeto de la solicitud.</li>
                <li>Documento que acredite tu identidad (INE, pasaporte o CURP).</li>
              </ul>
              <p className="mt-4 leading-relaxed text-white/70">
                Responderemos tu solicitud en un plazo máximo de 20 días hábiles contados desde la
                recepción de la misma. Si resulta procedente, la haremos efectiva dentro de los 15
                días hábiles siguientes a la emisión de nuestra respuesta.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                6. Revocación del consentimiento
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                En cualquier momento puedes revocar el consentimiento que nos has otorgado para el
                tratamiento de tus datos personales. Sin embargo, es importante que tengas en
                cuenta que no en todos los casos podremos atender tu solicitud o concluir el uso de
                forma inmediata, ya que es posible que por alguna obligación legal requiramos seguir
                tratando tus datos personales.
              </p>
              <p className="mt-3 leading-relaxed text-white/70">
                Para revocar tu consentimiento, envía tu solicitud a{' '}
                <a
                  href="mailto:contacto@estrato.lat"
                  className="font-medium text-[#d73216] transition hover:underline"
                >
                  contacto@estrato.lat
                </a>{' '}
                siguiendo el mismo procedimiento descrito en la sección de Derechos ARCO.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                7. Limitación del uso y divulgación de datos
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                ESTRATO implementa medidas de seguridad administrativas, técnicas y físicas para
                proteger tus datos personales contra daño, pérdida, alteración, destrucción o uso,
                acceso o tratamiento no autorizado.
              </p>
              <p className="mt-3 leading-relaxed text-white/70">
                Además, empleamos:
              </p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-white/70">
                <li>Encriptación de CURP y teléfonos en la base de datos.</li>
                <li>Arquitectura multi-tenant que aísla la información de cada campaña.</li>
                <li>Roles y permisos granulares dentro de cada cuenta.</li>
                <li>Acceso restringido por autenticación JWT y cookies seguras.</li>
                <li>No compartimos datos con servicios de analytics de terceros.</li>
              </ul>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                8. Uso de cookies y tecnologías de seguimiento
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                ESTRATO utiliza cookies y tecnologías similares para mantener tu sesión activa,
                recordar preferencias y mejorar la experiencia de navegación. Puedes configurar tu
                navegador para deshabilitar las cookies; sin embargo, algunas funciones de la
                plataforma podrían no operar correctamente.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                9. Cambios al Aviso de Privacidad
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                ESTRATO se reserva el derecho de modificar este Aviso de Privacidad en cualquier
                momento. Cualquier cambio será publicado en esta misma sección y en el pie de página
                de nuestro sitio web. Te recomendamos revisarlo periódicamente.
              </p>
            </article>

            <article>
              <h2 className="text-xl font-bold text-white">
                10. Consentimiento
              </h2>
              <p className="mt-3 leading-relaxed text-white/70">
                Al utilizar la plataforma ESTRATO, registrar datos de votantes, crear una cuenta o
                proporcionar tus datos personales por cualquier medio, manifiestas que has leído,
                entendido y aceptas los términos de este Aviso de Privacidad.
              </p>
            </article>
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <ArrowLeft size={18} />
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
