import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { LandingForm } from './LandingForm';
import {
  Shield,
  Droplets,
  Briefcase,
  MapPin,
  Users,
  MessageSquare,
  BarChart3,
  Calendar,
  HeartHandshake,
  ChevronRight,
  Phone,
  Mail,
} from 'lucide-react';

interface LandingPageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

async function getTenantData(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${apiUrl}/tenants/${slug}/landing`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const data = await getTenantData(params.slug);
  if (!data?.tenant) {
    return { title: 'Candidato no encontrado - ESTRATO' };
  }
  return {
    title: `${data.tenant.nombre_candidato} - ${data.tenant.cargo_busca}`,
    description: data.tenant.slogan,
  };
}

export default async function LandingPage({ params, searchParams }: LandingPageProps) {
  const { slug } = params;
  const origen = (searchParams.origen as string | undefined) || '';
  const data = await getTenantData(slug);
  if (!data?.tenant) notFound();

  const tenant = data.tenant;
  const eventos = data.eventos || [];
  const totalSimpatizantes = data.stats?.totalSimpatizantes || 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="bg-secondary-900 py-2 text-center text-xs text-white/80">
        Campaña digital con ESTRATO • {tenant.cargo_busca}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-secondary-100 bg-white/95 backdrop-blur">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/estrato.svg" alt="ESTRATO" width={64} height={28} className="h-8 w-auto" priority />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-secondary-900 leading-tight">{tenant.nombre_candidato}</h1>
                <p className="text-xs text-primary-600 font-medium">{tenant.cargo_busca}</p>
              </div>
            </div>
            <nav className="hidden items-center gap-6 text-sm font-medium text-secondary-600 md:flex">
              <a href="#propuestas" className="hover:text-primary-600">Propuestas</a>
              <a href="#eventos" className="hover:text-primary-600">Eventos</a>
              <a href="#territorio" className="hover:text-primary-600">Territorio</a>
              <a href="#contacto" className="hover:text-primary-600">Contacto</a>
            </nav>
            <a href="#registro" className="btn-primary text-sm">Únete al equipo</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-900 py-20 text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="container relative mx-auto px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
                {tenant.cargo_busca}
              </span>
              <h2 className="text-4xl font-bold leading-tight md:text-5xl">
                {tenant.slogan || `Juntos construimos el futuro de ${tenant.nombre_candidato}`}
              </h2>
              <p className="text-lg text-white/90">
                Únete a {totalSimpatizantes.toLocaleString()} ciudadanos que ya se han sumado.
                Nuestra campaña escucha, mapea y responde territorio por territorio.
              </p>
              {origen && <p className="text-sm text-white/70">Origen: {origen}</p>}
              <div className="flex flex-wrap gap-3">
                <a href="#registro" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-bold text-primary-700 transition hover:bg-secondary-100">
                  Quiero sumarme <ChevronRight size={18} />
                </a>
                <a href="#propuestas" className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-6 py-3 font-bold text-white transition hover:bg-white/10">
                  Conoce las propuestas
                </a>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
                <h3 className="mb-4 text-lg font-bold">Nuestra operación territorial</h3>
                <div className="grid grid-cols-2 gap-4">
                  <MiniStat icon={Users} value={totalSimpatizantes.toLocaleString()} label="Simpatizantes" />
                  <MiniStat icon={MapPin} value="100%" label="Secciones" />
                  <MiniStat icon={HeartHandshake} value="24/7" label="Atención" />
                  <MiniStat icon={BarChart3} value="En vivo" label="Resultados" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Propuestas */}
      <section id="propuestas" className="py-16">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h3 className="text-3xl font-bold text-secondary-900">Nuestras Propuestas</h3>
            <p className="mt-2 text-secondary-600">Tres ejes que transformarán tu día a día</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <PropuestaCard
              icon={Shield}
              titulo="Seguridad"
              descripcion="Más patrullajes, mejor equipamiento y cercanía con vecinos para recuperar la tranquilidad."
            />
            <PropuestaCard
              icon={Droplets}
              titulo="Agua"
              descripcion="Inversión real en infraestructura hídrica, pozos y redes para que nadie se quede sin agua."
            />
            <PropuestaCard
              icon={Briefcase}
              titulo="Empleo"
              descripcion="Créditos, capacitación y apoyo a PyMEs para que la economía local crezca desde abajo."
            />
          </div>
        </div>
      </section>

      {/* Territorio */}
      <section id="territorio" className="bg-secondary-50 py-16">
        <div className="container mx-auto px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold text-secondary-900">Territorio mapeado, voto conquistado</h3>
              <p className="text-secondary-600">
                Utilizamos tecnología de precisión electoral para identificar sección por sección dónde
                estamos fuertes y dónde falta trabajo. Cada simpatizante, apoyo y evento se georreferencia.
              </p>
              <ul className="space-y-2 text-secondary-600">
                <li className="flex items-center gap-2"><MapPin size={16} className="text-primary-600" /> Localización de casillas y responsables</li>
                <li className="flex items-center gap-2"><Users size={16} className="text-primary-600" /> Red de líderes territoriales</li>
                <li className="flex items-center gap-2"><MessageSquare size={16} className="text-primary-600" /> CRM con WhatsApp y formularios</li>
                <li className="flex items-center gap-2"><BarChart3 size={16} className="text-primary-600" /> Proyección de votos y metas</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-bold text-secondary-900">Avance por sección</span>
                <span className="text-xs text-secondary-500">Demo</span>
              </div>
              {[80, 62, 45, 90, 33].map((p, i) => (
                <div key={i} className="mb-3">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-secondary-700">Sección {100 + i}</span>
                    <span className="font-medium text-secondary-900">{p}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary-100">
                    <div className="h-full rounded-full bg-primary-600" style={{ width: `${p}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Eventos */}
      <section id="eventos" className="py-16">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h3 className="text-3xl font-bold text-secondary-900">Próximos Eventos</h3>
            <p className="mt-2 text-secondary-600">Participa y conoce nuestras propuestas de cerca</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4">
            {eventos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-secondary-300 p-8 text-center text-secondary-500">
                No hay eventos próximos programados.
              </div>
            ) : (
              eventos.map((e: any) => (
                <div key={e.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
                      <Calendar size={22} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-secondary-900">{e.nombre}</h4>
                      <p className="text-secondary-600">{e.direccion || 'Ubicación por confirmar'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{new Date(e.fecha).toLocaleDateString('es-MX')}</p>
                    <a href="#registro" className="text-sm text-primary-600 hover:underline">Confirmar asistencia →</a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="bg-primary-50 py-16">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h3 className="text-3xl font-bold text-secondary-900">Lo que dicen nuestros ciudadanos</h3>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { nombre: 'María G.', texto: 'Por primera vez siento que una campaña me escucha de verdad.' },
              { nombre: 'Luis R.', texto: 'Me sumé como voluntario porque veo resultados claros en mi colonia.' },
              { nombre: 'Ana P.', texto: 'La app de brigada es muy práctica para reportar necesidades reales.' },
            ].map((t, i) => (
              <div key={i} className="card">
                <div className="mb-4 flex gap-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <svg key={j} className="h-5 w-5 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="mb-4 text-secondary-700">"{t.texto}"</p>
                <p className="font-bold text-secondary-900">— {t.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registro */}
      <section id="registro" className="py-16">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-lg">
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-secondary-900">Únete al Equipo</h3>
              <p className="text-secondary-600">
                Regístrate como simpatizante o voluntario y recibe noticias de la campaña.
              </p>
            </div>
            <LandingForm slug={slug} origen={origen} />
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="bg-secondary-900 py-12 text-white">
        <div className="container mx-auto px-6">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Phone size={20} className="text-primary-400" />
              <span>Contacto directo con el equipo</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={20} className="text-primary-400" />
              <span>info@estrato.lat</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={20} className="text-primary-400" />
              <span>Territorio nacional</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-950 py-8 text-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-white/60">Powered by Estrato.lat — Tecnología para campañas ganadoras.</p>
            <div className="flex gap-6">
              <Link href="/aviso-de-privacidad" className="text-sm text-white/60 hover:text-white">Aviso de Privacidad</Link>
              <a href="/login" className="text-sm text-white/60 hover:text-white">Panel interno</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PropuestaCard({ icon: Icon, titulo, descripcion }: { icon: any; titulo: string; descripcion: string }) {
  return (
    <div className="card text-center transition hover:-translate-y-1 hover:shadow-md">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
        <Icon size={32} className="text-primary-600" />
      </div>
      <h4 className="mb-2 text-xl font-bold text-secondary-900">{titulo}</h4>
      <p className="text-secondary-600">{descripcion}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 p-4 text-center backdrop-blur">
      <Icon className="mx-auto mb-2 h-6 w-6" />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-white/80">{label}</p>
    </div>
  );
}
