import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import App from './app/App';
import { ChatArea } from './app/components/ChatArea';
import { SharedArtifact } from './app/components/SharedArtifact';
import { SharedConversation } from './app/components/SharedConversation';
import { PricingPage } from './app/components/PricingPage';
import { BillingSuccessPage } from './app/components/BillingSuccessPage';
import { AdminAccessCodesPage } from './app/components/admin/AdminAccessCodesPage';
import { HelpPage } from './app/components/HelpPage';
import { LegalPage } from './app/components/LegalPage';
import { SkeletonBrainPage } from './app/components/ui/skeleton';
import { DesignPage } from './app/components/design/DesignPage';
import { SettingsPage } from './app/components/settings/SettingsPage';
import { ProductAccessGate } from './app/components/ProductAccessGate';
import { HirePage } from './app/components/hire/HirePage';
import { WebsiteHomePage, WebsiteProductPage, WebsiteShell } from './app/components/WebsitePage';
import {
  WebsiteAutismGuidancePage,
  WebsiteComparisonPage,
  WebsiteContactPage,
  WebsiteFaqPage,
  WebsiteHowToRoute,
  WebsiteStoryPage,
  WebsiteStoryPageAr,
} from './app/components/MarketingContentPages';
import { useAuthStore } from './stores';
import { getCanonicalAppProductRoute } from './lib/productRoutes';

// Brain is the first lazy-loaded route: its WebGL "Galaxy" renderer (three +
// d3-force-3d) is heavy and only needed on /brain, so it is code-split into
// its own chunk and loaded on demand behind a Suspense fallback.
const BrainPage = lazy(() =>
  import('./app/components/brain/BrainPage').then((m) => ({ default: m.BrainPage })),
);

function HomeRoute() {
  const token = useAuthStore((state) => state.token);
  return token ? <ChatArea /> : <WebsiteHomePage />;
}

function ProductRoute({ locale = "en" }: { locale?: "en" | "ar" }) {
  const token = useAuthStore((state) => state.token);
  const { productId } = useParams();
  const appRoute = getCanonicalAppProductRoute(productId);
  if (token && appRoute) return <Navigate to={appRoute} replace />;
  return <WebsiteProductPage locale={locale} />;
}

function LegacyZakiBotRoute({ locale = "en" }: { locale?: "en" | "ar" }) {
  const token = useAuthStore((state) => state.token);
  if (token) return <Navigate to="/agent" replace />;
  return <Navigate to={locale === "ar" ? "/ar/products/agent" : "/products/agent"} replace />;
}

function InternalOperatorRoute() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const email = String(user?.username || "").trim().toLowerCase();
  if (!token) return <Navigate to="/" replace />;
  if (email !== "as@novanuggets.com") return <Navigate to="/" replace />;
  return <AdminAccessCodesPage />;
}

