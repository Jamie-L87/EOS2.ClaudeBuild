/* ------------------------------------------------------------------ */
/*  Delivery address gating                                            */
/*  One rule shared by every order page variant: these four parts of   */
/*  the delivery address must be present before an order can submit.   */
/* ------------------------------------------------------------------ */
export interface DeliveryAddressParts {
  deliveryLine1?: string | null;
  deliveryCounty?: string | null;
  deliveryPostcode?: string | null;
  deliveryCountry?: string | null;
}

/** What is still missing from the delivery address, with the field to jump to. */
export function missingDelivery(o: DeliveryAddressParts): Array<{ label: string; fieldId: string }> {
  const out: Array<{ label: string; fieldId: string }> = [];
  if (!o.deliveryLine1)    out.push({ label: 'address line 1', fieldId: 'op-delivery-line1' });
  if (!o.deliveryCounty)   out.push({ label: 'county',         fieldId: 'op-delivery-county' });
  if (!o.deliveryPostcode) out.push({ label: 'postcode',       fieldId: 'op-delivery-postcode' });
  if (!o.deliveryCountry)  out.push({ label: 'country',        fieldId: 'op-delivery-country' });
  return out;
}
