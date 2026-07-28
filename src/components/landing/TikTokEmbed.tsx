'use client';

import { useEffect, useRef, useState } from 'react';

interface TikTokEmbedProps {
  videoId: string;
  username?: string;
}

export default function TikTokEmbed({ videoId, username = 'gaboibarrab' }: TikTokEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const loadEmbed = () => {
      const win = window as any;
      if (win.tiktokEmbed) {
        try {
          win.tiktokEmbed();
        } catch {
          // El script puede fallar en re-parse; dejamos el fallback
        }
      }
    };

    const existingScript = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.tiktok.com/embed.js';
      script.async = true;
      script.onload = () => {
        setLoaded(true);
        loadEmbed();
      };
      document.body.appendChild(script);
    } else {
      // Si el script ya existe, esperamos un poco a que procese y forzamos reparse
      const timer = setTimeout(() => {
        setLoaded(true);
        loadEmbed();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [videoId]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f1015]">
      <blockquote
        className="tiktok-embed"
        cite={`https://www.tiktok.com/@${username}/video/${videoId}`}
        data-video-id={videoId}
        style={{ maxWidth: '605px', minWidth: '280px' }}
      >
        <section className="flex min-h-[380px] flex-col items-center justify-center p-4 text-center text-white/50">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#d73216]" />
          <p className="mt-3 text-xs">Cargando video de TikTok...</p>
        </section>
      </blockquote>
      {loaded && (
        <style jsx>{`
          .tiktok-embed {
            width: 100% !important;
            max-width: 100% !important;
            min-width: unset !important;
            margin: 0 !important;
          }
        `}</style>
      )}
    </div>
  );
}
