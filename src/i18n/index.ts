import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const STORAGE_KEY = "zaki:locale";
const I18NEXT_STORAGE_KEY = "i18nextLng";

type LocaleStorage = Pick<Storage, "getItem">;

type InitialLanguageOptions = {
  search?: string;
  storage?: LocaleStorage;
  browserLanguage?: string;
};

export const resolveInitialLanguage = (options: InitialLanguageOptions = {}) => {
  if (typeof window === "undefined" && !options.storage) return "en";
  const search = options.search ?? window.location.search;
  const storage = options.storage ?? window.localStorage;
  const queryLanguage = new URLSearchParams(search).get("lang");
  if (queryLanguage === "en" || queryLanguage === "ar") return queryLanguage;
  const i18nextLanguage = storage.getItem(I18NEXT_STORAGE_KEY);
  if (i18nextLanguage === "en" || i18nextLanguage === "ar") return i18nextLanguage;
  const stored = storage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  const browser = (options.browserLanguage ?? window.navigator.language)?.toLowerCase() || "en";
  return browser.startsWith("ar") ? "ar" : "en";
};

const setDocumentDirection = (lng: string) => {
  if (typeof document === "undefined") return;
  const isRtl = lng === "ar";
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  document.documentElement.lang = lng;
  document.body.classList.toggle("rtl", isRtl);
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: en },
      ar: { common: ar },
    },
    lng: resolveInitialLanguage(),
    fallbackLng: "en",
    supportedLngs: ["en", "ar"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    returnNull: false,
  })
  .then(() => {
    setDocumentDirection(i18n.language);
  });

i18n.on("languageChanged", (lng) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lng);
    window.localStorage.setItem(I18NEXT_STORAGE_KEY, lng);
  }
  setDocumentDirection(lng);
});

export { i18n, STORAGE_KEY };
