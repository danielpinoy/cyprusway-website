import { useT } from '../../i18n/I18nProvider';
import { Skeleton } from '../../components/ui/Skeleton';
import styles from './HomeSkeleton.module.css';

/**
 * The loading state, Figma node 3562-24665: the chrome renders live and only the content
 * is skeletoned.
 *
 * Phase 1 shortened this to the hero alone, because the frame also skeletons rails that
 * did not exist. Most of them exist now, so it is back in line with what actually loads —
 * **and only with what actually loads.** The rule that decides:
 *
 *  - **Skeleton what the system can produce.** Top Recommendations, Popular, Categories,
 *    Book with Pete and Food & Wine always render, so they always have a placeholder. So
 *    does the signed-in row: whether a given person has a trip or a saved place is a fact
 *    about them, not about the catalogue.
 *  - **Do not skeleton what the system cannot produce.** "See Cyprus before you go" has no
 *    placeholder, because `virtual_tour` is null on 181 of 181 rows — a skeleton there
 *    would promise something that never arrives for anybody.
 *
 * The hero is not skeletoned at all: it is static copy that waits for nothing. The Figma
 * frame does skeleton its hero, because the app's carries a greeting and a live place
 * count; ours carries neither, and pretending it was loading would also have emptied the
 * prerendered HTML of the only text a crawler can read on this page.
 *
 * `aria-busy` and one status line carry the state. Every block is `aria-hidden`, so a
 * screen reader hears "Loading" once rather than thirty empty boxes.
 */
export function HomeSkeleton({ signedIn }: { signedIn: boolean }) {
  const t = useT();

  return (
    <div aria-busy="true">
      <p className="cw-visually-hidden" role="status">
        {t('ui_loading')}
      </p>

      <div className={styles.content}>
        <div className={styles.inner}>
          {signedIn && (
            <div className={styles.personal}>
              <div className={styles.trips}>
                <Skeleton height="130px" radius="var(--cw-radius-md)" />
                <Skeleton height="130px" radius="var(--cw-radius-md)" />
              </div>
              <div className={styles.savedColumn}>
                <SkeletonHeading />
                <div className={styles.row}>
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} width="180px" height="227px" radius="var(--cw-radius-md)" />
                  ))}
                </div>
              </div>
            </div>
          )}

          <SkeletonRail cards={4} width="282px" height="300px" />
          <SkeletonRail cards={6} width="180px" height="251px" />

          <div className={styles.split}>
            <div className={styles.categories}>
              <SkeletonHeading />
              <div className={styles.tiles}>
                {Array.from({ length: 11 }, (_, i) => (
                  <Skeleton key={i} height="72px" radius="var(--cw-radius-md)" />
                ))}
              </div>
            </div>
            <Skeleton height="332px" radius="var(--cw-radius-md)" />
          </div>

          <SkeletonRail cards={6} width="180px" height="251px" />
        </div>
      </div>
    </div>
  );
}

function SkeletonHeading() {
  return (
    <div className={styles.heading}>
      <Skeleton width="220px" height="24px" />
    </div>
  );
}

function SkeletonRail({
  cards,
  width,
  height,
}: {
  cards: number;
  width: string;
  height: string;
}) {
  return (
    <div className={styles.rail}>
      <SkeletonHeading />
      <div className={styles.row}>
        {Array.from({ length: cards }, (_, i) => (
          <Skeleton key={i} width={width} height={height} radius="var(--cw-radius-md)" />
        ))}
      </div>
    </div>
  );
}
