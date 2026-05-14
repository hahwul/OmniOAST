// Synchronous "is the plugin page currently on screen" check. Used to gate
// unread-badge increments at the moment a new interaction arrives — avoids
// the previous observer-based approach, whose IntersectionObserver and
// MutationObserver didn't fire reliably on Caido page transitions.
export const isPluginCurrentlyVisible = (): boolean => {
  if (typeof document === "undefined") return false;
  const el = document.getElementById("plugin--omnioast");
  if (!el || !el.isConnected) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  for (let curr: HTMLElement | null = el; curr; curr = curr.parentElement) {
    const style = getComputedStyle(curr);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }
  }
  return true;
};
