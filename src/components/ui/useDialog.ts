import { useCallback, useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Everything a modal surface owes the keyboard, in one place so the auth card and the
 * navigation drawer cannot drift apart:
 *
 *  - focus moves into the surface on open, skipping the close button when there is
 *    something better to land on
 *  - Tab and Shift+Tab are trapped, in both directions
 *  - Escape closes, when the surface is dismissible
 *  - focus returns to whatever opened it; if nothing did — the OAuth return leg opens
 *    the card with no trigger — focus is released rather than stranded on a node that
 *    is about to leave the document
 *  - the page behind does not scroll
 */
export function useDialog<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { open, dismissible, onClose }: { open: boolean; dismissible: boolean; onClose: () => void },
): void {
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  /* onClose is held in a ref, and deliberately NOT an effect dependency.
     Both call sites pass a fresh arrow on every render — Layout passes
     `() => setMenuOpen(false)`, AuthGate passes `() => setInterestsDismissed(true)` —
     so depending on it re-ran the whole open sequence on every parent render: focus
     was pulled back to the dialog's first item and the scroll lock was removed and
     re-added. Reproduced by changing the language from inside the open drawer with
     focus on the last link: focus jumped back to the first navigation row.
     Only `open` and `dismissible` describe the dialog's state, so only they drive it. */
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const focusables = useCallback((): HTMLElement[] => {
    const surface = ref.current;
    if (!surface) return [];
    return Array.from(surface.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }, [ref]);

  useEffect(() => {
    if (!open) return;

    restoreFocusTo.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const items = focusables();
    const target = items.length > 1 ? items[1] : items[0];
    target?.focus();

    document.body.classList.add('cw-scroll-locked');

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const current = focusables();
      if (current.length === 0) return;

      const first = current[0];
      const last = current[current.length - 1];
      const active = document.activeElement;

      if (!ref.current?.contains(active)) {
        event.preventDefault();
        first?.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('cw-scroll-locked');

      const trigger = restoreFocusTo.current;
      if (trigger && document.contains(trigger)) trigger.focus();
      else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
  }, [open, dismissible, focusables, ref]);
}
