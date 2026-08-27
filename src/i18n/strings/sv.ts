/* Phase-1 UI strings in sv.
 *
 * Deliberately empty. The React shell introduces strings the vanilla dictionary never
 * had, and inventing translations for them would be worse than falling back: a wrong
 * translation is invisible, a missing one is not. Every key resolves to English until
 * a translator fills it in, which is the same fallback the vanilla switcher used.
 *
 * The queue is docs/TRANSLATION-QUEUE.md. Adding a key here is all that is needed —
 * it is type-checked against the English shape, so a typo will not compile.
 */
import type { UiKey } from './en';

export const stringsSv: Partial<Record<UiKey, string>> = {};
