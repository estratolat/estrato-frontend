'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Icon } from '@/components/ui/Icon';

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  icono?: string;
  children: ReactNode;
  ancho?: 'sm' | 'md' | 'lg';
  posicion?: 'izquierda' | 'derecha';
}

export default function PanelFlotante({
  abierto,
  onCerrar,
  titulo,
  icono = 'seguridad',
  children,
  ancho = 'md',
  posicion = 'izquierda',
}: Props) {
  const refPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    if (abierto) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [abierto, onCerrar]);

  const anchoClasses = {
    sm: 'w-80',
    md: 'w-96',
    lg: 'w-[28rem]',
  };

  return (
    <>
      {/* Overlay en escritorio: cierra al hacer clic fuera */}
      {abierto && (
        <div
          className="fixed inset-0 z-[700] bg-secondary-900/20 backdrop-blur-sm hidden lg:block"
          onClick={onCerrar}
        />
      )}

      {/* Drawer lateral en escritorio */}
      <div
        ref={refPanel}
        className={`fixed top-16 z-[710] hidden lg:flex h-[calc(100vh-4rem)] flex-col border border-secondary-200 bg-white shadow-2xl transition-transform duration-300 ${anchoClasses[ancho]} ${
          posicion === 'derecha'
            ? `right-0 rounded-l-2xl ${abierto ? 'translate-x-0' : 'translate-x-full'}`
            : `left-0 rounded-r-2xl ${abierto ? 'translate-x-0' : '-translate-x-full'}`
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-secondary-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Icon name={icono as any} size={16} />
            </div>
            <h3 className="text-sm font-bold text-secondary-900">{titulo}</h3>
          </div>
          <button
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
            title="Cerrar (Esc)"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>

      {/* Bottom sheet en móvil */}
      <div
        className={`fixed inset-x-0 bottom-0 z-[710] flex max-h-[85vh] flex-col rounded-t-2xl border-t border-secondary-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.15)] transition-transform duration-300 lg:hidden ${
          abierto ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-secondary-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              <Icon name={icono as any} size={16} />
            </div>
            <h3 className="text-sm font-bold text-secondary-900">{titulo}</h3>
          </div>
          <button
            onClick={onCerrar}
            className="flex h-8 w-8 items-center justify-center rounded-full text-secondary-400 transition hover:bg-secondary-100 hover:text-secondary-600"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </>
  );
}
