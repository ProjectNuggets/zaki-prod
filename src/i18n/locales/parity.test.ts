import en from "./en.json";
import ar from "./ar.json";

type Json = Record<string, unknown>;

function flatten(obj: Json, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [k, v] of flatten(value as Json, nextKey)) {
        out.set(k, v);
      }
    } else if (typeof value === "string") {
      out.set(nextKey, value);
    }
  }
  return out;
}

const PLURAL_SUFFIXES = ["_zero", "_one", "_two", "_few", "_many", "_other"];

function basePluralKey(key: string): string | null {
  for (const suffix of PLURAL_SUFFIXES) {
    if (key.endsWith(suffix)) return key.slice(0, -suffix.length);
  }
  return null;
}

function hasCoverage(key: string, otherKeys: Set<string>): boolean {
  if (otherKeys.has(key)) return true;
  const base = basePluralKey(key);
  if (base && (otherKeys.has(base) || otherKeys.has(`${base}_other`))) return true;
  return false;
}

describe("i18n en/ar parity", () => {
  const flatEn = flatten(en as Json);
  const flatAr = flatten(ar as Json);
  const enKeys = new Set(flatEn.keys());
  const arKeys = new Set(flatAr.keys());

  it("has every English key present in Arabic", () => {
    const missing = [...enKeys].filter((key) => !hasCoverage(key, arKeys));
    expect(missing).toEqual([]);
  });

  it("has every Arabic key present in English (plural forms excepted)", () => {
    const missing = [...arKeys].filter((key) => !hasCoverage(key, enKeys));
    expect(missing).toEqual([]);
  });
});
