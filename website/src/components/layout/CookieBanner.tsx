import { useEffect, useState } from "react";
import CookieConsent from "react-cookie-consent";
import { Link } from "react-router-dom";
import type { Locale } from "../../lib/content";

const COOKIE_NAME = "chatzaki-cookie-consent";

export function CookieBanner({ locale }: { locale: Locale }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const isArabic = locale === "ar";
  const privacyHref = isArabic ? "/ar/privacy/#cookies" : "/privacy/#cookies";

  const labels = isArabic
    ? {
        accept: "موافق",
        decline: "رفض التحليلات",
        body: "نستخدم ملفات تعريف الارتباط الضرورية لتشغيل الخدمة، وملفات تحليلات اختيارية بعد موافقتك. اعرف المزيد في",
        privacyLink: "سياسة الخصوصية",
      }
    : {
        accept: "Accept",
        decline: "Decline analytics",
        body: "We use strictly necessary cookies to operate the service and optional analytics cookies after you opt in. Learn more in our",
        privacyLink: "Privacy Notice",
      };

  return (
    <CookieConsent
      location="bottom"
      buttonText={labels.accept}
      declineButtonText={labels.decline}
      enableDeclineButton
      cookieName={COOKIE_NAME}
      expires={365}
      ariaAcceptLabel={labels.accept}
      ariaDeclineLabel={labels.decline}
      style={{
        background: "rgba(15, 13, 12, 0.96)",
        color: "#f0ece6",
        fontFamily: "inherit",
        fontSize: "0.875rem",
        lineHeight: 1.6,
        padding: "0.75rem 1rem",
        borderTop: "1px solid rgba(240, 236, 230, 0.12)",
        backdropFilter: "blur(8px)",
        zIndex: 60,
        direction: isArabic ? "rtl" : "ltr",
      }}
      buttonStyle={{
        background: "#f10202",
        color: "#ffffff",
        fontSize: "0.8125rem",
        fontWeight: 600,
        padding: "0.5rem 1rem",
        borderRadius: "9999px",
        border: "none",
      }}
      declineButtonStyle={{
        background: "transparent",
        color: "#f0ece6",
        fontSize: "0.8125rem",
        fontWeight: 500,
        padding: "0.5rem 1rem",
        borderRadius: "9999px",
        border: "1px solid rgba(240, 236, 230, 0.32)",
      }}
    >
      <span>
        {labels.body}{" "}
        <Link
          to={privacyHref}
          style={{ color: "#f10202", textDecoration: "underline", textUnderlineOffset: "3px" }}
        >
          {labels.privacyLink}
        </Link>
        .
      </span>
    </CookieConsent>
  );
}
