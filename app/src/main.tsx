import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './tokens.css';

import ImportPage      from './pages/Import/Import';
import OrderListPage   from './pages/OrderList/OrderList';
import OrderDetailPage from './pages/OrderDetail/OrderDetail';

const router = createBrowserRouter([
  { path: '/',           element: <ImportPage /> },
  { path: '/orders',     element: <OrderListPage /> },
  { path: '/orders/:id', element: <OrderDetailPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
