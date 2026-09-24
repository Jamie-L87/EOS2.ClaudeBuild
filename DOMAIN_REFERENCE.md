# EOS 2.0 Prototype - Domain & Architecture Reference

This document captures business logic, domain concepts, and quirks that currently live only in code - not in `CLAUDE.md` (styling/coding conventions) and not in `Analysis/` (which covers a legacy backend and an AI-tooling process doc, see note at the bottom). It's meant as an onboarding reference for anyone new to this prototype.

Scope note: this describes the current React/TS prototype under `app/src/` as it exists today. It will drift as the code changes - treat it as a snapshot, not a spec.

---

## 1. Core domain concepts

### Super products

A **super product** is a top-level sellable article code (e.g. a desk or work pod) that has no catalog price of its own. Instead it's defined in `src/data/superProducts.ts` as a Bill-of-Materials (`SUPER_BOM`): a list of component articles (`SuperChild[]`), each with its own code, feature string, quantity, and price.

- The parent's list price is *computed*, not stored: `sum(child.listPrice x child.qty)` via `lookupSuper`.
- In validation (`src/services/validation.ts`), the super-product BOM is checked **before** the flat product catalog. A code present in both would only ever resolve as a super product.
- Children can carry `finishOptions` / `editableFinish`, implying a per-component finish picker in the UI.
- The BOM currently only covers desks/tables/work pods (Atlas, Ratio, Nevi, Civic, Bay Work Pod) - it does not overlap with the flat catalog by design.
- In the Import basket, a super product can be "exploded" into its component lines (tagged `_explodedSuper` for potential re-collapse).

### Flat product catalog

`src/data/productCatalog.ts` is a flat list of `{articleCode, productLine, productName, featureString, price, currency}`. Each row is one specific configuration (article code + exact feature string) - the same article code can appear multiple times with different feature strings and prices (e.g. AERON entries). Currency defaults to `EUR` if a row doesn't specify one.

### PLC (Product Line Code) and contract discounts

`src/data/contracts.ts` models dealer pricing contracts as a PLC discount table:

- `PRODUCT_LINE_PLCS` maps an internal `productLine` key (e.g. `AERON`) to a real-world PLC string (e.g. `SE-EF`) and display name. PLC is Herman Miller/Knoll's actual product-line coding convention and isn't documented anywhere else in the repo.
- `CONTRACTS` gives each contract (e.g. "Standard Dealer 2025") a discount percentage per PLC.
- `getContractDiscount` looks up by PLC, not by `productLine` directly - a missing or mis-mapped PLC entry silently yields "no discount" rather than an error.

### Price changes (date-based pricing)

`src/data/priceChanges.ts` models price-list changes per product line relative to "today's" catalog price:

- A **future** rate change: once `pricingDate >= effectiveDate`, multiply by `multiplier`.
- A **past** rate change already baked into today's catalog price: an earlier `pricingDate` divides the current price back down by `multiplier` to reconstruct the historical rate.
- Only one non-current rate is modeled per product line - this is a simplified stand-in for a real price-list history, not a general time series.

### Catalogue access (dealer visibility model)

`src/data/catalogueAccess.ts` models which dealers can see which product catalogues:

- `CatalogueRecord` - a named catalogue (product-line set) with a lead time, keyed by an opaque numeric ID. 35 hardcoded catalogues (e.g. "5-day Asia HM Seating", "Nordic Task Seating").
- `CustomerRecord` (dealer/retailer/shop) belongs to a `site` (currency market, e.g. UK/NL/JP), which can differ from its registered `country`. About 1 in 7 seeded customers deliberately get a "neighbour country" instead of the site's home country, to simulate real-world edge cases (e.g. an Irish dealer trading on the UK site). All 320 customers are deterministically seeded from an index, not randomly generated - the list is reproducible.
- Access model: `CatalogueGroup` (named set of catalogue IDs) is assigned to a `CustomerGroup` (named set of dealer IDs) via `CustomerCatalogueGroupAssignment`. A catalogue only becomes visible once `isCatalogueLive(goLiveDate)` is true (a missing go-live date always means "live"). A `DealerCatalogueExclusion` can veto a specific catalogue for one specific dealer regardless of group membership.
- The *effective* access computation (group union, filter by go-live, subtract exclusions) lives only in `CatalogueAccessAdmin.tsx` - it's UI-layer logic, not shared/reusable service logic.
- `wildcardIncludes` implements a bespoke multi-token `*`-glob search (space-separated AND of tokens) used across all the admin search boxes.

