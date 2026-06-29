'use client';

interface HuellaPanelProps {
  perfil: any;
}

export default function HuellaPanel({ perfil }: HuellaPanelProps) {
  if (!perfil || !perfil.analizado_en) {
    return (
      <div className="rounded-xl border border-secondary-200 bg-white p-6 text-center text-secondary-500">
        <p className="font-medium">Aún no hay análisis de huella</p>
        <p className="text-sm">Guarda el perfil y presiona “Analizar con IA” para extraer muletillas, palabras clave y tono.</p>
      </div>
    );
  }

  const badges = (arr: string[] | undefined) =>
    (arr || []).map((item, i) => (
      <span
        key={i}
        className="inline-flex rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700"
      >
        {item}
      </span>
    ));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-secondary-200 bg-white p-5">
        <h4 className="mb-3 font-bold text-secondary-800">Huella de comunicación</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Palabras clave">{badges(perfil.palabras_clave)}</Card>
          <Card title="Muletillas">{badges(perfil.muletillas)}</Card>
          <Card title="Frases recurrentes">{badges(perfil.frases_recurrentes)}</Card>
          <Card title="Llamados a la acción">{badges(perfil.llamados_accion)}</Card>
        </div>

        {(perfil.tono || perfil.propuesta_central || perfil.estilo_redes) && (
          <div className="mt-4 grid gap-4">
            {perfil.tono && <TextBlock title="Tono" text={perfil.tono} />}
            {perfil.propuesta_central && <TextBlock title="Propuesta central" text={perfil.propuesta_central} />}
            {perfil.estilo_redes && <TextBlock title="Estilo en redes" text={perfil.estilo_redes} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-secondary-100 bg-secondary-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-500">{title}</p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-secondary-100 bg-secondary-50 p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-secondary-500">{title}</p>
      <p className="text-sm leading-relaxed text-secondary-800">{text}</p>
    </div>
  );
}
