import { createBrowserRouter, Navigate } from 'react-router-dom';
import App from './app/App';
import { ChatArea } from './app/components/ChatArea';

/**
 * Route structure:
 * /                        → Home/ZAKI landing
 * /spaces                  → Spaces list view
 * /spaces/:spaceId         → Space detail view
 * /spaces/:spaceId/threads/:threadId → Thread/chat view
 * /library                 → Document library
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
        // Catch-all redirect
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