/**
 * Route structure:
 * /                        → Home/ZAKI landing
 * /spaces                  → Spaces list view
 * /spaces/:spaceId         → Space detail view
 * /spaces/:spaceId/threads/:threadId → Thread/chat view
 * /reset?token=...         → Password reset entry (shows reset form in LoginScreen)
 * /share/:token            → Public shared conversation view
 * /artifact/:shareCode     → Public shared Agent artifact view
 */

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomeRoute />, // Public website for guests, app home for signed-in users
      },
      {
        path: 'agent',
        element: <ChatArea />, // Authenticated Agent workbench
      },
      {
        path: 'spaces',
        element: <ChatArea />, // Will show spaces view
      },
      {
        path: 'spaces/:spaceId',
        element: <ChatArea />, // Will show space detail
      },
      {
        path: 'spaces/:spaceId/threads/:threadId',
        element: <ChatArea />, // Will show chat view
      },
      {
        path: 'about',
        element: <ChatArea />,
      },
      {
        path: 'reset',
        element: <ChatArea />,
      },
      {
        path: 'artifact/:shareCode',
        element: <SharedArtifact />,
      },
      {
        path: 'pricing',
        element: (
          <WebsiteShell>
            <PricingPage />
          </WebsiteShell>
        ),
      },
      {
        path: 'pricing/success',
        element: <BillingSuccessPage />,
      },
      {
        path: 'products/:productId',
        element: <ProductRoute />,
      },
      {
        path: 'zaki-bot',
        element: <LegacyZakiBotRoute />,
      },
      {
        path: 'story',
        element: <WebsiteStoryPage />,
      },
      {
        path: 'faq',
        element: <WebsiteFaqPage />,
      },
      {
        path: 'contact',
        element: <WebsiteContactPage />,
      },
      {
        path: 'autism-guidance',
        element: <WebsiteAutismGuidancePage />,
      },
      {
        path: 'vs-chatgpt',
        element: <WebsiteComparisonPage slug="vs-chatgpt" />,
      },
      {
        path: 'zaki-vs-spaces',
        element: <WebsiteComparisonPage slug="zaki-vs-spaces" />,
      },
      {
        path: 'best-arabic-ai-assistant',
        element: <WebsiteComparisonPage slug="best-arabic-ai-assistant" />,
      },
      {
        path: 'zaki-vs-openclaw',
        element: <WebsiteComparisonPage slug="zaki-vs-openclaw" />,
      },
      {
        path: 'how-to/:slug',
        element: <WebsiteHowToRoute />,
      },
      {
        path: 'privacy',
        element: <Navigate to="/legal" replace />,
      },
      {
        path: 'terms',
        element: <Navigate to="/legal" replace />,
      },
      {
        path: 'compliance',
        element: <Navigate to="/legal" replace />,
      },
      {
        path: 'ar',
        element: <WebsiteHomePage locale="ar" />,
      },
      {
        path: 'ar/products/:productId',
        element: <ProductRoute locale="ar" />,
      },
      {
        path: 'ar/zaki-bot',
        element: <LegacyZakiBotRoute locale="ar" />,
      },
      {
        path: 'ar/story',
        element: <WebsiteStoryPageAr />,
      },
      {
        path: 'ar/faq',
        element: <WebsiteFaqPage locale="ar" />,
      },
      {
        path: 'ar/contact',
        element: <WebsiteContactPage locale="ar" />,
      },
      {
        path: 'ar/autism-guidance',
        element: <WebsiteAutismGuidancePage locale="ar" />,
      },
      {
        path: 'ar/privacy',
        element: <Navigate to="/legal" replace />,
      },
      {
        path: 'ar/terms',
        element: <Navigate to="/legal" replace />,
      },
      {
        path: 'ar/compliance',
        element: <Navigate to="/legal" replace />,
      },
      {
        path: 'help',
        element: <HelpPage />,
      },
      {
        path: 'legal',
        element: <LegalPage />,
      },
      {
        path: 'internal/admin-access-codes',
        element: <InternalOperatorRoute />,
      },
      {
        path: 'internal/operator',
        element: <InternalOperatorRoute />,
      },
      {
        path: 'brain',
        element: (
          <Suspense fallback={<SkeletonBrainPage />}>
            <BrainPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'learn',
        element: (
          <ProductAccessGate
            productId="learning"
            title="ZAKI Learn"
            mode="private_beta"
          />
        ),
      },
      {
        path: 'hire',
        element: (
          <ProductAccessGate
            productId="hire"
            title="ZAKI Hire"
            mode="private_beta"
          >
            <HirePage />
          </ProductAccessGate>
        ),
      },
      {
        path: 'design',
        element: (
          <ProductAccessGate
            productId="design"
            title="ZAKI Design"
            mode="waitlist"
          >
            <DesignPage />
          </ProductAccessGate>
        ),
      },
    ],
  },
  {
    // Public share route (outside of App layout)
    path: '/share/:token',
    element: <SharedConversation />,
  },
  {
    // Backward-compatible alias
    path: '/public/legal',
    element: <Navigate to="/legal" replace />,
  },
  {
    // Catch-all redirect
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
