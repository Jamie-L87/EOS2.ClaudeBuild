import { useState, useCallback, useEffect, useRef } from 'react'
import { lookupItem } from '../services/api'
import { validateBasketItems } from '../services/validationService'

let _idCounter = 0
const uid = () => `item-${++_idCounter}-${Date.now()}`

/**
 * Manages the temporary import basket.
 *
 * Each entry:
 *   { id, articleCode, featureString, qty, productName, lookupStatus, listPrice, validationIssues, validationWarnings }
 *   lookupStatus: 'idle' | 'loading' | 'found' | 'not-found' | 'error'
 *   validationIssues: Array of error objects with type, message, severity
 *   validationWarnings: Array of warning objects
 *
 * Duplicates are kept as separate lines.
 */
export function useBasket() {
  const [items, setItems] = useState([])
  // Track which IDs already have an in-flight or completed lookup
  const lookedUp = useRef(new Set())

  /** Add an array of { articleCode, featureString, qty } — always as new lines. */
  const addItems = useCallback((incoming) => {
    const newItems = []
    for (const { articleCode, featureString = '', qty, listPrice = 0 } of incoming) {
      const code = articleCode.trim()
      if (!code) continue
      newItems.push({
        id: uid(),
        articleCode: code,
        featureString: featureString.trim(),
        qty,
        listPrice,
        productName: null,
        lookupStatus: 'idle',
        validationStatus: 'pending', // 'pending' | 'passed' | 'failed'
        validationError: null,
        validationIssues: [],
        validationWarnings: [],
      })
    }
    setItems((prev) => {
      const next = [...prev, ...newItems]
      // Run catalog validation after state settles
      setTimeout(() => {
        validateBasketItems(newItems, ({ id, result }) => {
          setItems((current) =>
            current.map((i) => {
              if (i.id !== id) return i
              return {
                ...i,
                validationStatus: result.valid ? 'passed' : 'failed',
                validationError: result.error,
                // Backfill price and product name from catalog if not already set
                listPrice: i.listPrice || result.price || 0,
                productName: result.valid ? result.productName : null,
              }
            })
          )
        })
      }, 0)
      return next
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const updateQty = useCallback((id, qty) => {
    const v = Math.max(1, parseInt(qty, 10) || 1)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: v } : i)))
  }, [])

  const clearBasket = useCallback(() => {
    setItems([])
    lookedUp.current.clear()
  }, [])

  const copyItem = useCallback((id) => {
    setItems((prev) => {
      const itemToCopy = prev.find((i) => i.id === id)
      if (!itemToCopy) return prev
      
      // Create a new item with the same data but a new ID
      const newItem = {
        ...itemToCopy,
        id: uid(),
      }
      
      // Find the index of the original item and insert after it
      const itemIndex = prev.findIndex((i) => i.id === id)
      const result = [...prev]
      result.splice(itemIndex + 1, 0, newItem)
      return result
    })
  }, [])

  const updateArticleCode = useCallback((id, newCode) => {
    const trimmed = newCode.trim()
    if (!trimmed) return
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (!item || item.articleCode === trimmed) return prev
      // Value changed: update and re-validate
      const updated = prev.map((i) => i.id === id ? { ...i, articleCode: trimmed } : i)
      lookedUp.current.delete(id)
      const updatedItem = { ...item, articleCode: trimmed }
      setTimeout(() => {
        validateBasketItems([updatedItem], ({ id: vid, result }) => {
          setItems((cur) => cur.map((i) => i.id !== vid ? i : {
            ...i,
            validationStatus: result.valid ? 'passed' : 'failed',
            validationError: result.error,
            productName: result.valid ? result.productName : null,
            listPrice: i.listPrice || result.price || 0,
          }))
        })
      }, 0)
      return updated
    })
  }, [])

  const updateFeatureString = useCallback((id, newFeature) => {
    const trimmed = newFeature.trim()
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (!item || item.featureString === trimmed) return prev
      // Value changed: update and re-validate
      const updated = prev.map((i) => i.id === id ? { ...i, featureString: trimmed } : i)
      lookedUp.current.delete(id)
      const updatedItem = { ...item, featureString: trimmed }
      setTimeout(() => {
        validateBasketItems([updatedItem], ({ id: vid, result }) => {
          setItems((cur) => cur.map((i) => i.id !== vid ? i : {
            ...i,
            validationStatus: result.valid ? 'passed' : 'failed',
            validationError: result.error,
            productName: result.valid ? result.productName : null,
            listPrice: i.listPrice || result.price || 0,
          }))
        })
      }, 0)
      return updated
    })
  }, [])

  const moveItem = useCallback((fromIndex, toIndex) => {
    setItems((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.length || toIndex < 0 || toIndex >= prev.length) {
        return prev
      }
      const next = [...prev]
      const [item] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, item)
      return next
    })
  }, [])

  // Trigger API lookups for any item whose lookupStatus is 'idle'
  useEffect(() => {
    const pending = items.filter(
      (i) => i.lookupStatus === 'idle' && !lookedUp.current.has(i.id)
    )
    if (!pending.length) return

    // Mark as loading immediately
    const pendingIds = new Set(pending.map((i) => i.id))
    setItems((prev) =>
      prev.map((i) => (pendingIds.has(i.id) ? { ...i, lookupStatus: 'loading' } : i))
    )

    // Fire individual lookups
    for (const item of pending) {
      lookedUp.current.add(item.id)

      lookupItem(item.articleCode, item.featureString).then(({ found, productName, listPrice, networkError }) => {
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== item.id) return i
            if (networkError) {
              return {
                ...i,
                lookupStatus: 'error',
                productName: null,
                listPrice: 0,
                validationIssues: [{ type: 'API_ERROR', message: 'Unable to validate - API offline', severity: 'error' }],
              }
            }
            if (!found) {
              return {
                ...i,
                lookupStatus: 'not-found',
                productName: null,
                listPrice: 0,
                validationIssues: [{ type: 'NOT_FOUND', message: `Product not found: ${i.articleCode}`, severity: 'error' }],
              }
            }
            return { ...i, lookupStatus: 'found', productName, listPrice: listPrice || 0 }
          })
        )
      })
    }
  }, [items])

  return { items, addItems, removeItem, updateQty, copyItem, clearBasket, updateArticleCode, updateFeatureString, moveItem }
}
