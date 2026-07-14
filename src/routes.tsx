import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom';
import App from './app/App';
import {
  SkeletonBrainPage,
  SkeletonChatShell,
  SkeletonSettingsPage,
  SkeletonSpaceGrid,
} from './app/components/ui/skeleton';
import { ProductAccessGate } from './app/components/ProductAccessGate';
import { ProductLaunchPage } from './app/components/ProductLaunchPage';
import { useAuthStore } from './stores';
import { getCanonicalAppProductRoute, getProductLaunchState } from './lib/productRoutes';

function RouteFallback() {
  return <div className="min-h-screen bg-zaki-bg" aria-label="Loading route" />;
}

function routeSuspense(children: ReactNode, fallback: ReactNode = <RouteFallback />) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.assign(to);
  }, [to]);

  return <RouteFallback />;
}

function WebsiteRedirect({ to }: { to?: string }) {
  const location = useLocation();
  const target =
    to ||
    `https://chatzaki.com${location.pathname}${location.search}${location.hash}`;
  return <ExternalRedirect to={target} />;
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

const SettingsPage = lazy(() =>
  import('./app/components/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);

const DesignRoute = lazy(() =>
  import('./app/components/design/DesignRoute').then((m) => ({ default: m.DesignRoute })),
);

// Brain is the first lazy-loaded route: its WebGL "Galaxy" renderer (three +
// d3-force-3d) is heavy and only needed on /brain, so it is code-split into
// its own chunk and loaded on demand behind a Suspense fallback.
const BrainPage = lazy(() =>
  import('./app/components/brain/BrainPage').then((m) => ({ default: m.BrainPage })),
);

const AnonymousAgentPreview = lazy(() =>
  import('./app/components/agent/AnonymousAgentPreview').then((m) => ({
    default: m.AnonymousAgentPreview,
  })),
);

function HomeRoute() {
  return routeSuspense(<ChatArea />, <SkeletonChatShell />);
}

/**
 * WP-F (spec F5 + F7) — /agent resolves for an anonymous visitor instead of bouncing them into
 * a full-screen login wall.
 *
 * The fork is the safety boundary, and it is a fork rather than a flag on purpose. Signed in,
 * you get the real Agent workbench (ChatArea's agent surface: sessions, the agent engine, tools).
 * Signed out, you get the plan preview — a surface that talks to exactly one tool-less endpoint.
 * An anonymous visitor is never rendered into the workbench at all, so there is no
 * half-authenticated state in which its session provisioning or tool calls could fire.
 */
function AgentRoute() {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return routeSuspense(<AnonymousAgentPreview />, <SkeletonChatShell />);
  }
  return routeSuspense(<ChatArea />, <SkeletonChatShell />);
}

function ProductRoute({ locale = "en" }: { locale?: "en" | "ar" }) {
  const token = useAuthStore((state) => state.token);
  const { productId } = useParams();
  if (getProductLaunchState(productId) === "hidden") return <Navigate to="/" replace />;
  const appRoute = getCanonicalAppProductRoute(productId);
  if (token && appRoute) return <Navigate to={appRoute} replace />;
  return <ProductLaunchPage productId={productId} locale={locale} />;
}

function LegacyZakiBotRoute({ locale = "en" }: { locale?: "en" | "ar" }) {
  const token = useAuthStore((state) => state.token);
  if (token) return <Navigate to="/agent" replace />;
  return <WebsiteRedirect to={`https://chatzaki.com${locale === "ar" ? "/ar" : ""}/product`} />;
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
        element: <AgentRoute />, // Authed: Agent workbench. Anon: WP-F plan preview (F5/F7).
      },
      {
        path: 'spaces',
        element: routeSuspense(<ChatArea />, <SkeletonChatShell />), // Will show spaces view
      },
      {
        path: 'spaces/:spaceId',
        element: routeSuspense(<ChatArea />, <SkeletonChatShell />), // Will show space detail
      },
      {
        path: 'spaces/:spaceId/threads/:threadId',
        element: routeSuspense(<ChatArea />, <SkeletonChatShell />), // Will show chat view
      },
      {
        path: 'about',
        element: routeSuspense(<ChatArea />, <SkeletonChatShell />),
      },
      {
        path: 'reset',
        element: routeSuspense(<ChatArea />, <SkeletonChatShell />),
      },
      {
        path: 'artifact/:shareCode',
        element: routeSuspense(<SharedArtifact />),
      },
      {
        path: 'pricing',
        element: routeSuspense(<PricingPage />, <SkeletonSpaceGrid />),
      },
      {
        path: 'pricing/success',
        element: routeSuspense(<BillingSuccessPage />, <SkeletonSpaceGrid />),
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
        element: <WebsiteRedirect />,
      },
      {
        path: 'faq',
        element: <WebsiteRedirect />,
      },
      {
        path: 'contact',
        element: <WebsiteRedirect />,
      },
      {
        path: 'autism-guidance',
        element: <WebsiteRedirect />,
      },
      {
        path: 'vs-chatgpt',
        element: <WebsiteRedirect />,
      },
      {
        path: 'zaki-vs-spaces',
        element: <WebsiteRedirect />,
      },
      {
        path: 'best-arabic-ai-assistant',
        element: <WebsiteRedirect />,
      },
      {
        path: 'zaki-vs-openclaw',
        element: <WebsiteRedirect />,
      },
      {
        path: 'how-to/:slug',
        element: <WebsiteRedirect />,
      },
      {
        path: 'privacy',
        element: <WebsiteRedirect />,
      },
      {
        path: 'terms',
        element: <WebsiteRedirect />,
      },
      {
        path: 'compliance',
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar',
        element: <WebsiteRedirect />,
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
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar/faq',
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar/contact',
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar/autism-guidance',
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar/privacy',
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar/terms',
        element: <WebsiteRedirect />,
      },
      {
        path: 'ar/compliance',
        element: <WebsiteRedirect />,
      },
      {
        path: 'help',
        element: routeSuspense(<HelpPage />),
      },
      {
        path: 'legal',
        element: <ExternalRedirect to="https://chatzaki.com/compliance" />,
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
        element: routeSuspense(<SettingsPage />, <SkeletonSettingsPage />),
      },
      {
        // Legacy alias for the Spaces lane. The lane is named "Spaces" everywhere, but old
        // links/bookmarks still point at /chat — redirect instead of leaving a dead URL.
        path: 'chat',
        element: <Navigate to="/spaces" replace />,
      },
      {
        path: 'chat/*',
        element: <Navigate to="/spaces" replace />,
      },
      {
        path: 'learn',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'hire',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'design',
        element: routeSuspense(<DesignRoute />),
      },
      {
        path: 'minutes',
        element: routeSuspense(
          <ProductAccessGate
            productId="minutes"
            title="ZAKI Minutes"
            mode="coming_soon"
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
    element: <ExternalRedirect to="https://chatzaki.com/compliance" />,
  },
  {
    // Catch-all redirect
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
