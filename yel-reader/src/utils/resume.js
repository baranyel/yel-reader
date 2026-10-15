// Decide where to continue reading a text.
// saved: { page, scroll } from storage (scroll = 0..1 within the page), or null.
// Returns { page, scroll, overall } or null when the reader should simply start at the top
// (never opened, barely started, or already finished).
export function resolveResume(saved, totalPages) {
  if (!saved) return null;
  const page = Math.max(0, Math.min(saved.page || 0, totalPages - 1));
  const scroll = Math.max(0, Math.min(saved.scroll || 0, 1));
  const overall = (page + scroll) / totalPages;
  if (overall < 0.02) return null;
  if (page === totalPages - 1 && scroll > 0.97) return null;
  return { page, scroll, overall };
}
