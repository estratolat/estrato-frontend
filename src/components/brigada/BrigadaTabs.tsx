'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import VotanteForm from './VotanteForm';
import LiderForm from './LiderForm';
import ApoyoForm from './ApoyoForm';
import PeticionForm from './PeticionForm';

type TabKey = 'votante' | 'lider' | 'apoyo' | 'peticion';

const TABS: { key: TabKey; label: string; icon: string; color: string }[] = [
  { key: 'votante', label: 'Votante', icon: 'votantes', color: '#3B82F6' },
  { key: 'lider', label: 'Líder', icon: 'lideres', color: '#D73216' },
  { key: 'apoyo', label: 'Apoyo', icon: 'apoyos', color: '#F59E0B' },
  { key: 'peticion', label: 'Petición', icon: 'crm', color: '#06B6D4' },
];

interface Props {
  onExito: () => void;
}

export default function BrigadaTabs({ onExito }: Props) {
  const [active, setActive] = useState<TabKey>('votante');

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="mx-auto max-w-md">
          <div className="mb-4 flex items-center justify-between rounded-xl border border-secondary-100 bg-white p-3 shadow-sm">
            <div>
              <p className="text-xs font-semibold text-secondary-500">Análisis territorial</p>
              <p className="text-sm font-bold text-secondary-900">Ver todo en el mapa</p>
            </div>
            <Link
              href="/dashboard/mapa"
              className="flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-700"
            >
              <Icon name="mapa" size={14} /> Mapa
            </Link>
          </div>

          {active === 'votante' && <VotanteForm onExito={onExito} />}
          {active === 'lider' && <LiderForm onExito={onExito} />}
          {active === 'apoyo' && <ApoyoForm onExito={onExito} />}
          {active === 'peticion' && <PeticionForm onExito={onExito} />}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-secondary-200 bg-white px-2 pb-2">
        <div className="mx-auto flex max-w-md items-center justify-around py-2">
          {TABS.map((tab) => {
            const isActive = active === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition ${
                  isActive ? 'bg-secondary-100' : 'hover:bg-secondary-50'
                }`}
              >
                <Icon
                  name={tab.icon as any}
                  size={22}
                  style={{ color: isActive ? tab.color : '#9CA3AF' }}
                />
                <span
                  className={`text-[11px] font-medium ${
                    isActive ? 'text-secondary-900' : 'text-secondary-500'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
