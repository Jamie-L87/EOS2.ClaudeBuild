/* Parsing utilities — ported from the EOS_Protypes repo to plain browser JS.
   Functions are attached to window so they can be called from JSX without imports.

   - parseOBX(text)        — XML, returns { items, error? }
   - parseSIF(text)        — Herman Miller OrderPlace text format
   - parseTextInput(text)  — Free-form pasted codes (one per line)
   - parseXLSX(arrayBuffer) — Excel; either parses or returns needsMapping
   - autoDetectColumns / applyColumnMapping — for the ColumnMapper UI

   Items shape: { articleCode, featureString, qty }
*/

/* ========================== OBX ========================== */
function parseOBX(text) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) return { items: [], error: "Invalid OBX file: could not parse XML." };
  } catch {
    return { items: [], error: "Failed to read OBX file." };
  }
  const items = [];
  function extract(node) {
    const artNr = Array.from(node.children).find(c => c.tagName === "artNr" && c.getAttribute("type") === "final");
    if (artNr) {
      const raw = artNr.textContent.trim();
      if (raw) {
        const sp = raw.indexOf(" ");
        const articleCode = sp > 0 ? raw.slice(0, sp) : raw;
        const featureString = sp > 0 ? raw.slice(sp + 1) : "";
        const qtyNode = Array.from(node.children).find(c => c.tagName === "quantity");
        let qty = 1;
        if (qtyNode) {
          for (const attr of qtyNode.attributes) {
            const v = parseInt(attr.value, 10);
            if (!isNaN(v) && v > 0) { qty = v; break; }
          }
          if (qty === 1) {
            const tv = parseInt(qtyNode.textContent.trim(), 10);
            if (!isNaN(tv) && tv > 0) qty = tv;
          }
        }
        if (articleCode) items.push({ articleCode, featureString, qty });
      }
    }
    for (const c of node.children) {
      if (["bskArticle", "usrArticle", "setArticle", "bskFolder"].includes(c.tagName)) extract(c);
    }
  }
  const root = doc.querySelector("cutBuffer > items") || doc.querySelector("items");
  if (!root) return { items: [], error: "No <items> element found in OBX file." };
  for (const c of root.children) extract(c);
  return { items };
}

/* ========================== SIF ========================== */
function parseSIF(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length || !lines[0].startsWith("SF=")) {
    return { items: [], error: 'Invalid SIF file: expected "SF=" on the first line.' };
  }
  const items = [];
  let code = null, feat = "", qty = 1;
  const flush = () => {
    if (code) { items.push({ articleCode: code, featureString: feat, qty }); code = null; feat = ""; qty = 1; }
  };
  for (const line of lines) {
    if (line.startsWith("SF=") || line.startsWith("SL=")) { flush(); continue; }
    if (line.startsWith("PN=")) { flush(); code = line.slice(3).trim(); feat = ""; }
    else if (line.startsWith("ON=")) { feat += line.slice(3).trim(); }
    else if (line.startsWith("QT=")) { const v = parseInt(line.slice(3).trim(), 10); if (!isNaN(v) && v > 0) qty = v; }
  }
  flush();
  return { items };
}

/* ========================== Text paste ========================== */
function parseTextInput(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9][A-Za-z0-9\-_.]{2,})(.*)$/);
    if (!m) continue;
    out.push({ articleCode: m[1], featureString: m[2].trim(), qty: 1 });
  }
  return out;
}

/* ========================== XLSX ========================== */
/* Uses window.XLSX (SheetJS), loaded via <script> in the HTML shell. */
const ARTICLE_CODE_RE = /^[A-Z][A-Z0-9\-_.]{2,}$/i;
const ARTICLE_KW = ["article", "item", "product", "code", "sku", "part no", "ref", "material"];
const QTY_KW    = ["qty", "quantity", "amount", "units", "count"];
const FEAT_KW   = ["feature", "config", "option", "spec", "string"];

function parseXLSX(arrayBuffer) {
  if (typeof XLSX === "undefined") return { items: [], error: "Excel parser not loaded." };
  let workbook;
  try { workbook = XLSX.read(arrayBuffer, { type: "array" }); }
  catch { return { items: [], error: "Could not read the Excel file. Ensure it is a valid .xlsx file." }; }

  const lineSheet = workbook.Sheets["LineItems"];
  if (lineSheet) return parseLineItemsSheet(lineSheet);

  if (workbook.Sheets["Customer Details"]) {
    return { items: [], error: "This is a Customer import template. To import customers, use the Customers page." };
  }

  const sheetData = workbook.SheetNames.map(name => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "" }),
  }));
  return { items: [], needsMapping: true, sheetData };
}

function parseLineItemsSheet(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const items = [];
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    const articleCode = String(row[0] ?? "").trim();
    if (!articleCode) continue;
    const featureString = String(row[1] ?? "").trim();
    const rawQty = row[2];
    const parsedQty = typeof rawQty === "number" ? Math.round(rawQty) : parseInt(String(rawQty), 10);
    const qty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    items.push({ articleCode, featureString, qty });
  }
  return { items };
}

