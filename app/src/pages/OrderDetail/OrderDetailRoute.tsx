import { useVariant } from '../../hooks/useVariant';
import OrderDetailPage from './OrderDetail';
import OrderDetailSidePanelPage from './OrderDetailSidePanel';

/**
 * Chooses which order page layout to show (A/B test, see variants.ts).
 * A = the original order page. B = order details in a side panel, with promise dates and delivery charges.
 */
export default function OrderDetailRoute() {
  const variant = useVariant('orderPage');
  return variant === 'b' ? <OrderDetailSidePanelPage /> : <OrderDetailPage />;
}
