import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { BotPage } from "./pages/BotPage";
import { FaqPage } from "./pages/FaqPage";
import { StoryPage } from "./pages/StoryPage";
import { ComparisonPage } from "./pages/ComparisonPage";
import { HowToPage } from "./pages/HowToPage";
import { ContactPage } from "./pages/ContactPage";
import { LegalPage } from "./pages/LegalPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage locale="en" />} />
      <Route path="/ar" element={<HomePage locale="ar" />} />
      <Route path="/zaki-bot" element={<BotPage locale="en" />} />
      <Route path="/ar/zaki-bot" element={<BotPage locale="ar" />} />
      <Route path="/story" element={<StoryPage locale="en" />} />
      <Route path="/ar/story" element={<StoryPage locale="ar" />} />
      <Route path="/faq" element={<FaqPage locale="en" />} />
      <Route path="/ar/faq" element={<FaqPage locale="ar" />} />
      <Route path="/vs-chatgpt" element={<ComparisonPage slug="vs-chatgpt" />} />
      <Route path="/zaki-vs-spaces" element={<ComparisonPage slug="zaki-vs-spaces" />} />
      <Route path="/best-arabic-ai-assistant" element={<ComparisonPage slug="best-arabic-ai-assistant" />} />
      <Route path="/how-to/write-arabic-emails-ai" element={<HowToPage slug="write-arabic-emails-ai" />} />
      <Route path="/how-to/translate-dialects-arabic-english" element={<HowToPage slug="translate-dialects-arabic-english" />} />
      <Route path="/how-to/create-social-media-content-arabic" element={<HowToPage slug="create-social-media-content-arabic" />} />
      <Route path="/how-to/how-zaki-and-spaces-work" element={<HowToPage slug="how-zaki-and-spaces-work" />} />
      <Route path="/how-to/what-to-use-spaces-for" element={<HowToPage slug="what-to-use-spaces-for" />} />
      <Route path="/how-to/what-to-use-zaki-for" element={<HowToPage slug="what-to-use-zaki-for" />} />
      <Route path="/contact" element={<ContactPage locale="en" />} />
      <Route path="/ar/contact" element={<ContactPage locale="ar" />} />
      <Route path="/privacy" element={<LegalPage locale="en" slug="privacy" />} />
      <Route path="/ar/privacy" element={<LegalPage locale="ar" slug="privacy" />} />
      <Route path="/terms" element={<LegalPage locale="en" slug="terms" />} />
      <Route path="/ar/terms" element={<LegalPage locale="ar" slug="terms" />} />
      <Route path="/compliance" element={<LegalPage locale="en" slug="compliance" />} />
      <Route path="/ar/compliance" element={<LegalPage locale="ar" slug="compliance" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
