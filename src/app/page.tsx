import Link from 'next/link';
import Image from 'next/image';
import {
  Users,
  MessageSquare,
  Map,
  Smartphone,
  ClipboardList,
  BarChart3,
  Shield,
  Lock,
  Database,
  ArrowRight,
  Menu,
  Upload,
  UserPlus,
  MapPin,
  Target,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#16171e]">
      {/* Navbar */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-[#16171e]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-12">
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

          <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
            <Link href="#funciones" className="transition hover:text-white">
              Funciones
            </Link>
            <Link href="/nosotros" className="transition hover:text-white">
              Nosotros
            </Link>
            <Link href="/contacto" className="transition hover:text-white">
              Contacto
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-lg border border-white/20 px-5 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/landing/demo-prueba-1781944606058"
              className="rounded-lg bg-[#d73216] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#b82412]"
            >
              Solicitar Demo
            </Link>
          </div>

          <button className="text-white md:hidden" aria-label="Menú">
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section id="producto" className="relative flex min-h-screen flex-col overflow-hidden pt-20">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-batalla.jpg"
            alt="Estrategia política digital"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#16171e]/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#16171e]/80 via-transparent to-[#16171e]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#16171e] via-transparent to-[#16171e]/30" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 py-16 lg:flex-row lg:px-12">
          <div className="max-w-2xl lg:pr-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#d73216]" />
              Plataforma para campañas políticas en México
            </div>
            <h1 className="text-4xl font-black leading-tight text-white md:text-5xl lg:text-6xl">
              ESTRATO: el cuartel digital de tu campaña
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-white/70 lg:text-xl">
              Centraliza votantes, coordina brigadas, controla tu territorio y toma decisiones con
              datos. Todo en un solo panel: mapa territorial, histórico electoral, CRM y app de campo.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row">
              <Link
                href="/landing/demo-prueba-1781944606058"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#d73216] px-8 py-4 text-sm font-bold text-white shadow-lg shadow-[#d73216]/25 transition hover:bg-[#b82412] lg:text-base"
              >
                Solicitar Demo
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/10 lg:text-base"
              >
                Entrar al Panel
              </Link>
            </div>
          </div>

          <div className="mt-12 w-full max-w-xl lg:mt-0">
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* Módulos reales */}
      <section id="funciones" className="relative overflow-hidden border-t border-white/10 px-6 py-24 lg:px-12">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div
            className="absolute -left-1/4 -top-1/4 h-[60vw] w-[60vw] animate-pulse rounded-full bg-[#d73216]/10 blur-[120px]"
            style={{ animationDuration: '8s' }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d73216]">
              Funciones
            </p>
            <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
              Lo que ESTRATO hace hoy
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-white/60 lg:text-lg">
              No prometemos features que no existen. Estos son los módulos que ya usan las campañas
              dentro de la plataforma.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="Mapa Territorial"
              subtitle="Territorio en vivo"
              description="Visualiza secciones INE, colonias, apoyos, casillas y KMLs propios. Sabe dónde mover brigadas y dónde ganar."
              icon={<Map size={32} />}
            />
            <FeatureCard
              title="Inteligencia Electoral"
              subtitle="Datos que deciden"
              description="Histórico electoral cruzado por sección, ficha seccional, proyección de votos y monitoreo de resultados."
              icon={<BarChart3 size={32} />}
            />
            <FeatureCard
              title="Operación de Campo"
              subtitle="Brigada digital"
              description="App de brigada, votantes, líderes, apoyos, casillas y eventos. Captura con GPS y foto, sincroniza en tiempo real."
              icon={<Smartphone size={32} />}
            />
            <FeatureCard
              title="CRM y Comunicación"
              subtitle="Canales unificados"
              description="Mensajes y WhatsApp centralizados por votante, encuestas y boletines para mantener contacto con tu base."
              icon={<MessageSquare size={32} />}
            />
            <FeatureCard
              title="Cumplimiento INE"
              subtitle="Control y reportes"
              description="Bitácora de apoyos, informes INE, monitoreo y aviso de privacidad. Reduce riesgos de fiscalización."
              icon={<ClipboardList size={32} />}
            />
            <FeatureCard
              title="Control Centralizado"
              subtitle="Admin de campaña"
              description="Dashboard general, perfil del candidato, usuarios con permisos y admin multi-campaña. Cada equipo ve lo suyo."
              icon={<Users size={32} />}
            />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="border-t border-white/10 bg-[#0d0e13] px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d73216]">
              Implementación
            </p>
            <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
              Activa tu cuartel en 48 horas
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <StepCard
              step="01"
              icon={<Upload size={28} />}
              title="Importa tu padrón"
              description="Sube tu base de votantes. ESTRATO la georreferencia y la organiza en secciones y colonias."
            />
            <StepCard
              step="02"
              icon={<UserPlus size={28} />}
              title="Asigna territorio y equipo"
              description="Define zonas, coordina brigadistas con la app de campo y asigna permisos a cada rol."
            />
            <StepCard
              step="03"
              icon={<Target size={28} />}
              title="Mide y ajusta"
              description="Usa el mapa, el histórico electoral y la proyección para mover recursos donde realmente suman."
            />
          </div>
        </div>
      </section>

      {/* Seguridad */}
      <section className="border-t border-white/10 px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d73216]">
              Seguridad
            </p>
            <h2 className="mt-3 text-3xl font-black text-white lg:text-5xl">
              Tus datos aislados por campaña
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <SecurityCard
              icon={<Database size={28} />}
              title="Multi-tenant"
              description="Cada campaña opera en su propio espacio. Los datos nunca se mezclan entre clientes."
            />
            <SecurityCard
              icon={<Lock size={28} />}
              title="Permisos por rol"
              description="Controla qué ve cada usuario: brigadista, coordinador, administrador o superadmin."
            />
            <SecurityCard
              icon={<Shield size={28} />}
              title="LFPDPPP"
              description="Aviso de privacidad visible y gestión responsable de datos personales de votantes."
            />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section id="contacto" className="relative z-10 bg-gradient-to-r from-[#d73216] to-[#b82412] px-6 py-20 text-center lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black text-white lg:text-5xl">
            ¿Listo para dejar de improvisar?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/80 lg:text-lg">
            Únete a las campañas que usan ESTRATO para organizar su territorio, comunicarse y
            medir resultados.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/landing/demo-prueba-1781944606058"
              className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-3.5 text-sm font-bold text-[#d73216] transition hover:bg-white/90 lg:px-10 lg:py-4 lg:text-base"
            >
              Agenda Demo de 15 min
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white px-8 py-3.5 text-sm font-bold text-white transition hover:bg-white/10 lg:px-10 lg:py-4 lg:text-base"
            >
              Crear mi Cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#1a1b24] px-6 py-12 lg:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
          <Image src="/estratobcl.svg" alt="ESTRATO" width={120} height={50} className="h-8 w-auto" />
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/50">
            <Link href="/nosotros" className="transition hover:text-white">
              Nosotros
            </Link>
            <Link href="/contacto" className="transition hover:text-white">
              Contacto
            </Link>
            <Link href="/aviso-de-privacidad" className="transition hover:text-white">
              Aviso de Privacidad
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Iniciar sesión
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-center text-xs text-white/30">
          © 2026 ESTRATO. Todos los derechos reservados.
        </p>
      </footer>
    </main>
  );
}

function DashboardMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0e13] shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#1a1b24] px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-[#d73216]" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
        <div className="ml-4 h-4 flex-1 rounded bg-white/5" />
      </div>

      <div className="grid grid-cols-12 gap-4 p-4">
        <div className="col-span-3 hidden space-y-3 rounded-xl bg-[#1a1b24] p-3 sm:block">
          {['Dashboard', 'Votantes', 'Mapa', 'CRM', 'Eventos'].map((item) => (
            <div key={item} className="h-8 rounded-lg bg-white/5 px-3 text-xs text-white/40 flex items-center">
              {item}
            </div>
          ))}
        </div>

        <div className="col-span-12 space-y-4 sm:col-span-9">
          <div className="grid grid-cols-3 gap-3">
            {[45, 12, 8600].map((n, i) => (
              <div key={i} className="rounded-xl bg-[#1a1b24] p-3">
                <div className="text-lg font-bold text-white">{n.toLocaleString()}</div>
                <div className="h-2 w-16 rounded bg-white/10" />
              </div>
            ))}
          </div>

          <div className="relative h-40 overflow-hidden rounded-xl bg-[#1a1b24]">
            <div className="absolute inset-0 opacity-30">
              <div className="absolute left-1/4 top-1/3 h-20 w-20 rounded-full bg-[#d73216]/30 blur-xl" />
              <div className="absolute right-1/3 top-1/2 h-16 w-16 rounded-full bg-[#d73216]/20 blur-xl" />
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg bg-[#16171e]/80 px-3 py-1 text-xs text-white/70 flex items-center gap-1">
              <MapPin size={12} />
              Mapa Territorial
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-[#1a1b24] p-3">
            <div className="h-3 w-24 rounded bg-white/10" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 p-2">
                <div className="h-8 w-8 rounded-full bg-[#d73216]/20" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-white/10" />
                  <div className="h-2 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  subtitle,
  description,
  icon,
}: {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-8 transition hover:border-[#d73216]/30 hover:bg-white/[0.04]">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#d73216]/10 blur-3xl opacity-0 transition duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d73216]/15 text-[#d73216] transition group-hover:bg-[#d73216] group-hover:text-white">
          {icon}
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-wider text-[#d73216]">{subtitle}</p>
        <h3 className="mt-1 text-xl font-bold text-white">{title}</h3>
        <p className="mt-3 leading-relaxed text-white/55">{description}</p>
      </div>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-[#16171e] p-8">
      <div className="text-5xl font-black text-white/10">{step}</div>
      <div className="mb-5 mt-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d73216]/15 text-[#d73216]">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-3 leading-relaxed text-white/55">{description}</p>
    </div>
  );
}

function SecurityCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#16171e] p-6 text-center transition hover:border-[#d73216]/30">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d73216]/15 text-[#d73216]">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{description}</p>
    </div>
  );
}
