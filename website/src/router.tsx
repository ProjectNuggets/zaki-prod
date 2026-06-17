import { Navigate, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/Home";
import { FaqPage } from "./pages/FaqPage";
import { StoryPage } from "./pages/StoryPage";
import { ProductPage } from "./pages/ProductPage";
import { PricingPage } from "./pages/PricingPage";
import { UseCasesPage } from "./pages/UseCasesPage";
import { ContactPage } from "./pages/ContactPage";
import { LegalPage } from "./pages/LegalPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage locale="en" />} />
      <Route path="/ar" element={<HomePage locale="ar" />} />
      <Route path="/product" element={<ProductPage locale="en" />} />
      <Route path="/ar/product" element={<ProductPage locale="ar" />} />
      <Route path="/pricing" element={<PricingPage locale="en" />} />
      <Route path="/ar/pricing" element={<PricingPage locale="ar" />} />
      <Route path="/use-cases" element={<UseCasesPage locale="en" />} />
      <Route path="/ar/use-cases" element={<UseCasesPage locale="ar" />} />
      <Route path="/zaki-bot" element={<Navigate to="/product" replace />} />
      <Route path="/ar/zaki-bot" element={<Navigate to="/ar/product" replace />} />
      <Route path="/story" element={<StoryPage locale="en" />} />
      <Route path="/ar/story" element={<StoryPage locale="ar" />} />
      <Route path="/autism-guidance" element={<Navigate to="/use-cases" replace />} />
      <Route path="/ar/autism-guidance" element={<Navigate to="/ar/use-cases" replace />} />
      <Route path="/faq" element={<FaqPage locale="en" />} />
      <Route path="/ar/faq" element={<FaqPage locale="ar" />} />
      <Route path="/vs-chatgpt" element={<Navigate to="/product" replace />} />
      <Route path="/zaki-vs-spaces" element={<Navigate to="/product" replace />} />
      <Route path="/best-arabic-ai-assistant" element={<Navigate to="/use-cases" replace />} />
      <Route path="/zaki-vs-openclaw" element={<Navigate to="/product" replace />} />
      <Route path="/how-to/*" element={<Navigate to="/use-cases" replace />} />
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
