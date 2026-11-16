import Image from 'next/image';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { getPromotionFeed } from '@/features/promotions/api/promotions';
import { OffersCatalogue } from '@/features/promotions/components/offers-catalogue';
import styles from '@/features/promotions/offers.module.css';

export const metadata = {
  title: 'Exclusive Offers | Forever City Hotel',
  description:
    'Explore current promotion codes and room offers at Forever City Hotel.',
};
export const dynamic = 'force-dynamic';

export default async function OffersPage() {
  const feed = await getPromotionFeed();
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.page}>
        <section className={styles.hero} aria-labelledby="offers-title">
          <Image
            src="/images/forever-city-pool.webp"
            alt=""
            fill
            preload
            sizes="100vw"
          />
          <div>
            <p className="eyebrow">Forever City Hotel</p>
            <h1 id="offers-title">Exclusive Offers</h1>
            <p>Explore current promotions for your next stay.</p>
          </div>
        </section>
        <OffersCatalogue feed={feed} />
      </main>
      <SiteFooter />
    </>
  );
}
