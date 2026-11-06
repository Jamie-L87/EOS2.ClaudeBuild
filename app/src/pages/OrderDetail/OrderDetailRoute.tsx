import { useVariant } from '../../hooks/useVariant';
import OrderDetailPage from './OrderDetail';
import OrderDetailSidePanelPage from './OrderDetailSidePanel';
import OrderDetailTabsPage from './OrderDetailTabs';

/**
 * Chooses which order page layout to show (A/B/C test, see variants.ts).
 * A = the original order page.
 * B = order details in a side panel, with promise dates and delivery charges.
 * C = EOS 1 style: Order Details on their own tab, checked and submitted from a button bar.
 */
export default function OrderDetailRoute() {
  const variant = useVariant('orderPage');
  if (variant === 'b') return <OrderDetailSidePanelPage />;
  if (variant === 'c') return <OrderDetailTabsPage />;
  return <OrderDetailPage />;
}
