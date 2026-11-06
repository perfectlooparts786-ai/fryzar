const CONSENT_STORAGE_KEY = "fryzar-ad-consent";

export type AdConsentStatus = "granted" | "declined" | "unset";

export function readAdConsent(): AdConsentStatus {
  if (typeof window === "undefined") return "unset";
  try {
    const val = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === "granted" || val === "declined") return val;
    return "unset";
  } catch {
    return "unset";
  }
}

export function writeAdConsent(status: "granted" | "declined"): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Ignore storage quota / private browsing errors
  }
}

export function canLoadAdsUnderConsent(consentRequired: boolean): boolean {
  if (!consentRequired) return true;
  return readAdConsent() === "granted";
}
