import { PRODUCT_CATALOG } from '../data/productCatalog';
import { lookupSuper } from '../data/superProducts';
import type { SuperChild } from '../data/superProducts';

export interface ValidationResult {
  valid: boolean;
  isSuper?: boolean;
  productName: string | null;
  productLine: string | null;
  price: number | null;
  currency: string | null;
  superChildren?: SuperChild[];
  error: string | null;
}

export function validateItem(articleCode: string, featureString: string): ValidationResult {
  const code    = String(articleCode    ?? '').trim();
  const feature = String(featureString  ?? '').trim();

  const sup = lookupSuper(code);
  if (sup) {
    return {
      valid: true,
      isSuper: true,
      productName: sup.productName,
      productLine: sup.productLine,
      price: sup.listPrice,
      currency: sup.currency,
      superChildren: sup.children,
      error: null,
    };
  }

  const variants = PRODUCT_CATALOG.filter(p => p.articleCode === code);

  if (variants.length === 0) {
    return {
      valid: false, productName: null, productLine: null, price: null, currency: null,
      error: `Article code "${code}" does not exist in the product catalog`,
    };
  }

  if (!feature) {
    const p = variants[0];
    return {
      valid: true,
      productName: p.productName || p.productLine,
      productLine: p.productLine,
      price: p.price,
      currency: p.currency || 'EUR',
      error: null,
    };
  }

  const exact = variants.find(p => p.featureString === feature);
  if (exact) {
    return {
      valid: true,
      productName: exact.productName || exact.productLine,
      productLine: exact.productLine,
      price: exact.price,
      currency: exact.currency || 'EUR',
      error: null,
    };
  }

  const validFeatures = variants.map(p => p.featureString).filter(Boolean);
  const featureDesc = validFeatures.length > 0
    ? ` Valid: ${validFeatures.slice(0, 2).map(f => `"${f}"`).join(', ')}${validFeatures.length > 2 ? ` (+${validFeatures.length - 2} more)` : ''}`
    : '';

  return {
    valid: false,
    productName: null,
    productLine: variants[0].productLine,
    price: null,
    currency: null,
    error: `Feature string "${feature}" is not a valid configuration for "${code}".${featureDesc}`,
  };
}
