'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from '../services.module.css';

type FacilityImageProps = {
  image?: string;
  alt: string;
  illustrative?: boolean;
};

export function FacilityImage({
  image,
  alt,
  illustrative,
}: FacilityImageProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={styles.image}>
      {!image || failed ? (
        <p className={styles.imageFallback}>Photograph coming soon</p>
      ) : (
        <Image
          src={`/images/${image}`}
          alt={illustrative ? `Illustration: ${alt}` : alt}
          fill
          sizes="(max-width: 600px) 90vw, (max-width: 900px) 45vw, 30vw"
          onError={() => setFailed(true)}
        />
      )}
      {illustrative && image && !failed && (
        <span className={styles.imageCaption}>Illustrative image</span>
      )}
    </div>
  );
}
