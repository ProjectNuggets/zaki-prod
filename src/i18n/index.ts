import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const STORAGE_KEY = "zaki:locale";

const getInitialLanguage = () => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ar") return stored;
  const browser = window.navigator.language?.toLowerCase() || "en";
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
    lng: getInitialLanguage(),
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
  }
  setDocumentDirection(lng);
});

export { i18n, STORAGE_KEY };
