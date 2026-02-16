import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './app/App';
import { ChatArea } from './app/components/ChatArea';
import { SharedConversation } from './app/components/SharedConversation';
import { PricingPage } from './app/components/PricingPage';

/**
 * Route structure:
 * /                        → Home/ZAKI landing
 * /spaces                  → Spaces list view
 * /spaces/:spaceId         → Space detail view
 * /spaces/:spaceId/threads/:threadId → Thread/chat view
 * /library                 → Document library
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
        path: 'library',
        element: <ChatArea />, // Will show library view
      },
      {
        path: 'pricing',
        element: <PricingPage />,
      },
    ],
  },
  {
    // Public share route (outside of App layout)
    path: '/share/:token',
    element: <SharedConversation />,
  },
  {
    // Catch-all redirect
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
