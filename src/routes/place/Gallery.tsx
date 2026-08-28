import { useEffect, useRef, useState } from 'react';

import { useI18n } from '../../i18n/I18nProvider';
import { categoryIcon } from '../../contracts/categoryIcons';
import { inlineArrowStep } from '../../lib/dir';
import { directusImageSrcSet, directusImageUrl } from '../../lib/directusImage';
import { localised, type Place } from '../../lib/places';
import { Icon } from '../../components/ui/Icon';
import styles from './Gallery.module.css';

const MAIN = { width: 760, height: 460 };
const THUMB = { width: 120, height: 84 };

/**
 * The place gallery, built for the catalogue that exists rather than the one the frame draws.
 *
 * The frame shows a large image beside a strip of **six** thumbnails. Measured across all 181
 * published places (`hero_image_url` plus `gallery`, deduped — the hero is never inside the
 * gallery):
 *
 *     0 images  108 places      3–5 images  12 places
 *     1 image    14 places      6 images     1 place
 *     2 images   45 places      7 images     1 place
 *
 * **Two places in the whole catalogue have six or more.** So there are three real cases:
 *
 *  - **none** — no gallery at all. The caller renders the fallback banner instead; an empty
 *    frame or a placeholder graphic would be worse than the place's own words.
 *  - **one** — the image alone, full width. No strip: a strip of one is a control with
 *    nothing to control.
 *  - **two or more** — main image plus a strip of the rest, however many there are. Not
 *    padded to six.
 *
 * Keyboard: thumbnails are real buttons with `aria-pressed`, and Left/Right/Home/End move
 * between them, moving focus with the selection — through `inlineArrowStep`, so under RTL
 * the arrow that points along the text is still the one that advances. The strip has no
 * scroll buttons: the longest gallery in the catalogue is seven images, which fits.
 */
export function Gallery({ place }: { place: Place }) {
  const { t, lang } = useI18n();
  const [index, setIndex] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const images = place.images;

  useEffect(() => {
    setIndex(0);
  }, [place.slug]);

  if (images.length === 0) {
    const CategoryGlyph = categoryIcon(place.categorySlug);
    return (
      <div className={styles.fallback}>
        <Icon as={CategoryGlyph} size={40} className={styles.fallbackIcon} />
        <p className={styles.fallbackCategory}>{localised(place.categoryName, lang)}</p>
        {place.short && (
          <p className={styles.fallbackBlurb} lang="en">
            {place.short}
          </p>
        )}
      </div>
    );
  }

  const current = images[index] ?? (images[0] as string);

  function move(next: number) {
    const clamped = Math.max(0, Math.min(images.length - 1, next));
    setIndex(clamped);
    buttons.current[clamped]?.focus();
  }

  return (
    <div className={styles.gallery}>
      <img
        className={styles.main}
        src={directusImageUrl(current, MAIN)}
        srcSet={directusImageSrcSet(current, MAIN)}
        width={MAIN.width}
        height={MAIN.height}
        alt=""
        /* The first image is the page's own hero — never lazy, it is the LCP element. */
        loading="eager"
        decoding="async"
      />

      {images.length > 1 && (
        <div
          className={styles.strip}
          role="group"
          aria-label={t('ui_place_gallery')}
          tabIndex={0}
          onKeyDown={(event) => {
            const step = inlineArrowStep(event.key, event.currentTarget);
            if (step !== 0) {
              event.preventDefault();
              move(index + step);
            } else if (event.key === 'Home') {
              event.preventDefault();
              move(0);
            } else if (event.key === 'End') {
              event.preventDefault();
              move(images.length - 1);
            }
          }}
        >
          {images.map((image, i) => (
            <button
              key={image}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              className={styles.thumb}
              aria-pressed={i === index}
              aria-label={t('ui_place_photo_of', { index: i + 1, total: images.length })}
              onClick={() => setIndex(i)}
            >
              <img
                src={directusImageUrl(image, THUMB)}
                srcSet={directusImageSrcSet(image, THUMB)}
                width={THUMB.width}
                height={THUMB.height}
                alt=""
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
