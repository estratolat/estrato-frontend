import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Download } from 'lucide-react';
import TikTokEmbed from '@/components/landing/TikTokEmbed';

const LIBROS = [
  {
    codigo: 'GM-01',
    titulo: 'Guerra de Mensajes',
    autor: 'Gabriel Ibarra Báez',
    tipo: 'pago',
    descripcion:
      'Guía práctica que aplica principios de estrategia militar a la comunicación política moderna. Para candidatos y equipos de campaña que quieren ganar el combate narrativo.',
    portada: '/images/guerra-de-mensajes.jpg',
    opciones: [
      {
        label: 'PDF digital',
        extra: 'Descarga inmediata',
        precio: '$350 MXN',
        cta: 'Comprar PDF',
        href: 'https://www.mercadopago.com.mx/checkout/v1/payment/redirect/64afcb95-6d02-4a53-9352-c954819e50b4/payment-option-form/?source=link&preference-id=1398845935-746a3f7c-2ad5-4609-b56c-a9fc14766239&router-request-id=a35128f5-3754-4770-85f8-3b3004916311&p=752ca108e48c95535a04318159fb1c4d',
        externo: true,
        primario: true,
      },
      {
        label: 'Ejemplar impreso',
        extra: 'Envío cotizado por separado',
        precio: '$550 MXN',
        cta: 'Pedir por WhatsApp',
        href: 'https://wa.me/524182456138?text=Hola%2C%20quiero%20comprar%20Guerra%20de%20Mensajes%20en%20versi%C3%B3n%20impresa%20(%24550%20MXN).%20Me%20interesa%20cotizar%20el%20env%C3%ADo.',
        externo: true,
        primario: false,
      },
    ],
  },
  {
    codigo: 'AG-01',
    titulo: 'El Arte de la Guerra',
    autor: 'Sun Tzu',
    tipo: 'gratis',
    descripcion:
      'El clásico de la estrategia militar que sigue inspirando a líderes, políticos y estrategas de comunicación. Versión gratuita para descargar.',
    portada: '/images/arte-de-la-guerra.jpg',
    opciones: [
      {
        label: 'PDF digital',
        extra: 'Descarga gratuita',
        precio: 'Gratis',
        cta: 'Descargar PDF gratis',
        href: '/libros/arte-de-la-guerra.pdf',
        externo: false,
        primario: true,
      },
    ],
  },
];

const RECOMENDACIONES = [
  {
    id: '7553795381893631240',
    nombre: 'Antonio Sola',
    titulo: 'Creador de Presidentes',
    descripcion:
      'Consultor español. Asesora políticos y gobiernos en los cinco continentes.',
  },
  {
    id: '7553769159851642120',
    nombre: 'Gisela Rubach',
    titulo: 'Estratega política',
    descripcion:
      'Académica y consultora mexicana. Pionera de la mercadotecnia política en América Latina.',
  },
  {
    id: '7650029975650864404',
    nombre: 'Por confirmar',
    titulo: 'Consultor internacional',
    descripcion: 'Próximamente actualizaremos el nombre y perfil de este recomendador.',
  },
  {
    id: '7441056841125104952',
    nombre: 'Por confirmar',
    titulo: 'Consultor internacional',
    descripcion: 'Próximamente actualizaremos el nombre y perfil de este recomendador.',
  },
];

