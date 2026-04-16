import { Link } from "react-router-dom";
import type { Locale } from "../../lib/content";

export function Footer({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <footer className="mt-24 border-t border-zk-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr_0.9fr] md:px-8">
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
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
            {isArabic ? "المنتج" : "Product"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-zk-text-secondary">
            <a href="https://app.chatzaki.com/?auth=signup&source=website_footer" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">Spaces</a>
            <Link to={isArabic ? "/ar/zaki-bot/" : "/zaki-bot/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "زكي Agent" : "ZAKI Agent"}</Link>
            <Link to={isArabic ? "/ar/story/" : "/story/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "لماذا زكي" : "Why ZAKI"}</Link>
            <Link to={isArabic ? "/ar/faq/" : "/faq/"} className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "الأسئلة" : "FAQ"}</Link>
          </div>
        </div>

        {/* Comparisons */}
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
            {isArabic ? "مقارنات" : "Compare"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-zk-text-secondary">
            <Link to="/zaki-vs-spaces/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "زكي مقابل Spaces" : "ZAKI vs Spaces"}</Link>
            <Link to="/vs-chatgpt/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "Spaces مقابل ChatGPT" : "Spaces vs ChatGPT"}</Link>
            <Link to="/zaki-vs-openclaw/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "زكي مقابل OpenClaw" : "ZAKI vs OpenClaw"}</Link>
            <Link to="/best-arabic-ai-assistant/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "أفضل مساعد عربي" : "Best Arabic AI"}</Link>
          </div>
        </div>

        {/* Guides */}
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
            {isArabic ? "أدلة" : "Guides"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm text-zk-text-secondary">
            <Link to="/how-to/how-zaki-and-spaces-work/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "كيف يعمل زكي وSpaces" : "How it works"}</Link>
            <Link to="/how-to/what-to-use-spaces-for/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "متى تستخدم Spaces" : "Use Spaces for"}</Link>
            <Link to="/how-to/what-to-use-zaki-for/" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">{isArabic ? "متى تستخدم زكي" : "Use ZAKI for"}</Link>
          </div>
        </div>

        {/* Legal */}
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-zk-text-tertiary">
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
        <p className="text-xs text-zk-text-tertiary">
          © {new Date().getFullYear()}{" "}
          <a href="https://www.novanuggets.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-zk-text hover:underline decoration-zk-border-strong underline-offset-4">Nova Nuggets</a>.{" "}
          {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
