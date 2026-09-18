"use client";

import Image from "next/image";
import { useState } from "react";
import type { Wedding } from "./wedding";

export function WeddingPhoto({ image }: { image?: Wedding["image"] }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="wedding-photo relative overflow-hidden" data-testid="wedding-photo">
      <div className="photo-fallback absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <svg viewBox="0 0 160 160" className="h-32 w-32" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M80 137C70 99 99 66 85 22M79 113C53 110 44 95 45 78C65 81 78 92 79 113ZM82 87C108 80 115 64 112 48C94 55 82 69 82 87ZM85 61C65 56 59 41 62 27C78 33 85 44 85 61Z" />
        </svg>
      </div>
      {image && !failed && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          preload
          sizes="(min-width: 768px) 1100px, 100vw"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
      <div className="photo-fade pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
