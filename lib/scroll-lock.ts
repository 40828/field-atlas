/**
 * Ref-counted body scroll lock so overlapping overlays (reader, paywall, ...)
 * can't leave the page stuck at `overflow: hidden` when they close out of order.
 */
let locks = 0;

export function lockScroll(): () => void {
  locks += 1;
  document.body.style.overflow = "hidden";
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks = Math.max(0, locks - 1);
    if (locks === 0) document.body.style.overflow = "";
  };
}
