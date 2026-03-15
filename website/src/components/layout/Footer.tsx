import { Link } from "react-router-dom";
import type { Locale } from "../../lib/content";

export function Footer({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <footer className="mt-20 border-t border-line-strong py-10">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <Link to={isArabic ? "/ar/" : "/"} className="inline-flex items-center gap-2.5">
            <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-8 rounded-[7px]" />
            <span className="font-display text-lg font-extrabold tracking-[0.06em]">ZAKI</span>
          </Link>
          <p className="mt-4 max-w-[38ch] text-sm leading-7 text-chat-muted">
            {isArabic
              ? "دردشة عملية اليوم. ومشغّل ذكاء شخصي يتشكل علنًا."
              : "Practical chat now. A personal AI operator taking shape in public."}
          </p>
        </div>
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-chat-muted">
            {isArabic ? "المنتج" : "Product"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <a href="https://app.chatzaki.com/pricing?auth=signup&source=website_footer" className="transition-colors hover:text-chat-accent">ZAKI Chat</a>
            <Link to={isArabic ? "/ar/zaki-bot/" : "/zaki-bot/"} className="transition-colors hover:text-chat-accent">{isArabic ? "زكي" : "ZAKI"}</Link>
            <Link to={isArabic ? "/ar/story/" : "/story/"} className="transition-colors hover:text-chat-accent">{isArabic ? "حكايتنا" : "Our Story"}</Link>
            <Link to={isArabic ? "/ar/faq/" : "/faq/"} className="transition-colors hover:text-chat-accent">{isArabic ? "الأسئلة" : "FAQ"}</Link>
            <Link to={isArabic ? "/ar/vs-chatgpt/" : "/vs-chatgpt/"} className="transition-colors hover:text-chat-accent">{isArabic ? "ZAKI مقابل ChatGPT" : "ZAKI vs ChatGPT"}</Link>
            <Link to={isArabic ? "/ar/best-arabic-ai-assistant/" : "/best-arabic-ai-assistant/"} className="transition-colors hover:text-chat-accent">{isArabic ? "أفضل مساعد عربي" : "Best Arabic AI"}</Link>
          </div>
        </div>
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-chat-muted">
            {isArabic ? "القانون" : "Legal"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link to={isArabic ? "/ar/privacy/" : "/privacy/"} className="transition-colors hover:text-chat-accent">{isArabic ? "الخصوصية" : "Privacy"}</Link>
            <Link to={isArabic ? "/ar/terms/" : "/terms/"} className="transition-colors hover:text-chat-accent">{isArabic ? "الشروط" : "Terms"}</Link>
            <Link to={isArabic ? "/ar/contact/" : "/contact/"} className="transition-colors hover:text-chat-accent">{isArabic ? "تواصل" : "Contact"}</Link>
          </div>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1240px] border-t border-line-strong px-4 pt-6 md:px-8">
        <p className="text-xs text-chat-muted">
          © {new Date().getFullYear()} Nova Nuggets. {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
