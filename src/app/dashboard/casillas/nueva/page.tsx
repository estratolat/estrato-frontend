import CasillaForm from '@/components/casillas/CasillaForm';

export default function NuevaCasillaPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-secondary-900">Nueva Casilla</h2>
        <p className="text-secondary-600">Registra un puesto de votación con su ubicación y responsable.</p>
      </div>
      <CasillaForm />
    </div>
  );
}
