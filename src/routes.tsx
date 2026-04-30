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
        element: <ChatArea />, // Will show home view by default
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
        element: <PricingPage />,
      },
      {
        path: 'pricing/success',
        element: <BillingSuccessPage />,
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
