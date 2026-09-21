"use client";

import Image from "next/image";
import { useState } from "react";
import type { Wedding } from "./wedding";
import { OliveBranch } from "./wedding-art";

export function WeddingPhoto({ image }: { image?: Wedding["image"] }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="wedding-photo" data-testid="wedding-photo" data-has-photo={!!image && !failed}>
      <div className="photo-fallback absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <OliveBranch />
        <OliveBranch />
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
          onError={() => setFailed(true)}
        />
      )}
      <div className="photo-fade pointer-events-none absolute inset-0" aria-hidden="true" />
    </div>
  );
}