export default function LibrosPage() {
  return (
    <main className="min-h-screen bg-[#16171e]">
      {/* Navbar */}
      <nav className="relative z-30 border-b border-white/5 bg-[#15161d]/80 px-6 py-4 backdrop-blur-sm lg:px-12">
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

          <div className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            <Link href="/#funciones" className="transition hover:text-white">
              Soluciones
            </Link>
            <Link href="/nosotros" className="transition hover:text-white">
              Nosotros
            </Link>
            <Link href="/libros" className="text-white transition">
              Libros
            </Link>
            <Link href="/contacto" className="transition hover:text-white">
              Contacto
            </Link>
          </div>

          <Link
            href="/login"
            className="rounded-lg bg-[#d73216] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#b82412] lg:px-7 lg:text-sm"
          >
            ACCEDER
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-16 text-center lg:px-12 lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-1/4 -top-1/4 h-[60vw] w-[60vw] rounded-full bg-[#d73216]/10 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[50vw] w-[50vw] rounded-full bg-[#d73216]/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d73216]">
            Biblioteca ESTRATO
          </p>
          <h1 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            LIBROS PARA GANAR LA GUERRA DE NARRATIVAS
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60 lg:text-lg">
            Recursos escritos por y para estrategas de campaña. Teoría militar, comunicación política
            y táctica narrativa en formato digital e impreso.
          </p>
        </div>
      </section>

      {/* Libros */}
      <section className="relative z-10 px-6 pb-12 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {LIBROS.map((libro) => (
              <div
                key={libro.codigo}
                className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-[#16171e] p-6 sm:flex-row"
              >
                <div className="mx-auto w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl border border-white/10 sm:mx-0">
                  <Image
                    src={libro.portada}
                    alt={`Portada de ${libro.titulo}`}
                    width={440}
                    height={660}
                    className="w-full object-cover"
                    priority
                  />
                </div>

                <div className="flex flex-1 flex-col text-center sm:text-left">
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.15em] ${
                      libro.tipo === 'gratis' ? 'text-green-500' : 'text-[#d73216]'
                    }`}
                  >
                    {libro.tipo === 'gratis' ? 'Descarga gratuita' : 'Libro de Gabriel Ibarra'}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-white">{libro.titulo}</h2>
                  <p className="mt-1 text-sm font-semibold text-white/70">{libro.autor}</p>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{libro.descripcion}</p>

                  <div className="mt-5 space-y-3">
                    {libro.opciones.map((op) => (
                      <div
                        key={op.label}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3"
                      >
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{op.label}</p>
                          <p className="text-xs text-white/50">{op.extra}</p>
                        </div>
                        <p
                          className={`text-lg font-black ${
                            libro.tipo === 'gratis' ? 'text-green-500' : 'text-[#d73216]'
                          }`}
                        >
                          {op.precio}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex flex-col gap-3">
                    {libro.opciones.map((op) => (
                      <a
                        key={op.label}
                        href={op.href}
                        target={op.externo ? '_blank' : undefined}
                        rel={op.externo ? 'noopener noreferrer' : undefined}
                        download={!op.externo ? true : undefined}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-bold transition ${
                          op.primario
                            ? libro.tipo === 'gratis'
                              ? 'border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-[#d73216] text-white hover:bg-[#b82412]'
                            : 'border border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        {op.primario && libro.tipo === 'pago' ? (
                          <BookOpen size={18} />
                        ) : op.primario ? (
                          <Download size={18} />
                        ) : null}
                        {op.cta}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recomendaciones en video */}
      <section className="relative z-10 border-y border-white/10 bg-[#0d0e13] px-6 py-20 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d73216]">
              Recomendaciones
            </p>
            <h2 className="mt-3 text-3xl font-black text-white lg:text-4xl">
              Consultores de renombre recomiendan el libro
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60">
              Líderes de la consultoría política internacional hablan sobre Guerra de Mensajes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {RECOMENDACIONES.map((rec) => (
              <div
                key={rec.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#16171e]"
              >
                <div className="border-b border-white/10 p-4">
                  <h3 className="text-base font-bold text-white">{rec.nombre}</h3>
                  <p className="text-xs font-semibold text-[#d73216]">{rec.titulo}</p>
                  <p className="mt-1 text-xs leading-snug text-white/50">{rec.descripcion}</p>
                </div>
                <div className="flex-1">
                  <TikTokEmbed videoId={rec.id} />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-white/40">
            Los videos se reproducen directamente aquí. Si falta el nombre de algún recomendador,
            envíanoslo y lo actualizamos.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 bg-gradient-to-r from-[#d73216] to-[#b82412] px-6 py-14 text-center lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-black text-white lg:text-4xl">
            ¿QUIERES QUE TU CAMPAÑA CUENTE CON NOSOTROS?
          </h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/landing/demo-prueba-1781944606058"
              className="inline-flex items-center justify-center rounded-lg bg-white px-7 py-3 text-sm font-bold text-[#d73216] transition hover:bg-white/90 lg:px-9 lg:text-base"
            >
              Solicitar Demo
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-7 py-3 text-sm font-bold text-white transition hover:bg-white/10 lg:px-9 lg:text-base"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#1a1b24] px-6 py-8 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Image
            src="/estratobcl.svg"
            alt="ESTRATO"
            width={120}
            height={50}
            className="h-8 w-auto"
          />
          <p className="text-xs text-white/40">
            © 2026 ESTRATO. Todos los derechos reservados. www.estrato.com.mx
          </p>
        </div>
      </footer>
    </main>
  );
}
