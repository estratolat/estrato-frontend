'use client';

import { useState } from 'react';

interface LandingFormProps {
  slug: string;
  origen: string;
}

export function LandingForm({ slug, origen }: LandingFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    colonia: '',
    seccion_electoral: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const url = `${apiUrl}/tenants/${slug}/votantes`;
      const payload = {
        ...formData,
        origen_qr: origen || 'landing-directa',
        nivel_apoyo: 3,
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error al registrar' }));
        throw new Error(err.message || `Error ${res.status}`);
      }

      setMessage('¡Gracias por unirte! Tu registro fue exitoso.');
      setFormData({ nombre: '', telefono: '', colonia: '', seccion_electoral: '' });
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('LandingForm error:', err);
      setError(err.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="label">
          Nombre completo
        </label>
        <input
          id="nombre"
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          className="input"
          placeholder="Tu nombre"
          required
        />
      </div>

      <div>
        <label htmlFor="telefono" className="label">
          WhatsApp
        </label>
        <input
          id="telefono"
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          className="input"
          placeholder="+52 123 456 7890"
          required
        />
      </div>

      <div>
        <label htmlFor="colonia" className="label">
          Colonia
        </label>
        <input
          id="colonia"
          type="text"
          name="colonia"
          value={formData.colonia}
          onChange={handleChange}
          className="input"
          placeholder="Tu colonia"
        />
      </div>

      <div>
        <label htmlFor="seccion_electoral" className="label">
          Sección Electoral (opcional)
        </label>
        <input
          id="seccion_electoral"
          type="text"
          name="seccion_electoral"
          value={formData.seccion_electoral}
          onChange={handleChange}
          className="input"
          placeholder="1234"
          maxLength={4}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? 'Enviando...' : 'Enviar'}
      </button>
    </form>
  );
}
