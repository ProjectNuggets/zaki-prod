import { Link } from "react-router-dom";
import type { Locale } from "../../lib/content";

export function Footer({ locale }: { locale: Locale }) {
  const isArabic = locale === "ar";

  return (
    <footer className="mt-20 border-t border-line-strong py-10">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1.45fr_0.95fr_1fr_1fr_0.9fr] md:px-8">
        <div>
          <Link to={isArabic ? "/ar/" : "/"} className="inline-flex items-center gap-2.5">
            <img src="/assets/zaki-logo.png" alt="ZAKI" className="size-8 rounded-[7px]" />
            <span className="font-display text-lg font-extrabold tracking-[0.06em]">ZAKI</span>
          </Link>
          <p className="mt-4 max-w-[38ch] text-sm leading-7 text-chat-muted">
            {isArabic
              ? "Spaces للعمل المنظّم اليوم. وزكي لاختبار الذكاء الشخصي المستمر علنًا."
              : "Spaces for structured work now. ZAKI for testing persistent personal intelligence in public."}
          </p>
        </div>
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-chat-muted">
            {isArabic ? "المنتج" : "Product"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <a href="https://app.chatzaki.com/?auth=signup&source=website_footer" className="transition-colors hover:text-chat-accent">{isArabic ? "Spaces (حاليًا ZAKI Chat)" : "Spaces (currently ZAKI Chat)"}</a>
            <Link to={isArabic ? "/ar/zaki-bot/" : "/zaki-bot/"} className="transition-colors hover:text-chat-accent">{isArabic ? "زكي" : "ZAKI"}</Link>
            <Link to={isArabic ? "/ar/story/" : "/story/"} className="transition-colors hover:text-chat-accent">{isArabic ? "لماذا زكي" : "Why ZAKI"}</Link>
            <Link to={isArabic ? "/ar/faq/" : "/faq/"} className="transition-colors hover:text-chat-accent">{isArabic ? "الأسئلة" : "FAQ"}</Link>
          </div>
        </div>
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-chat-muted">
            {isArabic ? "مقارنات وقراءات" : "Read more"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link to="/zaki-vs-spaces/" className="transition-colors hover:text-chat-accent">{isArabic ? "زكي مقابل Spaces" : "ZAKI vs Spaces"}</Link>
            <Link to="/vs-chatgpt/" className="transition-colors hover:text-chat-accent">{isArabic ? "Spaces مقابل ChatGPT" : "Spaces vs ChatGPT"}</Link>
            <Link to="/zaki-vs-openclaw/" className="transition-colors hover:text-chat-accent">{isArabic ? "زكي مقابل OpenClaw" : "ZAKI vs OpenClaw"}</Link>
            <Link to="/best-arabic-ai-assistant/" className="transition-colors hover:text-chat-accent">{isArabic ? "أفضل مساعد عربي" : "Best Arabic AI Assistant"}</Link>
          </div>
        </div>
        <div>
          <p className="font-mono-ui text-[11px] uppercase tracking-[0.24em] text-chat-muted">
            {isArabic ? "أدلة الاستخدام" : "Guides"}
          </p>
          <div className="mt-4 flex flex-col gap-2.5 text-sm">
            <Link to="/how-to/how-zaki-and-spaces-work/" className="transition-colors hover:text-chat-accent">{isArabic ? "كيف يعمل زكي وSpaces" : "How ZAKI and Spaces work together"}</Link>
            <Link to="/how-to/what-to-use-spaces-for/" className="transition-colors hover:text-chat-accent">{isArabic ? "متى تستخدم Spaces" : "What to use Spaces for"}</Link>
            <Link to="/how-to/what-to-use-zaki-for/" className="transition-colors hover:text-chat-accent">{isArabic ? "متى تستخدم زكي" : "What to use ZAKI for"}</Link>
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
