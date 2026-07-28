'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

interface VideoCardProps {
  src: string;
  poster: string;
  nombre: string;
  titulo: string;
}

export default function VideoCard({ src, poster, nombre, titulo }: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    videoRef.current?.play();
    setPlaying(true);
  };

  return (
    <div className="group relative w-full overflow-hidden rounded-xl border border-white/10 bg-[#0f1015]">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        preload="metadata"
        playsInline
        className="aspect-[9/16] w-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {!playing && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 transition hover:bg-black/30"
          aria-label={`Reproducir video de ${nombre}`}
        >
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#d73216] text-white shadow-lg transition group-hover:scale-105">
            <Play size={24} fill="currentColor" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
            {titulo}
          </span>
          <span className="text-sm font-bold text-white">{nombre}</span>
        </button>
      )}
    </div>
  );
}
