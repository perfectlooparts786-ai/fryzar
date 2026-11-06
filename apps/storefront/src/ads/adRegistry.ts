const mountedSlotsByRoute = new Map<string, Set<string>>();

export function getRouteSlotCount(routeKey: string): number {
  return mountedSlotsByRoute.get(routeKey)?.size ?? 0;
}

export function tryRegisterAdSlot(
  routeKey: string,
  slotInstanceId: string,
  maxAdsPerPage: number
): boolean {
  if (maxAdsPerPage <= 0) return false;
  let set = mountedSlotsByRoute.get(routeKey);
  if (!set) {
    set = new Set<string>();
    mountedSlotsByRoute.set(routeKey, set);
  }
  if (set.has(slotInstanceId)) {
    return true;
  }
  if (set.size >= maxAdsPerPage) {
    return false;
  }
  set.add(slotInstanceId);
  return true;
}

export function unregisterAdSlot(routeKey: string, slotInstanceId: string): void {
  const set = mountedSlotsByRoute.get(routeKey);
  if (!set) return;
  set.delete(slotInstanceId);
  if (set.size === 0) {
    mountedSlotsByRoute.delete(routeKey);
  }
}

export function detectDeviceClass(): "mobile" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth <= 768 ? "mobile" : "desktop";
}