---

## 2. Import format cheat sheet

Parsing logic lives in `src/services/parsers.ts`.

### OBX (pCon.planner XML export)

- Walks `<items>` recursively through `bskArticle` / `usrArticle` / `setArticle` / `bskFolder`.
- `artNr[type="final"]` is split on the first space into article code + feature string.
- **Price gotcha**: real pCon exports carry `<itemPrice type="sale" currency=...>` alongside a sibling `type="purchase"` node that holds Herman Miller's cost (not the dealer price) - the parser must avoid the purchase node. EOS 2.0's own round-trip `.eos` export instead writes a bare `<listPrice currency=...>`. Both are handled, sale/listPrice preferred over purchase.
- Quantity is read from the qty node's first numeric attribute, falling back to text content.

### SIF (Herman Miller OrderPlace legacy text format)

Line-based markers: `SF=` / `SL=` (start/end), `PN=` (product code), `ON=` (feature/option, concatenated across repeats), `QT=` (qty), `PL=` (price). Must start with `SF=` or parsing fails outright. Note: the older `Analysis/FILE_IMPORT_ANALYSIS.md` describes a `CN=` (contract number) SIF variant from the legacy backend - the current parser does not implement this.

### XLSX

- Looks for a sheet literally named `LineItems` (data starts at row index 2, skipping 2 header rows) - this is EOS's own re-import template.
- A sheet named `Customer Details` is explicitly detected and rejected with a message redirecting to the Customers page.
- Any other layout triggers `needsMapping`, routing to the manual column-mapper UI.
- Re-imported super-product exports use `└` / `├` prefixed rows for component lines (`SUPER_COMPONENT_RE`) - these are filtered out on reimport because components must be re-fetched from PDM, not read back from the file.

### CSV

Delimiter is sniffed from the first line (`;` vs `,` vs tab), because Excel writes semicolon-delimited CSVs in European locales. CSV is always routed through the column-mapping flow, never parsed as "LineItems" directly.

### Column auto-detection

`autoDetectColumns` scores header keywords rather than using first-match: "strong" article-code keywords (`article`, `sku`, `part no`, `material`, weight 3) vs "weak" (`product`, `code`, `ref`, weight 1), with an explicit exclude list (`plc`, `product line`, `description`, `price`, etc.) - specifically because EOS's own exported column labels ("PLC (Product Line Code)", "Product Name") would otherwise be misdetected as the article-code column on re-import. If no header matches, it falls back to scanning the first few data rows for cells matching an article-code-shaped regex.

### Other import notes

- `MAX_QTY = 99999` - hard quantity cap enforced in `parsers.ts` and again in the Import page UI.
- `validateBasketItems` inserts an artificial 80ms delay per item purely so the "validating..." spinner is visible in the demo - not a real network call.
- Export formats (OBX/CSV/JSON/XLSX) each reconstruct field sets independently rather than sharing a schema.

---

## 3. Known quirks and inconsistencies

Flagging these so they aren't "fixed" by accident, or so a fix is applied consistently everywhere the logic is duplicated:

