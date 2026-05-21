/* Super Product BOMs — when a parent SKU is added, EOS2 expands it into
   constituent children (worktop, legs, hardware, motor kit, etc.).
   Static mock for the prototype; in production this comes from the real catalogue.

   Lookup shape:
     window.SUPER_BOM[parentCode] = {
       productName, productLine, currency,
       children: [{
         articleCode, featureString, productCode, shortDescription,
         qty, listPrice, finishOptions, editableFinish
       }]
     }
*/

window.SUPER_BOM = {
  // Atlas Sit-to-Stand Desk (the example the user shared)
  "UPXSGA4NN22PPNU.0814RAM": {
    productName: "Atlas Sit-to-Stand Desk",
    productLine: "ATLAS",
    currency: "GBP",
    children: [
      { articleCode: "UPTAPNN.0814RAM", featureString: "X1", productCode: "FR-UP-TP", shortDescription: "Primary WorkTop / no switch / no access", qty: 1, listPrice: 89.68, finishOptions: ["X1","X2","U1","98"], editableFinish: true },
      { articleCode: "UPHS22.14",       featureString: "G1", productCode: "FR-UP-US", shortDescription: "Single desk stretcher (Out-Out)", qty: 1, listPrice: 98.80, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "UPHFF.",          featureString: "G1", productCode: "FR-UP-US", shortDescription: "Leg Column Foot / freestanding",   qty: 2, listPrice: 58.52, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "UPHHP.",          featureString: "",   productCode: "FR-UP-US", shortDescription: "Hardware Pack / primary",          qty: 1, listPrice:  9.12 },
      { articleCode: "DWEUCX4.",        featureString: "",   productCode: "FR-ID-US", shortDescription: "Nevi Standard Control Box",        qty: 1, listPrice: 86.26 },
      { articleCode: "UPHYPR.02",       featureString: "G1", productCode: "FR-UP-US", shortDescription: "Worktop support",                  qty: 1, listPrice: 76.38, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "RY3UCP.U",        featureString: "",   productCode: "FR-RA-US", shortDescription: "Mains Cable",                      qty: 1, listPrice:  8.36 },
      { articleCode: "UPHLT6.",         featureString: "G1", productCode: "FR-UP-US", shortDescription: "Leg Column / connecting / standard leg (650 – 1250)", qty: 2, listPrice: 331.36, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "UPHCSQ.",         featureString: "",   productCode: "FR-UP-US", shortDescription: "Control switch / Paddle",         qty: 1, listPrice: 27.36 },
      { articleCode: "UPHCN.",          featureString: "",   productCode: "FR-UP-US", shortDescription: "Function control motor kit",      qty: 1, listPrice: 89.68 },
    ],
  },

  // A second mock super product so we can see the pattern repeat
  "UPXSGB6NN22PPNU.1014RAM": {
    productName: "Atlas Sit-to-Stand Desk · 1400×800",
    productLine: "ATLAS",
    currency: "GBP",
    children: [
      { articleCode: "UPTAPNN.1014RAM", featureString: "X1", productCode: "FR-UP-TP", shortDescription: "Primary WorkTop 1400×800 / no switch", qty: 1, listPrice: 112.40, finishOptions: ["X1","X2","U1","98"], editableFinish: true },
      { articleCode: "UPHS22.14",       featureString: "G1", productCode: "FR-UP-US", shortDescription: "Single desk stretcher (Out-Out)", qty: 1, listPrice: 98.80, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "UPHFF.",          featureString: "G1", productCode: "FR-UP-US", shortDescription: "Leg Column Foot / freestanding",  qty: 2, listPrice: 58.52, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "UPHHP.",          featureString: "",   productCode: "FR-UP-US", shortDescription: "Hardware Pack / primary",         qty: 1, listPrice:  9.12 },
      { articleCode: "DWEUCX4.",        featureString: "",   productCode: "FR-ID-US", shortDescription: "Nevi Standard Control Box",       qty: 1, listPrice: 86.26 },
      { articleCode: "UPHYPR.02",       featureString: "G1", productCode: "FR-UP-US", shortDescription: "Worktop support",                 qty: 1, listPrice: 76.38, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "RY3UCP.U",        featureString: "",   productCode: "FR-RA-US", shortDescription: "Mains Cable",                     qty: 1, listPrice:  8.36 },
      { articleCode: "UPHLT6.",         featureString: "G1", productCode: "FR-UP-US", shortDescription: "Leg Column / connecting / standard leg", qty: 2, listPrice: 331.36, finishOptions: ["G1","MS","BK"], editableFinish: true },
      { articleCode: "UPHCSQ.",         featureString: "",   productCode: "FR-UP-US", shortDescription: "Control switch / Paddle",         qty: 1, listPrice: 27.36 },
      { articleCode: "UPHCN.",          featureString: "",   productCode: "FR-UP-US", shortDescription: "Function control motor kit",      qty: 1, listPrice: 89.68 },
    ],
  },
};

/* Helper: given a parent code, return { isSuper, parent, children }.
   Children carry a generated id so they survive edits in the UI. */
window.lookupSuper = function lookupSuper(articleCode) {
  const def = window.SUPER_BOM[articleCode];
  if (!def) return null;
  return {
    isSuper: true,
    productName: def.productName,
    productLine: def.productLine,
    currency: def.currency || "EUR",
    children: def.children.map((c, i) => ({
      ...c,
      id: `c-${articleCode}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      qtyShipped: 0,
      currency: def.currency || "EUR",
    })),
    // List price = sum of children × their stored qty (this is for parent display only)
    listPrice: def.children.reduce((s, c) => s + (c.listPrice || 0) * (c.qty || 1), 0),
  };
};
