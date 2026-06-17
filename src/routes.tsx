import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import App from './app/App';
import { SkeletonBrainPage } from './app/components/ui/skeleton';
import { ProductAccessGate } from './app/components/ProductAccessGate';
import { useAuthStore } from './stores';
import { getCanonicalAppProductRoute } from './lib/productRoutes';

function RouteFallback() {
  return <div className="min-h-screen bg-zaki-bg" aria-label="Loading route" />;
}

function routeSuspense(children: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

const ChatArea = lazy(() =>
  import('./app/components/ChatArea').then((m) => ({ default: m.ChatArea })),
);

const SharedArtifact = lazy(() =>
  import('./app/components/SharedArtifact').then((m) => ({ default: m.SharedArtifact })),
);

const SharedConversation = lazy(() =>
  import('./app/components/SharedConversation').then((m) => ({ default: m.SharedConversation })),
);

const PricingPage = lazy(() =>
  import('./app/components/PricingPage').then((m) => ({ default: m.PricingPage })),
);

const BillingSuccessPage = lazy(() =>
  import('./app/components/BillingSuccessPage').then((m) => ({ default: m.BillingSuccessPage })),
);

const AdminAccessCodesPage = lazy(() =>
  import('./app/components/admin/AdminAccessCodesPage').then((m) => ({ default: m.AdminAccessCodesPage })),
);

const HelpPage = lazy(() =>
  import('./app/components/HelpPage').then((m) => ({ default: m.HelpPage })),
);

const LegalPage = lazy(() =>
  import('./app/components/LegalPage').then((m) => ({ default: m.LegalPage })),
);

const SettingsPage = lazy(() =>
  import('./app/components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

const WebsiteHomePage = lazy(() =>
  import('./app/components/WebsitePage').then((m) => ({ default: m.WebsiteHomePage })),
);

const WebsiteProductPage = lazy(() =>
  import('./app/components/WebsitePage').then((m) => ({ default: m.WebsiteProductPage })),
);

const WebsiteShell = lazy(() =>
  import('./app/components/WebsitePage').then((m) => ({ default: m.WebsiteShell })),
);

const WebsiteAutismGuidancePage = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteAutismGuidancePage })),
);

const WebsiteComparisonPage = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteComparisonPage })),
);

const WebsiteContactPage = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteContactPage })),
);

const WebsiteFaqPage = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteFaqPage })),
);

const WebsiteHowToRoute = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteHowToRoute })),
);

const WebsiteStoryPage = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteStoryPage })),
);

const WebsiteStoryPageAr = lazy(() =>
  import('./app/components/MarketingContentPages').then((m) => ({ default: m.WebsiteStoryPageAr })),
);

// Brain is the first lazy-loaded route: its WebGL "Galaxy" renderer (three +
// d3-force-3d) is heavy and only needed on /brain, so it is code-split into
// its own chunk and loaded on demand behind a Suspense fallback.
const BrainPage = lazy(() =>
  import('./app/components/brain/BrainPage').then((m) => ({ default: m.BrainPage })),
);

function HomeRoute() {
  return routeSuspense(<ChatArea />);
}

function ProductRoute({ locale = "en" }: { locale?: "en" | "ar" }) {
  const token = useAuthStore((state) => state.token);
  const { productId } = useParams();
  const appRoute = getCanonicalAppProductRoute(productId);
  if (token && appRoute) return <Navigate to={appRoute} replace />;
  return routeSuspense(<WebsiteProductPage locale={locale} />);
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
  return routeSuspense(<AdminAccessCodesPage />);
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
        element: <HomeRoute />, // Command dashboard for anonymous and signed-in users
      },
      {
        path: 'agent',
        element: routeSuspense(<ChatArea />), // Authenticated Agent workbench
      },
      {
        path: 'spaces',
        element: routeSuspense(<ChatArea />), // Will show spaces view
      },
      {
        path: 'spaces/:spaceId',
        element: routeSuspense(<ChatArea />), // Will show space detail
      },
      {
        path: 'spaces/:spaceId/threads/:threadId',
        element: routeSuspense(<ChatArea />), // Will show chat view
      },
      {
        path: 'about',
        element: routeSuspense(<ChatArea />),
      },
      {
        path: 'reset',
        element: routeSuspense(<ChatArea />),
      },
      {
        path: 'artifact/:shareCode',
        element: routeSuspense(<SharedArtifact />),
      },
      {
        path: 'pricing',
        element: routeSuspense(
          <WebsiteShell>
            <PricingPage />
          </WebsiteShell>
        ),
      },
      {
        path: 'pricing/success',
        element: routeSuspense(<BillingSuccessPage />),
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
        element: routeSuspense(<WebsiteStoryPage />),
      },
      {
        path: 'faq',
        element: routeSuspense(<WebsiteFaqPage />),
      },
      {
        path: 'contact',
        element: routeSuspense(<WebsiteContactPage />),
      },
      {
        path: 'autism-guidance',
        element: routeSuspense(<WebsiteAutismGuidancePage />),
      },
      {
        path: 'vs-chatgpt',
        element: routeSuspense(<WebsiteComparisonPage slug="vs-chatgpt" />),
      },
      {
        path: 'zaki-vs-spaces',
        element: routeSuspense(<WebsiteComparisonPage slug="zaki-vs-spaces" />),
      },
      {
        path: 'best-arabic-ai-assistant',
        element: routeSuspense(<WebsiteComparisonPage slug="best-arabic-ai-assistant" />),
      },
      {
        path: 'zaki-vs-openclaw',
        element: routeSuspense(<WebsiteComparisonPage slug="zaki-vs-openclaw" />),
      },
      {
        path: 'how-to/:slug',
        element: routeSuspense(<WebsiteHowToRoute />),
      },
      {
        path: 'privacy',
        element: routeSuspense(<LegalPage slug="privacy" />),
      },
      {
        path: 'terms',
        element: routeSuspense(<LegalPage slug="terms" />),
      },
      {
        path: 'compliance',
        element: routeSuspense(<LegalPage slug="compliance" />),
      },
      {
        path: 'ar',
        element: routeSuspense(<WebsiteHomePage locale="ar" />),
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
        element: routeSuspense(<WebsiteStoryPageAr />),
      },
      {
        path: 'ar/faq',
        element: routeSuspense(<WebsiteFaqPage locale="ar" />),
      },
      {
        path: 'ar/contact',
        element: routeSuspense(<WebsiteContactPage locale="ar" />),
      },
      {
        path: 'ar/autism-guidance',
        element: routeSuspense(<WebsiteAutismGuidancePage locale="ar" />),
      },
      {
        path: 'ar/privacy',
        element: routeSuspense(<LegalPage slug="privacy" />),
      },
      {
        path: 'ar/terms',
        element: routeSuspense(<LegalPage slug="terms" />),
      },
      {
        path: 'ar/compliance',
        element: routeSuspense(<LegalPage slug="compliance" />),
      },
      {
        path: 'help',
        element: routeSuspense(<HelpPage />),
      },
      {
        path: 'legal',
        element: routeSuspense(<LegalPage />),
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
        element: routeSuspense(<SettingsPage />),
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
        element: routeSuspense(
          <ProductAccessGate
            productId="hire"
            title="ZAKI Career"
            mode="private_beta"
          />
        ),
      },
      {
        path: 'design',
        element: routeSuspense(
          <ProductAccessGate
            productId="design"
            title="ZAKI Design"
            mode="waitlist"
          />
        ),
      },
    ],
  },
  {
    // Public share route (outside of App layout)
    path: '/share/:token',
    element: routeSuspense(<SharedConversation />),
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
