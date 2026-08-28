import { useI18n } from '../../i18n/I18nProvider';
import { interestLabelKey, type InterestSlug } from '../../contracts/interests';
import { categoriesForInterests } from '../../contracts/interestCategories';
import { suggestInterestForRegion } from '../../lib/explore';
import { localised, type Place } from '../../lib/places';
import { Button } from '../../components/ui/Button';
import styles from './ExploreEmpty.module.css';

/**
 * The empty state — and there are two of them, because there are two reasons.
 *
 * Even with every published place in the pool, **21 of the 66 region × interest combinations
 * return nothing**. This is not an edge case to be handled with "no results"; it is a third
 * of the filter space, and the two kinds are not the same thing:
 *
 *  1. **A true fact about Cyprus.** There are no beaches in the Troodos mountains. Saying so
 *     is more useful than a shrug, and offering an interest that does have places in that
 *     region — computed from the same catalogue, so it can never suggest another dead end —
 *     is more useful still.
 *
 *  2. **A gap in our data.** `hidden_gems` reaches no CMS category at all, so it is empty in
 *     every region and always will be until places carry interest tags. Telling someone
 *     "no hidden gems in Paphos" would be a lie about Cyprus; the truth is about us.
 *
 * TODO(contracts): the second case disappears when `places_sync.interest_tags` lands.
 */
export function ExploreEmpty({
  places,
  region,
  interest,
  onClear,
  onPickInterest,
}: {
  places: readonly Place[];
  region: string | null;
  interest: string | null;
  onClear: () => void;
  onPickInterest: (slug: InterestSlug) => void;
}) {
  const { t, lang } = useI18n();

  const regionName = region
    ? localised(places.find((p) => p.regionSlug === region)?.regionName ?? {}, lang)
    : '';
  const interestName = interest ? t(interestLabelKey(interest as InterestSlug)) : '';

  /* The interest reaches no category at all — a different problem from having no places. */
  const unmapped = interest != null && categoriesForInterests([interest]).size === 0;
  const suggestion = suggestInterestForRegion(places, region, interest);

  return (
    <div className={styles.empty} role="status">
      {unmapped ? (
        <>
          <h2 className={styles.title}>{t('ui_explore_empty_untagged_title', { interest: interestName })}</h2>
          <p className={styles.body}>{t('ui_explore_empty_untagged_body')}</p>
        </>
      ) : (
        <>
          <h2 className={styles.title}>
            {regionName
              ? t('ui_explore_empty_title', { interest: interestName, region: regionName })
              : t('ui_explore_empty_title_any', { interest: interestName })}
          </h2>
          {suggestion && (
            <p className={styles.body}>
              {t('ui_explore_empty_suggestion', {
                interest: t(interestLabelKey(suggestion)),
              })}
            </p>
          )}
        </>
      )}

      <div className={styles.actions}>
        {!unmapped && suggestion && (
          <Button variant="primary" onClick={() => onPickInterest(suggestion)}>
            {t(interestLabelKey(suggestion))}
          </Button>
        )}
        <Button variant="provider" onClick={onClear}>
          {t('ui_explore_clear')}
        </Button>
      </div>
    </div>
  );
}
