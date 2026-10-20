import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { FacilityImage } from '@/features/services/components/facility-image';
import { facilities } from '@/features/services/content';
import styles from '@/features/services/services.module.css';

export const metadata: Metadata = {
  title: 'Services & Facilities | Forever City Hotel',
  description:
    'Explore dining, wellness, swimming, fitness and spaces for special occasions at Forever City Hotel.',
};

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="services-page-title">
          <Image
            src="/images/forever-city-pool.webp"
            alt=""
            fill
            preload
            sizes="100vw"
          />
          <div className={styles.heroCopy}>
            <h1 id="services-page-title">
              Services & <em>Facilities</em>
            </h1>
            <p className="eyebrow">Your comfort. Our attention to detail.</p>
          </div>
        </section>
        <section
          className={styles.catalogue}
          aria-labelledby="experience-title"
        >
          <div className={styles.introduction}>
            <p className="eyebrow">Curated experiences</p>
            <h2 id="experience-title">
              Everything You Need,
              <br />
              <em>Perfectly Delivered</em>
            </h2>
            <p>
              From unwinding in our wellness spaces to memorable meals and
              occasions, discover the experiences that make your stay your own.
            </p>
          </div>
          <div className={styles.grid}>
            {facilities.map((facility) => (
              <article className={styles.card} key={facility.name}>
                <FacilityImage
                  image={facility.image}
                  alt={facility.imageAlt}
                  illustrative={facility.illustrative}
                />
                <div className={styles.cardCopy}>
                  <span className={styles.symbol} aria-hidden="true">
                    {facility.symbol}
                  </span>
                  <h3>{facility.name}</h3>
                  <p>{facility.description}</p>
                </div>
              </article>
            ))}
            <article className={styles.photoCard}>
              <span className={styles.symbol} aria-hidden="true">
                ?
              </span>
              <h3>Scenic Photo Locations</h3>
              <p>
                Find a beautiful backdrop for the moments you want to remember.
                Ask our team about photo locations around the hotel.
              </p>
            </article>
          </div>
          <aside className={styles.visitNote} aria-labelledby="visit-title">
            <h3 id="visit-title">Make more of your stay</h3>
            <p>
              For honeymoon packages and other published promotions,{' '}
              <Link href="/#offers">view current offers</Link>. Opening hours,
              access conditions and event arrangements can be confirmed with the
              hotel. Online facility reservations are not available yet.
            </p>
          </aside>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
