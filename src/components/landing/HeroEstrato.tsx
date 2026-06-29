'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HeroEstrato() {
  return (
    <section className="relative flex min-h-[760px] flex-col overflow-hidden bg-[#15161d] lg:min-h-[820px]">
      {/* Foto de hero a pantalla completa */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero-batalla.jpg"
          alt="Estrategia política digital"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#15161d]/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#15161d]/95 via-[#15161d]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#15161d] via-transparent to-[#15161d]/40" />
      </div>

      {/* Navbar profesional */}
      <nav className="relative z-30 border-b border-white/5 px-6 py-4 lg:px-12">
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
            <Link href="#soluciones" className="transition hover:text-white">Soluciones</Link>
            <Link href="/nosotros" className="transition hover:text-white">Nosotros</Link>
            <Link href="/contacto" className="transition hover:text-white">Contacto</Link>
          </div>

          <Link
            href="/login"
            className="rounded-lg bg-[#d73216] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#b82412] lg:px-7 lg:text-sm"
          >
            ACCEDER
          </Link>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center lg:px-12">
        <div className="mx-auto max-w-4xl">
          <Image
            src="/images/guerra-mensajes.png"
            alt="Hablemos de Política Digital y Emociones"
            width={1000}
            height={550}
            className="mx-auto w-full max-w-2xl drop-shadow-2xl lg:max-w-3xl"
            priority
          />

          <p className="mt-8 text-base font-light uppercase tracking-[0.4em] text-white/70 lg:text-lg">
            conecta emociones, construye victoria
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/landing/demo-prueba-1781944606058"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d73216] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#d73216]/25 transition hover:scale-105 hover:bg-[#b82412] lg:px-10 lg:text-base"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              Solicitar Demo
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/10 lg:px-10 lg:text-base"
            >
              Entrar al Panel
            </Link>
          </div>
        </div>

        {/* Cuadrícula de puntos decorativa */}
        <div className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="grid grid-cols-6 gap-3 opacity-70">
            {Array.from({ length: 36 }).map((_, i) => (
              <div key={i} className="h-2 w-2 rounded-full bg-[#d73216]" />
            ))}
          </div>
        </div>
      </div>

      {/* Barra inferior profesional */}
      <div className="relative z-20 border-t border-white/10 bg-[#0d0e13]/95 px-6 py-6 backdrop-blur-sm lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 lg:flex-row">
          <div className="text-center lg:text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d73216]">
              Tecnología para campañas
            </p>
            <p className="mt-1 text-base font-medium text-white/80 lg:text-lg">
              CRM, mapa territorial, brigadas, IA y movilización en una sola plataforma.
            </p>
          </div>

          <Link
            href="/landing/demo-prueba-1781944606058"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d73216] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#b82412]"
          >
            Solicitar Demo
          </Link>
        </div>
      </div>
    </section>
  );
}
