'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from '../rooms.module.css';

export function RoomImage({ source, name }: { source?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.image}>
      {!source || failed ? (
        <p className={styles.imageFallback}>Room photograph unavailable</p>
      ) : (
        <Image
          src={source}
          alt={`${name} room photograph`}
          fill
          sizes="(max-width: 700px) 90vw, (max-width: 1000px) 45vw, 30vw"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
