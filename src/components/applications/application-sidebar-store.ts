export type ApplicationSidebarCounts = {
  active: number;
  closed: number;
  total: number;
};

let counts: ApplicationSidebarCounts | null = null;
const listeners = new Set<() => void>();

export function getApplicationSidebarCounts() {
  return counts;
}

export function subscribeToApplicationSidebarCounts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setApplicationSidebarCounts(next: ApplicationSidebarCounts | null) {
  if (
    counts?.active === next?.active &&
    counts?.closed === next?.closed &&
    counts?.total === next?.total
  ) {
    return;
  }

  counts = next;
  listeners.forEach((listener) => listener());
}
