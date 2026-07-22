import { useTranslation } from "react-i18next";

type LocaleSwitcherProps = {
  mobile?: boolean;
};

export function LocaleSwitcher({ mobile = false }: LocaleSwitcherProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language?.toLowerCase().startsWith("ar");
  const targetLocale = isArabic ? "en" : "ar";
  const label = isArabic
    ? t("language.switchToEnglish", { defaultValue: "Switch to English" })
    : t("language.switchToArabic", { defaultValue: "Switch to Arabic" });
  const changeLocale = async () => {
    await i18n.changeLanguage(targetLocale);
    const url = new URL(window.location.href);
    url.searchParams.set("lang", targetLocale);
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  };

  return (
    <button
      type="button"
      className={
        mobile
          ? "zaki-mobile-topbar__button zaki-locale-switcher zaki-locale-switcher--mobile"
          : "zaki-app-topbar__toggle zaki-locale-switcher"
      }
      aria-label={label}
      data-locale-target={targetLocale}
      onClick={() => void changeLocale()}
    >
      {targetLocale.toUpperCase()}
    </button>
  );
}
