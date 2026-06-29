'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { casillasApi } from '@/lib/api';
import { Casilla } from '@/types';
import { Save, MapPin } from 'lucide-react';

const TIPOS = [
  { key: 'basica', label: 'Básica' },
  { key: 'contigua', label: 'Contigua' },
  { key: 'especial', label: 'Especial' },
  { key: 'extranjero', label: 'Extranjero' },
];

interface CasillaFormProps {
  casilla?: Casilla;
}

export default function CasillaForm({ casilla }: CasillaFormProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    seccion: casilla?.seccion || '',
    tipo: casilla?.tipo || 'basica',
    numero: casilla?.numero || '',
    ubicacion: casilla?.ubicacion || '',
    direccion: casilla?.direccion || '',
    referencia: casilla?.referencia || '',
    mesa_directiva: casilla?.mesa_directiva || '',
    electores_esperados: casilla?.electores_esperados || '',
    notas: casilla?.notas || '',
    lat: casilla?.coordenadas?.lat || '',
    lng: casilla?.coordenadas?.lng || '',
  });
  const [saving, setSaving] = useState(false);

  const update = (field: keyof typeof form, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.seccion.trim()) return alert('La sección es requerida');
    setSaving(true);
    try {
      const payload: any = {
        seccion: form.seccion.trim(),
        tipo: form.tipo,
        numero: form.numero.trim(),
        ubicacion: form.ubicacion.trim(),
        direccion: form.direccion.trim(),
        referencia: form.referencia.trim(),
        mesa_directiva: form.mesa_directiva.trim(),
        electores_esperados: form.electores_esperados ? parseInt(String(form.electores_esperados), 10) : null,
        notas: form.notas.trim(),
      };
      if (form.lat && form.lng) {
        payload.coordenadas = { lat: parseFloat(String(form.lat)), lng: parseFloat(String(form.lng)) };
      }
      if (casilla) {
        await casillasApi.update(casilla.id, payload);
      } else {
        await casillasApi.create(payload);
      }
      router.push('/dashboard/casillas');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Sección electoral</label>
          <input
            type="text"
            value={form.seccion}
            onChange={(e) => update('seccion', e.target.value)}
            className="input"
            placeholder="Ej. 1234"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Tipo</label>
          <select value={form.tipo} onChange={(e) => update('tipo', e.target.value)} className="input">
            {TIPOS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Número / identificador</label>
          <input
            type="text"
            value={form.numero}
            onChange={(e) => update('numero', e.target.value)}
            className="input"
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Electores esperados</label>
          <input
            type="number"
            value={form.electores_esperados}
            onChange={(e) => update('electores_esperados', e.target.value)}
            className="input"
            placeholder="0"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Ubicación / lugar</label>
          <input
            type="text"
            value={form.ubicacion}
            onChange={(e) => update('ubicacion', e.target.value)}
            className="input"
            placeholder="Ej. Escuela Primaria Benito Juárez"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Dirección</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => update('direccion', e.target.value)}
            className="input"
            placeholder="Calle, número, colonia"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Referencia</label>
          <input
            type="text"
            value={form.referencia}
            onChange={(e) => update('referencia', e.target.value)}
            className="input"
            placeholder="Ej. Entrada por calle Hidalgo"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Mesa directiva</label>
          <input
            type="text"
            value={form.mesa_directiva}
            onChange={(e) => update('mesa_directiva', e.target.value)}
            className="input"
            placeholder="Integrantes de mesa"
          />
        </div>
        <div className="flex items-center gap-2 text-primary-600">
          <MapPin size={18} />
          <span className="text-sm font-medium">Coordenadas</span>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Latitud</label>
          <input
            type="number"
            step="any"
            value={form.lat}
            onChange={(e) => update('lat', e.target.value)}
            className="input"
            placeholder="Ej. 21.125"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Longitud</label>
          <input
            type="number"
            step="any"
            value={form.lng}
            onChange={(e) => update('lng', e.target.value)}
            className="input"
            placeholder="Ej. -101.685"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-semibold text-secondary-700">Notas</label>
          <textarea
            value={form.notas}
            onChange={(e) => update('notas', e.target.value)}
            className="input min-h-[80px]"
            placeholder="Observaciones adicionales"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button type="button" onClick={() => router.push('/dashboard/casillas')} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={18} /> {saving ? 'Guardando...' : casilla ? 'Actualizar' : 'Crear casilla'}
        </button>
      </div>
    </form>
  );
}
