import { productCatalog } from '../utils/productCatalog'

/**
 * Validates a single basket item against the local product catalog.
 *
 * @param {string} articleCode
 * @param {string} featureString
 * @returns {{ valid: boolean, productName: string|null, productLine: string|null, price: number|null, error: string|null }}
 */
export function validateItem(articleCode, featureString) {
  const code = articleCode.trim()
  const feature = featureString.trim()

  // Check article code exists at all
  const variants = productCatalog.filter((p) => p.articleCode === code)

  if (variants.length === 0) {
    return {
      valid: false,
      productName: null,
      productLine: null,
      price: null,
      error: `Article code "${code}" does not exist in the product catalog`,
    }
  }

  // If no feature string provided, accept if any variant exists
  if (!feature) {
    const p = variants[0]
    return {
      valid: true,
      productName: p.productName || p.productLine,
      productLine: p.productLine,
      price: p.price,
      error: null,
    }
  }

  // Check exact article code + feature string combination
  const exact = variants.find((p) => p.featureString === feature)

  if (exact) {
    return {
      valid: true,
      productName: exact.productName || exact.productLine,
      productLine: exact.productLine,
      price: exact.price,
      error: null,
    }
  }

  // Article code exists but feature string doesn't match any variant
  const validFeatures = variants.map((p) => p.featureString).filter(Boolean)
  const featureDesc = validFeatures.length > 0
    ? ` Valid configurations: ${validFeatures.slice(0, 3).map((f) => `"${f}"`).join(', ')}${validFeatures.length > 3 ? ` (+${validFeatures.length - 3} more)` : ''}`
    : ''

  return {
    valid: false,
    productName: null,
    productLine: variants[0].productLine,
    price: null,
    error: `Feature string "${feature}" is not a valid configuration for article code "${code}".${featureDesc}`,
  }
}

/**
 * Validates an array of basket items against the local catalog, one by one.
 * Calls onResult for each item as it completes (line-by-line feedback).
 *
 * @param {Array<{id: string, articleCode: string, featureString: string}>} items
 * @param {function({id: string, result: Object}): void} onResult - callback per item
 */
export async function validateBasketItems(items, onResult) {
  for (const item of items) {
    // Small async yield between items so the UI can re-render each result
    await new Promise((resolve) => setTimeout(resolve, 80))
    const result = validateItem(item.articleCode, item.featureString)
    onResult({ id: item.id, result })
  }
}
