import React, { useState } from 'react';
import { portraitTile } from '../utils/photoFallback';

/**
 * An <img> that can never look broken:
 *  - shows a locally generated tile immediately as the underlying layer
 *  - fades the real photo in on top once it loads
 *  - keeps the tile if the network/URL fails
 */
export default function SmartImage({
  src,
  alt = '',
  name = '',
  seed,
  className = '',
  imgClassName = '',
  ...rest
}) {
  const fallback = portraitTile({ name: name || alt, seed: seed || src || name || alt });
  // Keyed by src on purpose: a new src is a new load, so no reset effect needed.
  const [loadedSrc, setLoadedSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  const showPhoto = Boolean(src) && failedSrc !== src;
  const loaded = loadedSrc === src;

  return (
    <div className={`relative overflow-hidden bg-[#241030] ${className}`}>
      <img
        src={fallback}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        {...rest}
      />
      {showPhoto && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
          className={`relative h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          {...rest}
        />
      )}
    </div>
  );
}
