import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './tokens.css';

import ImportPage      from './pages/Import/Import';
import OrderListPage   from './pages/OrderList/OrderList';
import OrderDetailPage from './pages/OrderDetail/OrderDetail';
import CatalogueAccessAdminPage from './pages/CatalogueAccessAdmin/CatalogueAccessAdmin';
import CatalogueGroupDetailPage from './pages/CatalogueGroupDetail/CatalogueGroupDetail';
import CustomerGroupDetailPage from './pages/CustomerGroupDetail/CustomerGroupDetail';
import NotificationManagerPage from './pages/NotificationManager/NotificationManager';

const router = createBrowserRouter([
  { path: '/',           element: <ImportPage /> },
  { path: '/orders',     element: <OrderListPage /> },
  { path: '/orders/:id', element: <OrderDetailPage /> },
  { path: '/admin/catalogue-access', element: <CatalogueAccessAdminPage /> },
  { path: '/admin/catalogue-access/catalogue-groups/:id', element: <CatalogueGroupDetailPage /> },
  { path: '/admin/catalogue-access/customer-groups/:id', element: <CustomerGroupDetailPage /> },
  { path: '/admin/notifications', element: <NotificationManagerPage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
