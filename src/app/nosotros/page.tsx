import Link from 'next/link';
import Image from 'next/image';

const TEAM = [
  {
    name: 'Yury Constanza Ramírez Díaz',
    role: 'Consultora Política y Comunicación de Gobierno',
    image: '/images/team/yury.jpg',
    bio: `Consultora política en campañas electorales y comunicación de gobierno. Experta en estrategia electoral y movilización de votantes. Master en Consultoría Política por la Universidad Camilo José Cela (España).\n\nAyuda a los candidatos a conectar con el votante, sin perder tiempo ni dinero, a través de su metodología CIEM. Conferencista internacional en comunicación política y gerencia de campañas en México, Paraguay, Panamá, España, Ecuador, Perú, Estados Unidos, República Dominicana y Colombia.\n\nGanadora de los Napolitan Victory Awards (Washington D.C.) como «mujer influyente de la comunicación política» 2018, «campaña del año en movilización de votantes» 2022 y «campaña del año al concejo municipal» 2024. Coautora de nueve libros de marketing político y autora del ebook «Check list para elaborar tu presupuesto de campaña electoral».\n\nEs abogada, magíster en derecho administrativo, especialista en alta dirección del Estado, coach integral certificada y especialista en Inteligencia Artificial.`,
  },
  {
    name: 'José Antonio Sánchez',
    role: 'Consultor, Estratega y Coach Político',
    image: '/images/team/antonio.jpg',
    bio: `Consultor, estratega y coach político electoral y gubernamental. Más de 38 años de experiencia en el desarrollo y ejecución de estrategias político electorales en más de 550 campañas, impulsando victorias y transformaciones políticas.\n\nGanador de los premios Napolitan Victory Awards 2024 por campaña del Consejo a la Municipalidad del año, puestos misceláneos y mención honorífica por campañas a Cámara de Representantes.\n\nDirector ejecutivo internacional de World International Coaching y CEO de la firma Precisión Consultores.`,
  },
  {
    name: 'Gabriel Ibarra Báez',
    role: 'Estratega de Comunicación y Autor de Guerra de Mensajes',
    image: '/images/team/gabo.jpg',
    bio: `Estratega de comunicación con formación en diseño gráfico publicitario, especializado en desarrollo y ejecución de narrativas públicas y comunicación.\n\nHa fusionado la potencia visual con la estrategia discursiva como Director de Comunicación Social en gobiernos municipales, liderando la relación con medios, posicionamiento de agenda pública y difusión de logros institucionales. En el Gobierno del Estado de Guanajuato, colaboró con operación digital para redes sociales oficiales del Gobernador.\n\nAsesor en campañas electorales en México, enfocado en imagen, posicionamiento de candidatos, mensajes clave y contención de daños. Es conferencista, capacitador y autor del libro Guerra de Mensajes, guía práctica que aplica principios de estrategia militar a la comunicación política moderna.`,
  },
  {
    name: 'Alejandra Sierra López',
    role: 'Especialista en Derecho Electoral y Estrategia Partidista',
    image: '/images/team/alejandra.jpg',
    bio: `Destacada por su experiencia en la planificación y ejecución de estrategias para partidos políticos y gobiernos. Se ha especializado en la prevención de Delitos Electorales y comparte su experiencia a través de cursos de capacitación para equipos gubernamentales y de campaña.\n\nCuenta con una sólida formación académica que incluye una Maestría en Ciencia Política y diplomados en Derecho Electoral.`,
  },
];

export default function NosotrosPage() {
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
            <Link href="/nosotros" className="text-white transition">Nosotros</Link>
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

      {/* Hero interno */}
      <section className="relative overflow-hidden px-6 py-16 text-center lg:px-12 lg:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -left-1/4 -top-1/4 h-[60vw] w-[60vw] rounded-full bg-[#d73216]/10 blur-[120px]" />
          <div className="absolute -bottom-1/4 -right-1/4 h-[50vw] w-[50vw] rounded-full bg-[#d73216]/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#d73216]">
            Quienes somos
          </p>
          <h1 className="mt-3 text-3xl font-black text-white lg:text-5xl">
            EL EQUIPO DETRÁS DE ESTRATO
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60 lg:text-lg">
            Estrategas, consultores y comunicadores con décadas de experiencia en campañas electorales,
            gobierno y tecnología política.
          </p>
        </div>
      </section>

      {/* Equipo */}
      <section className="relative z-10 px-6 pb-20 lg:px-12">
        <div className="mx-auto grid max-w-5xl gap-6">
          {TEAM.map((member) => (
            <div
              key={member.name}
              className="group flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-[#d73216]/30 hover:bg-white/[0.04] sm:flex-row sm:items-start"
            >
              <div className="relative mx-auto h-48 w-48 shrink-0 overflow-hidden rounded-full bg-[#0f1015] sm:mx-0 sm:h-40 sm:w-40">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  className="object-cover grayscale transition duration-500 group-hover:grayscale-0"
                  sizes="160px"
                />
              </div>

              <div className="flex-1 text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#d73216]">
                  {member.role}
                </p>
                <h2 className="mt-1 text-xl font-bold text-white lg:text-2xl">
                  {member.name}
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/55">
                  {member.bio}
                </p>
              </div>
            </div>
          ))}
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
