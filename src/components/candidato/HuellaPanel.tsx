'use client';

interface HuellaPanelProps {
  perfil: any;
}

export default function HuellaPanel({ perfil }: HuellaPanelProps) {
  if (!perfil) {
    return (
      <div className="rounded-xl border border-secondary-200 bg-white p-6 text-center text-secondary-500">
        <p className="font-medium">Aún no hay perfil cargado</p>
        <p className="text-sm">Guarda la información del candidato para ver el análisis y el contrincante.</p>
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

      {perfil.metadata?.rival && <RivalCard rival={perfil.metadata.rival} />}
    </div>
  );
}

function RivalCard({ rival }: { rival: any }) {
  if (!rival) return null;
  const color = rival.color || '#1F2937';
  return (
    <div className="rounded-xl border-l-4 border-secondary-700 bg-white p-5 shadow-sm" style={{ borderLeftColor: color }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: color }}>VS</span>
        <div>
          <h4 className="font-bold text-secondary-900">{rival.nombre || 'Contrincante'}</h4>
          <p className="text-xs text-secondary-500">{rival.rol || 'Rival'}</p>
        </div>
      </div>

      {rival.planilla && <TextBlock title="Planilla / Equipo" text={rival.planilla} />}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-red-100 bg-red-50/60 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Debilidades / Ataques</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-secondary-700">
            {(rival.debilidades || []).map((d: string, i: number) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-600">Fortalezas / Cuidado</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-secondary-700">
            {(rival.fortalezas || []).map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      </div>

      {rival.discurso_tipo && <TextBlock title="Tipo de discurso" text={rival.discurso_tipo} />}
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
