import ar from "./locales/ar.json";
import en from "./locales/en.json";

// The build gate for translations. Every user-facing string must exist in BOTH locales —
// a key that lands in en.json but not ar.json ships an English sentence into an Arabic UI.
// This was previously enforced by convention only; WP-B/WP-C add enough new copy that it
// is worth a real gate.

type Nested = { [key: string]: string | Nested };

function flattenKeys(obj: Nested, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenKeys(value as Nested, path)
      : [path];
  });
}

describe("i18n locale parity", () => {
  const enKeys = flattenKeys(en as unknown as Nested);
  const arKeys = flattenKeys(ar as unknown as Nested);

  it("en and ar have identical key sets", () => {
    const enSet = new Set(enKeys);
    const arSet = new Set(arKeys);
    const missingInAr = enKeys.filter((k) => !arSet.has(k));
    const missingInEn = arKeys.filter((k) => !enSet.has(k));

    expect({ missingInAr, missingInEn }).toEqual({ missingInAr: [], missingInEn: [] });
    expect(enKeys.length).toBe(arKeys.length);
  });

  it("no locale key has an empty value", () => {
    const emptyEn = flattenKeys(en as unknown as Nested).filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>((acc, part) => (acc as Nested)?.[part], en);
      return typeof value === "string" && value.trim() === "";
    });
    expect(emptyEn).toEqual([]);
  });

  // WP-B/WP-C: the new copy must be present in both locales.
  it.each([
    "chatErrors.rateLimited.body",
    "chatErrors.contentFilter.body",
    "chatErrors.networkDrop.body",
    "chatErrors.contextWindow.body",
    "chatErrors.timeout.body",
    "chatErrors.modelOverload.body",
    "chatErrors.invalidSession.body",
    "chatErrors.generic.body",
    "paywall.limit.titleDaily",
    "paywall.limit.signInCta",
    "paywall.limit.upgradeCta",
    "paywall.limit.promptSaved",
    "paywall.limit.resets",
    "zakiDashboard.meter.enforcedDaily",
    "zakiDashboard.meter.enforcedUsed",
  ])("%s exists in both locales", (key) => {
    expect(enKeys).toContain(key);
    expect(arKeys).toContain(key);
  });
});
