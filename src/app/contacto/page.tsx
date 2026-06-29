'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function ContactoPage() {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Tu mensaje fue enviado. Te contactaremos pronto.');
        setForm({ nombre: '', email: '', telefono: '', asunto: '', mensaje: '' });
      } else {
        setStatus('error');
        setMessage(data.error || 'No se pudo enviar el mensaje.');
      }
    } catch {
      setStatus('error');
      setMessage('Error de conexión. Intenta de nuevo.');
    }
  };

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
            <Link href="/#soluciones" className="transition hover:text-white">Soluciones</Link>
            <Link href="/nosotros" className="transition hover:text-white">Nosotros</Link>
            <Link href="/contacto" className="text-white transition">Contacto</Link>
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
            Estamos para ayudarte
          </p>
          <h1 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            HABLEMOS DE TU CAMPAÑA
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60 lg:text-lg">
            Cuéntanos qué necesitas. Nuestro equipo te responderá para agendar una demo
            o resolver tus dudas.
          </p>
        </div>
      </section>

      {/* Formulario */}
      <section className="relative z-10 px-6 pb-20 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px]">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 lg:p-10"
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="nombre" className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                  Nombre
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  required
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre completo"
                  className="w-full rounded-xl border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#d73216] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-xl border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#d73216] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="telefono" className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                  Teléfono
                </label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="(opcional)"
                  className="w-full rounded-xl border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#d73216] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="asunto" className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                  Asunto
                </label>
                <select
                  id="asunto"
                  name="asunto"
                  required
                  value={form.asunto}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white focus:border-[#d73216] focus:outline-none"
                >
                  <option value="" disabled>Selecciona un asunto</option>
                  <option value="Solicitar demo">Solicitar demo</option>
                  <option value="Información de precios">Información de precios</option>
                  <option value="Soy consultor / agencia">Soy consultor / agencia</option>
                  <option value="Soporte">Soporte</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label htmlFor="mensaje" className="text-xs font-bold uppercase tracking-[0.15em] text-white/50">
                Mensaje
              </label>
              <textarea
                id="mensaje"
                name="mensaje"
                required
                rows={6}
                value={form.mensaje}
                onChange={handleChange}
                placeholder="¿En qué podemos ayudarte?"
                className="w-full resize-none rounded-xl border border-white/10 bg-[#0f1015] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#d73216] focus:outline-none"
              />
            </div>

            {status !== 'idle' && (
              <div
                className={`mt-6 rounded-xl px-4 py-3 text-sm font-medium ${
                  status === 'success'
                    ? 'bg-green-500/10 text-green-400'
                    : status === 'error'
                    ? 'bg-[#d73216]/10 text-[#ff6b52]'
                    : 'bg-white/5 text-white/60'
                }`}
              >
                {status === 'loading' ? 'Enviando mensaje...' : message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d73216] px-8 py-3.5 text-sm font-bold text-white transition hover:bg-[#b82412] disabled:opacity-60 sm:w-auto"
            >
              {status === 'loading' ? 'Enviando...' : 'Enviar mensaje'}
            </button>
          </form>

          {/* Info */}
          <aside className="flex flex-col gap-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-bold text-white">¿Por qué contactarnos?</h3>
              <ul className="mt-4 space-y-3 text-sm text-white/60">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d73216]" />
                  Agenda una demo personalizada de ESTRATO.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d73216]" />
                  Recibe información sobre planes y precios.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d73216]" />
                  Conoce cómo implementamos CRM, mapa territorial, brigadas e IA.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="text-lg font-bold text-white">Correo directo</h3>
              <p className="mt-2 text-sm text-white/60">
                También puedes escribirnos directamente a:
              </p>
              <a
                href="mailto:gabostudio@gmail.com"
                className="mt-3 inline-block text-sm font-semibold text-[#d73216] transition hover:text-white"
              >
                gabostudio@gmail.com
              </a>
            </div>

            <Link
              href="/landing/demo-prueba-1781944606058"
              className="rounded-2xl bg-gradient-to-r from-[#d73216] to-[#b82412] p-6 text-center transition hover:opacity-90"
            >
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-white/80">
                Prefieres ver la plataforma
              </p>
              <p className="mt-1 text-lg font-bold text-white">Solicitar demo ahora</p>
            </Link>
          </aside>
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
