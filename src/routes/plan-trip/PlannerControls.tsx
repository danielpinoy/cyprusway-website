import type { LucideIcon } from 'lucide-react';

import { Icon } from '../../components/ui/Icon';
import styles from './PlanTrip.module.css';

/**
 * The wizard's three input shapes.
 *
 * **All three are real form controls with a real `fieldset`/`legend`.** The frames draw
 * cards and chips, and the app builds them as pressable views because React Native has no
 * radio; on the web a single-choice group is a radio group, and pretending otherwise costs
 * arrow-key navigation, the group name on focus, and the "3 of 6" a screen reader reads
 * out. The input itself is visually hidden and the label carries the appearance, so the
 * design is unchanged and the semantics are the browser's.
 *
 * Single choice → `OptionTiles` (pace, morning, party) or `RadioChips` (base destination).
 * Multiple, capped → `CheckboxChips` (interests). The divergence from
 * `InterestsScreen`'s `aria-pressed` buttons is deliberate: a capped multi-select needs a
 * group-level description and a live count, which a list of toggle buttons cannot carry.
 */

export interface TileOption<T extends string> {
  value: T;
  label: string;
  /** Present on the party step only, where the frame writes a line under each name. */
  description?: string;
  icon?: LucideIcon;
}

export function OptionTiles<T extends string>({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
  rows = false,
  hideLegend = false,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: readonly TileOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Stack full-width rows instead of a tile row — used where options carry descriptions. */
  rows?: boolean;
  /**
   * Keep the legend for a screen reader and take it off the screen.
   *
   * For the step whose only question IS this group: the step heading above already asks
   * it, and printing the same sentence twice is noise on screen. The group still has to be
   * named in the accessibility tree, so the legend stays — it just stops being drawn.
   */
  hideLegend?: boolean;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={hideLegend ? 'cw-visually-hidden' : styles.legend}>{legend}</legend>
      {hint && <p className={styles.groupHint}>{hint}</p>}
      <div className={rows ? styles.tileRows : styles.tileRow}>
        {options.map((option) => (
          <label
            key={option.value}
            className={rows ? styles.tileWide : styles.tile}
            data-selected={value === option.value ? 'true' : undefined}
          >
            <input
              className="cw-visually-hidden"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.icon && (
              <span className={styles.tileIcon} aria-hidden="true">
                <Icon as={option.icon} size={rows ? 20 : 28} strokeWidth={1.5} />
              </span>
            )}
            <span className={styles.tileText}>
              <span className={styles.tileLabel}>{option.label}</span>
              {option.description && (
                <span className={styles.tileDesc}>{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface ChipOption {
  value: string;
  label: string;
  /** 24px disc. Interests have one; regions have none — `destination.hero_image` is null
   *  on all six, the standing departure phase 3 made and phase 5 repeated. */
  image?: string;
}

export function RadioChips({
  name,
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: readonly ChipOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {hint && <p className={styles.groupHint}>{hint}</p>}
      <div className={styles.chips}>
        {options.map((option) => (
          <label
            key={option.value}
            className={styles.chip}
            data-selected={value === option.value ? 'true' : undefined}
          >
            <input
              className="cw-visually-hidden"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.image && (
              <img
                className={styles.chipImage}
                src={option.image}
                alt=""
                width={24}
                height={24}
                loading="lazy"
              />
            )}
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckboxChips({
  legend,
  hint,
  status,
  options,
  selected,
  atCap,
  onToggle,
}: {
  legend: string;
  hint?: string;
  /** The live "{count} of {max} chosen" line. Announced, not only drawn. */
  status: string;
  options: readonly ChipOption[];
  selected: readonly string[];
  atCap: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {hint && <p className={styles.groupHint}>{hint}</p>}
      <div className={styles.chips}>
        {options.map((option) => {
          const isOn = selected.includes(option.value);
          /* At the cap the unchosen chips are disabled — the sixth tag is a 400 by name,
             so refusing it here is better than sending it. The count line says why; the
             dimming is never the only signal. */
          const blocked = atCap && !isOn;
          return (
            <label
              key={option.value}
              className={styles.chip}
              data-selected={isOn ? 'true' : undefined}
              data-blocked={blocked ? 'true' : undefined}
            >
              <input
                className="cw-visually-hidden"
                type="checkbox"
                value={option.value}
                checked={isOn}
                disabled={blocked}
                onChange={() => onToggle(option.value)}
              />
              {option.image && (
                <img
                  className={styles.chipImage}
                  src={option.image}
                  alt=""
                  width={24}
                  height={24}
                  loading="lazy"
                />
              )}
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
      <p className={styles.groupStatus} role="status">
        {status}
      </p>
    </fieldset>
  );
}
