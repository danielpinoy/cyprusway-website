import { useT } from '../../i18n/I18nProvider';
import { Skeleton } from '../../components/ui/Skeleton';
import styles from './Hero.module.css';
import skeleton from './HeroSkeleton.module.css';

/**
 * The loading state, Figma node 3562-24665.
 *
 * The frame keeps the chrome live and skeletons the content, which is what happens
 * here — the header, footer and language control all render normally.
 *
 * It skeletons only what will actually appear. The frame also shows placeholder rails
 * below the hero; those stand for recommendations, tours and food picks, none of which
 * phase 1 renders. Drawing them would promise content that never arrives, which is a
 * worse loading state than a shorter one.
 *
 * aria-busy and a single status line carry the state; every block is aria-hidden, so
 * a screen reader hears "Loading" once rather than eleven empty boxes.
 */
export function HeroSkeleton() {
  const t = useT();

  return (
    <section className={styles.hero} aria-busy="true">
      <div className={styles.inner}>
        <p className="cw-visually-hidden" role="status">
          {t('ui_loading')}
        </p>

        <div className={skeleton.stack}>
          <Skeleton tone="navy" height="40px" width="100%" />
          <Skeleton tone="navy" height="40px" width="82%" />
          <Skeleton tone="navy" height="40px" width="60%" />
        </div>

        <div className={skeleton.subStack}>
          <Skeleton tone="navy" height="18px" width="100%" />
          <Skeleton tone="navy" height="18px" width="70%" />
        </div>

        <div className={skeleton.ask}>
          <Skeleton tone="navy" height="48px" radius="var(--cw-radius-sm)" />
        </div>

        <div className={skeleton.options}>
          <Skeleton tone="navy" height="92px" radius="var(--cw-radius-sm)" />
          <Skeleton tone="navy" height="92px" radius="var(--cw-radius-sm)" />
        </div>
      </div>
    </section>
  );
}
