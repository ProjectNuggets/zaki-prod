import { Link } from "react-router-dom";
import { appHandoffUrl, productHandoffUrl } from "../../lib/appHandoff";
import type { Locale } from "../../lib/content";

export function Footer({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <footer className="mt-24 border-t border-zk-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-4 md:px-8">
        {/* Brand */}
        <div>
          <Link to={isArabic ? "/ar/" : "/"} className="inline-flex items-center gap-2.5">
            <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-8 rounded-[7px]" />
            <span className="font-logo text-lg tracking-wider text-zk-text">ZAKI</span>
          </Link>
          <p className="mt-4 max-w-[36ch] text-sm leading-7 text-zk-text-secondary">
            {isArabic
              ? "ذكاء اصطناعي شخصي يبقى معك. ذاكرة مستمرة، أتمتة، وخصوصية كاملة."
              : "Personal AI that stays with you. Persistent memory, automation, and full privacy."}
          </p>
        </div>

        {/* Product */}
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-secondary">
            {isArabic ? "المنتج" : "Product"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-zk-text-secondary">
            <Link to={isArabic ? "/ar/product/" : "/product/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "نظرة المنتج" : "Product overview"}</Link>
            <a href={productHandoffUrl("chat")} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "ZAKI Chat" : "ZAKI Chat"}</a>
            <a href={productHandoffUrl("agent")} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "زكي Agent" : "ZAKI Agent"}</a>
            <a href={productHandoffUrl("design")} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">ZAKI Design</a>
            <a href={productHandoffUrl("minutes")} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">ZAKI Minutes</a>
            <a href={productHandoffUrl("brain")} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "Brain · ذاكرة Agent" : "Brain · Agent memory"}</a>
            <a href={appHandoffUrl("/settings", "website_footer", "dashboard")} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "Settings" : "Settings"}</a>
            <Link to={isArabic ? "/ar/pricing/" : "/pricing/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الأسعار" : "Pricing"}</Link>
            <Link to={isArabic ? "/ar/story/" : "/story/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "لماذا زكي" : "Why ZAKI"}</Link>
            <Link to={isArabic ? "/ar/use-cases/" : "/use-cases/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الاستخدامات" : "Use cases"}</Link>
          </div>
        </div>

        {/* Website */}
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-secondary">
            {isArabic ? "الموقع" : "Website"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-zk-text-secondary">
            <Link to={isArabic ? "/ar/use-cases/" : "/use-cases/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الاستخدامات" : "Use cases"}</Link>
            <Link to={isArabic ? "/ar/story/" : "/story/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "القصة" : "Story"}</Link>
            <Link to={isArabic ? "/ar/faq/" : "/faq/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الأسئلة" : "FAQ"}</Link>
            <Link to={isArabic ? "/ar/contact/" : "/contact/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "تواصل" : "Contact"}</Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-secondary">
            {isArabic ? "القانون" : "Legal"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-zk-text-secondary">
            <Link to={isArabic ? "/ar/privacy/" : "/privacy/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الخصوصية" : "Privacy"}</Link>
            <Link to={isArabic ? "/ar/terms/" : "/terms/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الشروط" : "Terms"}</Link>
            <Link to={isArabic ? "/ar/contact/" : "/contact/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "تواصل" : "Contact"}</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="mx-auto max-w-6xl border-t border-zk-border px-5 py-5 md:px-8">
        <p className="text-xs text-zk-text-secondary">
          © {new Date().getFullYear()}{" "}
          <a href="https://www.novanuggets.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">Nova Nuggets</a>.{" "}
          {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
