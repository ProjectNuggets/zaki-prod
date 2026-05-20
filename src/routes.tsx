import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './app/App';
import { ChatArea } from './app/components/ChatArea';
import { SharedConversation } from './app/components/SharedConversation';
import { PricingPage } from './app/components/PricingPage';
import { BillingSuccessPage } from './app/components/BillingSuccessPage';
import { AdminAccessCodesPage } from './app/components/admin/AdminAccessCodesPage';
import { HelpPage } from './app/components/HelpPage';
import { LegalPage } from './app/components/LegalPage';
import { BrainPage } from './app/components/brain/BrainPage';
import { LearningPage } from './app/components/learning/LearningPage';
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

function HomeRoute() {
  const token = useAuthStore((state) => state.token);
  return token ? <ChatArea /> : <WebsiteHomePage />;
}

/**
 * Route structure:
 * /                        → Home/ZAKI landing
 * /spaces                  → Spaces list view
 * /spaces/:spaceId         → Space detail view
 * /spaces/:spaceId/threads/:threadId → Thread/chat view
 * /reset?token=...         → Password reset entry (shows reset form in LoginScreen)
 * /share/:token            → Public shared conversation view
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
        element: <WebsiteProductPage />,
      },
      {
        path: 'zaki-bot',
        element: <Navigate to="/products/agent" replace />,
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
        element: <WebsiteProductPage locale="ar" />,
      },
      {
        path: 'ar/zaki-bot',
        element: <Navigate to="/ar/products/agent" replace />,
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
        element: <AdminAccessCodesPage />,
      },
      {
        path: 'brain',
        element: <BrainPage />,
      },
      {
        path: 'learn',
        element: <LearningPage />,
      },
      {
        path: 'hire',
        element: <HirePage />,
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
