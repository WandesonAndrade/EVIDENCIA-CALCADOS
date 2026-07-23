/**
 * Utility for smooth scrolling to a target element or section ID,
 * taking into account the height of the sticky two-tier header
 * and an extra top breathing room (offset padding).
 */
export const scrollToSectionWithOffset = (
  target: HTMLElement | string | null,
  extraOffset = 24
) => {
  if (!target) return;

  const targetEl = typeof target === 'string' ? document.getElementById(target) : target;
  if (!targetEl) return;

  const headerEl = document.getElementById('store-header');
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 110;
  const totalOffset = headerHeight + extraOffset;

  const elementPosition = targetEl.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = Math.max(0, elementPosition - totalOffset);

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
};
