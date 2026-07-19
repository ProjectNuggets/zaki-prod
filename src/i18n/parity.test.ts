import { AUTH_COPY } from "@/app/components/loginCopy";
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
    "input.zaki.lastTurnWarning",
    "input.zaki.lastTurnWarningWithoutReset",
    "zakiDashboard.meter.enforcedDaily",
    "zakiDashboard.meter.enforcedUsed",
  ])("%s exists in both locales", (key) => {
    expect(enKeys).toContain(key);
    expect(arKeys).toContain(key);
  });

  // WP-F: the anonymous Agent plan-preview copy. This surface is the first thing a signed-out
  // Arabic visitor sees on /agent, so an English-only string here ships an English wall.
  it.each([
    "agentPreview.kicker",
    "agentPreview.title",
    "agentPreview.subtitle",
    "agentPreview.inputLabel",
    "agentPreview.placeholder",
    "agentPreview.submit",
    "agentPreview.running",
    "agentPreview.planKicker",
    "agentPreview.notRunBadge",
    "agentPreview.planAria",
    "agentPreview.saveExplainer",
    "agentPreview.saveAndContinue",
    "zakiDashboard.command.markers.preview",
    "zakiDashboard.command.submitAgentPreview",
  ])("%s exists in both locales", (key) => {
    expect(enKeys).toContain(key);
    expect(arKeys).toContain(key);
  });
});

// The auth screen keeps its copy in its own bundle (AUTH_COPY) rather than the JSON
// locales, so until WP-M it sat OUTSIDE this gate entirely — ~120 strings that could
// drift between en and ar with nothing to catch it. It is gated now.
describe("i18n auth-screen (AUTH_COPY) parity", () => {
  const enKeys = flattenKeys(AUTH_COPY.en as unknown as Nested);
  const arKeys = flattenKeys(AUTH_COPY.ar as unknown as Nested);

  it("en and ar have identical key sets", () => {
    const enSet = new Set(enKeys);
    const arSet = new Set(arKeys);

    expect({
      missingInAr: enKeys.filter((k) => !arSet.has(k)),
      missingInEn: arKeys.filter((k) => !enSet.has(k)),
    }).toEqual({ missingInAr: [], missingInEn: [] });
    expect(enKeys.length).toBe(arKeys.length);
  });

  it("no auth string is empty in either locale", () => {
    const read = (bundle: unknown, path: string) =>
      path.split(".").reduce<unknown>((acc, part) => (acc as Nested)?.[part], bundle);

    const empty = enKeys.filter((path) => {
      const enValue = read(AUTH_COPY.en, path);
      const arValue = read(AUTH_COPY.ar, path);
      return String(enValue ?? "").trim() === "" || String(arValue ?? "").trim() === "";
    });
    expect(empty).toEqual([]);
  });

  // WP-M: the date-of-birth field is gone, so these keys must be too — a stale key
  // here is a stale field waiting to be re-rendered.
  it.each([
    "fields.dateOfBirth",
    "placeholders.dateOfBirth",
    "errors.dateOfBirthRequired",
    "errors.dateOfBirthInvalid",
  ])("%s is GONE from both locales (WP-M dropped DOB)", (key) => {
    expect(enKeys).not.toContain(key);
    expect(arKeys).not.toContain(key);
  });

  // ...and the age language did NOT silently vanish with the field: minimum age is
  // now a ToS attestation, and it must exist in both locales.
  it("the ToS age attestation exists in both locales", () => {
    expect(enKeys).toContain("consent.ageAttestation");
    expect(arKeys).toContain("consent.ageAttestation");
    expect(AUTH_COPY.en.consent.ageAttestation).toMatch(/minimum age/i);
    expect(AUTH_COPY.ar.consent.ageAttestation.trim()).not.toBe("");
  });
});
