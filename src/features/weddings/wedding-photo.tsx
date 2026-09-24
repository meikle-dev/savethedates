"use client";

import Image from "next/image";
import { useState } from "react";
import type { Wedding } from "./wedding";
import type { PhotoFrame } from "./photo-framing";
import { BotanicalArt } from "./wedding-art";

export function WeddingPhoto({ image, frame, label }: { image?: Wedding["image"]; frame?: PhotoFrame; label?: string }) {
  const [failed, setFailed] = useState(false);
  const position = frame ?? { x: 50, y: 50, zoom: 1 };

  return (
    <div className="wedding-photo" data-testid="wedding-photo" data-has-photo={!!image && !failed}>
      <div className="photo-fallback absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <BotanicalArt />
        <BotanicalArt />
      </div>
      {image && !failed && (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          unoptimized
          preload
          sizes="(min-width: 1240px) 1240px, 100vw"
          className="object-cover"
          style={{
            objectPosition: `${position.x}% ${position.y}%`,
            transform: `scale(${position.zoom})`,
            transformOrigin: `${position.x}% ${position.y}%`,
          }}
          onError={() => setFailed(true)}
        />
      )}
      <div className="photo-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      {label && <PhotoLabel label={label} />}
    </div>
  );
}

// Marks a sample photo as replaceable on the fictional examples; real wedding pages never pass a label.
export function PhotoLabel({ label, className = "" }: { label: string; className?: string }) {
  return <span className={`photo-example-label ${className}`.trim()}>
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" /><circle cx="8.5" cy="10" r="1.6" fill="currentColor" /><path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
    {label}
  </span>;
}
