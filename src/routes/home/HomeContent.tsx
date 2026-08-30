import { useMemo } from 'react';

import { useT } from '../../i18n/I18nProvider';
import { useSession } from '../../lib/SessionProvider';
import {
  POPULAR_COUNT,
  foodAndWine,
  popularBand,
  travelerRail,
  TRAVELER_RAIL_MIN,
  renderablePool,
  topRecommendations,
  tourPlaces,
} from '../../lib/rails';
import { seededShuffle, sessionSeed } from '../../lib/shuffle';
import { travelerRailHeadingKey } from '../../contracts/travelerPools';
import { BookWithPeteCard } from '../../components/home/BookWithPeteCard';
import { CategoryTiles } from '../../components/home/CategoryTiles';
import { ContinueTripCard } from '../../components/home/ContinueTripCard';
import { PlaceCard } from '../../components/home/PlaceCard';
import { Rail } from '../../components/home/Rail';
import { SavedPlaceCard } from '../../components/home/SavedPlaceCard';
import { TourCard } from '../../components/home/TourCard';
import { RankInspector, useRankDebug } from './RankInspector';
import type { HomeData } from './useHomeData';
import styles from './HomeContent.module.css';

/**
 * The homepage below the hero.
 *
 * Every rail follows the same rule: **when its query is empty the whole section renders
 * nothing** — no heading, no empty-state copy, no placeholder cards. A heading over
 * nothing is a promise the page cannot keep, and phase 1 set the precedent by hiding the
 * hero's tour carousel rather than filling it.
 *
 * Today that means "See Cyprus before you go", "Saved Places" and "Continue your trip"
 * are all absent: 0 tours exist, `saved_places` has never held a row, and only one
 * itinerary spans today.
 */
export function HomeContent({ data }: { data: HomeData }) {
  const t = useT();
  const { user, interests, travelerType } = useSession();
  const { places, savedPlaces, trips } = data;
  const showRankDebug = useRankDebug();

  const pool = useMemo(() => renderablePool(places), [places]);
  const top = useMemo(() => topRecommendations(pool, interests), [pool, interests]);
  const tours = useMemo(() => tourPlaces(places), [places]);
  const food = useMemo(() => foodAndWine(places), [places]);

  /* Shuffled once per session, not per render: cards moving while someone reads is worse
     than a static list. The seed lives in sessionStorage — see lib/shuffle.ts.
     Top's picks are excluded rather than assumed away: interest-aware ranking can reach
     into Popular's band, which the original disjoint-bands argument did not allow for. */
  /* The traveller rail, for a signed-in visitor whose column is set. A guest never has
     one: the chooser writes nothing without a session, so there is no type to read. Null
     type → no rail and no placeholder, the standing empty-rail rule; the invitation is the
     hero card. See `travelerRail` for why this is not a second copy of Popular. */
  const travelerCards = useMemo(
    () =>
      user && travelerType
        ? travelerRail(pool, travelerType, new Set(top.map((place) => place.id)))
        : [],
    [user, travelerType, pool, top],
  );

  /* Shuffled once per session, not per render: cards moving while someone reads is worse
     than a static list. The seed lives in sessionStorage — see lib/shuffle.ts.
     Top's picks are excluded rather than assumed away: interest-aware ranking can reach
     into Popular's band, which the original disjoint-bands argument did not allow for.
     The traveller rail joins that exclusion, so a card it has just shown under a heading
     cannot appear again six rows later with no explanation. Popular's band is 22 and it
     needs 6, so it never runs short — measured per type in `travelerRail`. */
  const popular = useMemo(() => {
    const alreadyShown = new Set([...top, ...travelerCards].map((place) => place.id));
    return seededShuffle(popularBand(pool, alreadyShown), sessionSeed()).slice(0, POPULAR_COUNT);
  }, [pool, top, travelerCards]);

  return (
    <div className={styles.content}>
      <div className={styles.inner}>
        {user && (trips.length > 0 || savedPlaces.length > 0) && (
          <div className={styles.personal}>
            {trips.length > 0 && (
              <div className={styles.trips}>
                {trips.map((trip) => (
                  <ContinueTripCard key={trip.id} trip={trip} places={places} />
                ))}
              </div>
            )}

            {savedPlaces.length > 0 && (
              <div className={styles.saved}>
                <Rail titleKey="ui_rail_saved" scrollBy={204}>
                  {savedPlaces.map((place) => (
                    <SavedPlaceCard key={place.id} place={place} />
                  ))}
                </Rail>
              </div>
            )}
          </div>
        )}

        {showRankDebug && <RankInspector places={places} interests={interests} />}

        {top.length > 0 && (
          <Rail titleKey="ui_rail_top_recommendations" scrollBy={306}>
            {top.map((place) => (
              <PlaceCard key={place.id} place={place} size="large" />
            ))}
          </Rail>
        )}

        {travelerType && travelerCards.length >= TRAVELER_RAIL_MIN && (
          <Rail titleKey={travelerRailHeadingKey(travelerType)} scrollBy={204}>
            {travelerCards.map((place) => (
              <PlaceCard key={place.id} place={place} size="small" />
            ))}
          </Rail>
        )}

        {tours.length > 0 && (
          <Rail titleKey="ui_rail_tours" scrollBy={408}>
            {tours.map((place) => (
              <TourCard key={place.id} place={place} />
            ))}
          </Rail>
        )}

        {popular.length > 0 && (
          <Rail titleKey="ui_rail_popular" scrollBy={204}>
            {popular.map((place) => (
              <PlaceCard key={place.id} place={place} size="small" />
            ))}
          </Rail>
        )}

        <div className={styles.split}>
          <CategoryTiles />
          <BookWithPeteCard places={places} />
        </div>

        {food.length > 0 && (
          <Rail titleKey="ui_rail_food_wine" scrollBy={204}>
            {food.map((place) => (
              <PlaceCard key={place.id} place={place} size="small" />
            ))}
          </Rail>
        )}

        {/* Announced once when the rails replace the skeleton, for anyone who cannot see
            the change happen. */}
        <p className="cw-visually-hidden" role="status">
          {t('ui_home_ready')}
        </p>
      </div>
    </div>
  );
}