function applyColumnMapping(sheetData, sheetIndex, skipRows, columnRoles) {
  const rows = sheetData[sheetIndex].rows.slice(skipRows);
  const items = [];
  for (const row of rows) {
    let code = "", feat = "", qty = 1;
    for (const [colStr, role] of Object.entries(columnRoles)) {
      const idx = parseInt(colStr, 10);
      const cell = String(row[idx] ?? "").trim();
      if (!cell) continue;
      if (role === "articleAndFeature") {
        const sp = cell.indexOf(" ");
        if (sp > 0) { code = cell.slice(0, sp).trim(); feat = cell.slice(sp + 1).trim(); }
        else code = cell;
      } else if (role === "articleCode") code = cell;
      else if (role === "featureString") feat = feat ? `${feat} ${cell}` : cell;
      else if (role === "qty") { const n = parseFloat(cell); if (!isNaN(n) && n > 0) qty = Math.round(n); }
    }
    if (code.length >= 3) items.push({ articleCode: code, featureString: feat, qty });
  }
  return items;
}

function autoDetectColumns(sheetData, sheetIndex) {
  const rows = sheetData[sheetIndex]?.rows ?? [];
  if (rows.length < 1) return null;
  for (let hRow = 0; hRow <= Math.min(2, rows.length - 2); hRow++) {
    const header = rows[hRow];
    let articleCol = -1, featCol = -1, qtyCol = -1;
    for (let c = 0; c < header.length; c++) {
      const h = String(header[c] ?? "").toLowerCase().trim();
      if (!h) continue;
      if (ARTICLE_KW.some(kw => h.includes(kw))) articleCol = c;
      else if (FEAT_KW.some(kw => h.includes(kw))) featCol = c;
      else if (QTY_KW.some(kw => h.includes(kw))) qtyCol = c;
    }
    if (articleCol === -1) {
      for (let c = 0; c < Math.min(header.length, 8); c++) {
        const matches = rows.slice(hRow + 1, hRow + 7).filter(r => {
          const cell = String(r[c] ?? "").trim();
          return cell && ARTICLE_CODE_RE.test(cell.split(" ")[0]);
        }).length;
        if (matches >= 2) { articleCol = c; break; }
      }
    }
    if (articleCol === -1) continue;

    const hasCombined = rows.slice(hRow + 1, hRow + 7).some(r => {
      const cell = String(r[articleCol] ?? "").trim();
      return cell.includes(" ") && ARTICLE_CODE_RE.test(cell.split(" ")[0]);
    });
    const columnRoles = {};
    if (hasCombined && featCol === -1) columnRoles[articleCol] = "articleAndFeature";
    else { columnRoles[articleCol] = "articleCode"; if (featCol !== -1) columnRoles[featCol] = "featureString"; }
    if (qtyCol !== -1) columnRoles[qtyCol] = "qty";

    const got = applyColumnMapping(sheetData, sheetIndex, hRow + 1, columnRoles);
    if (got.length > 0) return { skipRows: hRow + 1, columnRoles };
  }
  return null;
}

/* ========================== Real product catalog validation ========================== */
/* Uses window.PRODUCT_CATALOG (loaded from product-catalog.js, 99 Herman Miller SKUs).
   Matches the validationService.js logic from the source repo:
   - Article code must exist
   - If a feature string is provided, it must match an existing variant exactly
   - Otherwise, accept the first variant for that article code
*/

function validateItem(articleCode, featureString) {
  const code = String(articleCode || "").trim();
  const feature = String(featureString || "").trim();

  // Super Product check first — these are bundles like Atlas Desk that expand into children.
  if (typeof window !== "undefined" && window.lookupSuper) {
    const sup = window.lookupSuper(code);
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
  }

  const catalog = window.PRODUCT_CATALOG || [];
  const variants = catalog.filter(p => p.articleCode === code);

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
      currency: p.currency || "EUR",
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
      currency: exact.currency || "EUR",
      error: null,
    };
  }

  // Article code exists but feature string doesn't match
  const validFeatures = variants.map(p => p.featureString).filter(Boolean);
  const featureDesc = validFeatures.length > 0
    ? ` Valid: ${validFeatures.slice(0, 2).map(f => `"${f}"`).join(", ")}${validFeatures.length > 2 ? ` (+${validFeatures.length - 2} more)` : ""}`
    : "";

  return {
    valid: false,
    productName: null,
    productLine: variants[0].productLine,
    price: null,
    currency: null,
    error: `Feature string "${feature}" is not a valid configuration for "${code}".${featureDesc}`,
  };
}

async function validateBasketItems(items, onResult) {
  for (const it of items) {
    await new Promise(r => setTimeout(r, 80)); // staggered for visible animation
    onResult({ id: it.id, result: validateItem(it.articleCode, it.featureString) });
  }
}

/* ========================== Expose globals ========================== */
Object.assign(window, {
  parseOBX, parseSIF, parseTextInput,
  parseXLSX, applyColumnMapping, autoDetectColumns,
  validateItem, validateBasketItems,
});
