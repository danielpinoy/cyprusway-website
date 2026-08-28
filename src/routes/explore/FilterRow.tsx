import { useEffect, useRef, type ReactNode } from 'react';

import styles from './FilterRow.module.css';

export interface FilterChoice {
  value: string | null;
  label: string;
  /** Rendered beside the label. Omitted on the "All" chip, which is never empty. */
  count?: number | undefined;
}

/**
 * One row of filter chips.
 *
 * Real `<button>`s with `aria-pressed`, in a labelled `role="group"`, so the row is a set
 * rather than seven unrelated controls. The row scrolls horizontally when it does not fit,
 * and the scroller is focusable for the same reason the rails' are — a scrollable region has
 * to be keyboard-operable whether or not its contents are.
 *
 * A selection that arrived in the URL is scrolled into view on mount. Both rows overflow at
 * common widths — the eleven interests do at every width — so a shared link to
 * `?interest=hidden_gems` could otherwise open with its own selected chip off-screen, which
 * reads as no filter at all.
 *
 * The frame gives every chip a small round photograph. Region chips have no image source at
 * all — `destination` carries `{id, slug, name}` and nothing else — so rather than ship six
 * copies of one placeholder, chips are text with their count. Interest chips could use the
 * 48px thumbnails phase 1 ships, but mixing avatar chips in one row with text chips in the
 * other reads as an inconsistency rather than a distinction, so both rows are text.
 */
export function FilterRow({
  label,
  choices,
  selected,
  onSelect,
  renderChip,
}: {
  label: string;
  choices: readonly FilterChoice[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  /** Escape hatch for a chip that needs more than a label and a count. */
  renderChip?: ((choice: FilterChoice) => ReactNode) | undefined;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected == null) return;
    const chip = scroller.current?.querySelector('[aria-pressed="true"]');
    /* `inline` is logical, so this is correct under RTL without a direction check.
       `block: 'nearest'` keeps it from scrolling the page: the row is already in view. */
    chip?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [selected]);

  return (
    <div className={styles.row} role="group" aria-label={label}>
      <div className={styles.scroller} tabIndex={0} ref={scroller}>
        {choices.map((choice) => {
          const isSelected = choice.value === selected;
          return (
            <button
              key={choice.value ?? 'all'}
              type="button"
              className={`${styles.chip} ${choice.count === 0 ? styles.empty : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(choice.value)}
            >
              {renderChip ? (
                renderChip(choice)
              ) : (
                <>
                  <span>{choice.label}</span>
                  {choice.count !== undefined && (
                    <span className={styles.count} aria-hidden="true">
                      {choice.count}
                    </span>
                  )}
                  {/* The count is decorative beside the label but load-bearing in the
                      accessible name — "Beaches, 22 places" is what a screen-reader user
                      needs before deciding to press it. */}
                  {choice.count !== undefined && (
                    <span className="cw-visually-hidden">{`, ${choice.count}`}</span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