- **Currency inconsistency**: `src/data/orders.ts`'s `formatMoney` is GBP-only (`£`), while the rest of the app (catalog, contracts, super products) is multi-currency aware.
- **Order value computed twice**: `orderStore.calcValue()` and `OrderDetail.tsx`'s save-draft totals are two independent implementations of the same pricing rule (`sum(qty x unitPrice x (1 - discount/100))`, with super-product parents summing `superChildren` prices). If the pricing rule changes, both need updating.
- **Order status -> tab mapping is a hardcoded map** in `orderStore.ts`: `Completed/Delivered/Invoiced` -> completed, `Archived/Cancelled` -> archived, everything else -> active. A new status string added elsewhere silently falls into "active" unless this map is updated. There's a matching `STATUS_COLOR` map in `orders.ts` for status pill rendering that needs the same treatment.
- **Catalogue access store silently self-heals**: `catalogueAccessStore.sanitize()` runs on every load/save and drops any group/assignment/exclusion referencing IDs no longer in `CATALOGUES`/`CUSTOMERS`, and dedupes go-live dates by catalogue ID (last write wins). Bad or stale data doesn't error, it just quietly disappears.
- **CatalogueAccessAdmin role-gating is not real access control**: it reads `sessionStorage['eos-user-role']`, defaulting to `'Admin'` if unset. This is a UI decoration for the prototype, not enforcement.
- **Stale test fixture**: `Product Data/sample-pricing-anomaly.obx` encodes its price via a bare `<unitPrice>999.99</unitPrice>` tag, which doesn't match anything the current `extractObxPrice()` reads (it only looks for `itemPrice[type=sale]` or `listPrice`). This fixture won't actually trigger a price-mismatch import today.
- **Variant system `-a` suffix is undocumented outside a code comment**: the one registered experiment (`exportPreview` in `src/variants.ts`) is forced to variant B via `?variant=export-preview`, and explicitly forced back to variant A via `?variant=export-preview-a`. No persistence or analytics - it's a manual dev/demo toggle, not a real experimentation framework.
- **Lead-time delivery projection has no holiday calendar**: `OrderDetail.tsx`'s hardcoded `LEAD_TIMES` per product line project a delivery date by skipping weekends only.
- **Draft order numbers are fabricated**: Import's "Create order" generates an order number as `'234' + 7 random digits` - an undocumented convention presumably mimicking a real HM order-number format, not sourced from any backend.

---

## 4. Relationship to existing docs in `Analysis/`

- **`FILE_IMPORT_ANALYSIS.md`** documents a different, older C# backend (`EOSCloud/Classes/FileImport.cs`) - NPOI-based Excel import, PDM lookups, `AddProductToOrder`/`AddSpecialToOrder` fallback logic, and a recommendations/roadmap section. It is **not** a description of this prototype's `parsers.ts`, and the two diverge in places (e.g. the `CN=` SIF variant noted above, or file-size/depth guards that exist in that doc's "critical issues" list but not in the current parser). Treat it as prior art and rationale, not as current-state documentation.
- **`COPILOT_PROMPT_LIBRARY_CLAUDE_MD_ALIGNMENT.md`** is a governance doc about keeping `CLAUDE.md` and `.github/copilot-instructions.md` in sync - not domain/architecture documentation.

---

## 5. Where things live (quick index)

| Concept | File |
|---|---|
| Order data, status/tab/colour maps, persistence | `src/data/orders.ts`, `src/services/orderStore.ts` |
| Flat product catalog | `src/data/productCatalog.ts` |
| Super products (BOM) | `src/data/superProducts.ts` |
| PLC / contract discounts | `src/data/contracts.ts` |
| Price changes over time | `src/data/priceChanges.ts` |
| Catalogue access model + seeded customers | `src/data/catalogueAccess.ts` |
| Catalogue access persistence + sanitize | `src/services/catalogueAccessStore.ts` |
| Article-code / feature-string validation | `src/services/validation.ts` |
| OBX/SIF/XLSX/CSV import and export parsers | `src/services/parsers.ts` |
| A/B variant scaffold | `src/variants.ts`, `src/hooks/useVariant.ts` |
