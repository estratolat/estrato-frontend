import EncuestaForm from '@/components/encuestas/EncuestaForm';

export default function NuevaEncuestaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Nueva Encuesta</h2>
        <p className="text-secondary-600">Diseña las preguntas y activa cuando esté lista.</p>
      </div>
      <EncuestaForm />
    </div>
  );
}
