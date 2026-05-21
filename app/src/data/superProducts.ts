export interface SuperChild {
  articleCode: string;
  featureString: string;
  productCode: string;
  shortDescription: string;
  qty: number;
  listPrice: number;
  currency?: string;
  finishOptions?: string[];
  editableFinish?: boolean;
  id?: string;
  qtyShipped?: number;
}

export interface SuperBomEntry {
  productName: string;
  productLine: string;
  currency: string;
  children: Omit<SuperChild, 'id' | 'qtyShipped'>[];
}

export const SUPER_BOM: Record<string, SuperBomEntry> = {
  'UPXSGA4NN22PPNU.0814RAM': {
    productName: 'Atlas Sit-to-Stand Desk',
    productLine: 'ATLAS',
    currency: 'GBP',
    children: [
      { articleCode: 'UPTAPNN.0814RAM', featureString: 'X1', productCode: 'FR-UP-TP', shortDescription: 'Primary WorkTop / no switch / no access',                              qty: 1, listPrice: 89.68,  finishOptions: ['X1','X2','U1','98'], editableFinish: true  },
      { articleCode: 'UPHS22.14',       featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Single desk stretcher (Out-Out)',                                       qty: 1, listPrice: 98.80,  finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'UPHFF.',          featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Leg Column Foot / freestanding',                                        qty: 2, listPrice: 58.52,  finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'UPHHP.',          featureString: '',   productCode: 'FR-UP-US', shortDescription: 'Hardware Pack / primary',                                               qty: 1, listPrice:  9.12                                                              },
      { articleCode: 'DWEUCX4.',        featureString: '',   productCode: 'FR-ID-US', shortDescription: 'Nevi Standard Control Box',                                             qty: 1, listPrice: 86.26                                                              },
      { articleCode: 'UPHYPR.02',       featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Worktop support',                                                       qty: 1, listPrice: 76.38,  finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'RY3UCP.U',        featureString: '',   productCode: 'FR-RA-US', shortDescription: 'Mains Cable',                                                           qty: 1, listPrice:  8.36                                                              },
      { articleCode: 'UPHLT6.',         featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Leg Column / connecting / standard leg (650––1250)',          qty: 2, listPrice: 331.36, finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'UPHCSQ.',         featureString: '',   productCode: 'FR-UP-US', shortDescription: 'Control switch / Paddle',                                               qty: 1, listPrice: 27.36                                                              },
      { articleCode: 'UPHCN.',          featureString: '',   productCode: 'FR-UP-US', shortDescription: 'Function control motor kit',                                            qty: 1, listPrice: 89.68                                                              },
    ],
  },

  'UPXSGB6NN22PPNU.1014RAM': {
    productName: 'Atlas Sit-to-Stand Desk · 1400×800',
    productLine: 'ATLAS',
    currency: 'GBP',
    children: [
      { articleCode: 'UPTAPNN.1014RAM', featureString: 'X1', productCode: 'FR-UP-TP', shortDescription: 'Primary WorkTop 1400×800 / no switch',                            qty: 1, listPrice: 112.40, finishOptions: ['X1','X2','U1','98'], editableFinish: true  },
      { articleCode: 'UPHS22.14',       featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Single desk stretcher (Out-Out)',                                       qty: 1, listPrice: 98.80,  finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'UPHFF.',          featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Leg Column Foot / freestanding',                                        qty: 2, listPrice: 58.52,  finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'UPHHP.',          featureString: '',   productCode: 'FR-UP-US', shortDescription: 'Hardware Pack / primary',                                               qty: 1, listPrice:  9.12                                                              },
      { articleCode: 'DWEUCX4.',        featureString: '',   productCode: 'FR-ID-US', shortDescription: 'Nevi Standard Control Box',                                             qty: 1, listPrice: 86.26                                                              },
      { articleCode: 'UPHYPR.02',       featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Worktop support',                                                       qty: 1, listPrice: 76.38,  finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'RY3UCP.U',        featureString: '',   productCode: 'FR-RA-US', shortDescription: 'Mains Cable',                                                           qty: 1, listPrice:  8.36                                                              },
      { articleCode: 'UPHLT6.',         featureString: 'G1', productCode: 'FR-UP-US', shortDescription: 'Leg Column / connecting / standard leg',                                qty: 2, listPrice: 331.36, finishOptions: ['G1','MS','BK'],      editableFinish: true  },
      { articleCode: 'UPHCSQ.',         featureString: '',   productCode: 'FR-UP-US', shortDescription: 'Control switch / Paddle',                                               qty: 1, listPrice: 27.36                                                              },
      { articleCode: 'UPHCN.',          featureString: '',   productCode: 'FR-UP-US', shortDescription: 'Function control motor kit',                                            qty: 1, listPrice: 89.68                                                              },
    ],
  },
  'RY3XTDSBNU.G0812SM': {
    productName: 'Ratio Desk / Single with Tray / Electric (650–1250) / SBN / UK',
    productLine: 'RATIO',
    currency: 'GBP',
    children: [
      { articleCode: 'RY3ULESC4.',   featureString: '91', productCode: 'FR-RA-US', shortDescription: 'SS Connecting Legs / adj (650–1250mm)',      qty: 1, listPrice: 234.46, finishOptions: ['91'], editableFinish: true  },
      { articleCode: 'RY3UCP.U',     featureString: '',   productCode: 'FR-RA-US', shortDescription: 'Mains Cable',                                qty: 1, listPrice:   8.36                                               },
      { articleCode: 'RY3UHSW.',     featureString: '91', productCode: 'FR-RA-US', shortDescription: 'Hardware Pack / screen / WM attachment',     qty: 1, listPrice:  44.46, finishOptions: ['91'], editableFinish: true  },
      { articleCode: 'RY3UTSG.08',   featureString: '91', productCode: 'FR-RA-US', shortDescription: 'Pair of Feet with Glides',                   qty: 1, listPrice:  49.78, finishOptions: ['91'], editableFinish: true  },
      { articleCode: 'RY3UCCB.',     featureString: '',   productCode: 'FR-RA-US', shortDescription: 'Control Switch / basic',                     qty: 1, listPrice:  11.02                                               },
      { articleCode: 'RY3UHS.',      featureString: 'ZC', productCode: 'FR-RA-US', shortDescription: 'Hardware Pack / single sided',               qty: 1, listPrice:   7.22, finishOptions: ['ZC'], editableFinish: true  },
      { articleCode: 'RYTRGN.0812SM',featureString: 'X1', productCode: 'FR-RA-TP', shortDescription: 'Rect Worksurface / safety gap / no access',  qty: 1, listPrice:  91.96, finishOptions: ['X1'], editableFinish: true  },
      { articleCode: 'RY3UW.08',     featureString: '91', productCode: 'FR-RA-US', shortDescription: 'Worksurface Support (pair)',                 qty: 1, listPrice:  25.46, finishOptions: ['91'], editableFinish: true  },
      { articleCode: 'RY3UCX4.',     featureString: '',   productCode: 'FR-RA-US', shortDescription: 'Standard Control Box (650–1250mm)',           qty: 1, listPrice:  91.96                                               },
      { articleCode: 'RYUBED.12',    featureString: '',   productCode: 'FR-RA-US', shortDescription: 'E-Beam / Electric / Sit-stand',              qty: 1, listPrice: 155.42                                               },
    ],
  },
  'DWE36AT4YSNBNUN.0812S4MG': {
    productName: 'Nevi SS Desk / Basic switch / UK',
    productLine: 'NEVI',
    currency: 'GBP',
    children: [
      { articleCode: 'DWE3UFR.08G',       featureString: '98',    productCode: 'FR-ID-US', shortDescription: 'SS Feet + hardware pack - Rectangular',    qty: 1, listPrice:  42.18, finishOptions: ['98'],    editableFinish: true  },
      { articleCode: 'DWE3TASNNN.0812S4M', featureString: 'X1 X1', productCode: 'FR-ID-WS', shortDescription: 'Nevi Worktop Rectangle Std (Full Depth)', qty: 1, listPrice:  85.88, finishOptions: ['X1 X1'], editableFinish: true  },
      { articleCode: 'DWE3UCS.12',         featureString: '',      productCode: 'FR-ID-US', shortDescription: 'Standard linear C-beam',                  qty: 1, listPrice:  20.52                                                   },
      { articleCode: 'DWE3UL4.',           featureString: '98',    productCode: 'FR-ID-US', shortDescription: 'Nevi rect leg pack / Extended range',      qty: 1, listPrice: 216.98, finishOptions: ['98'],    editableFinish: true  },
      { articleCode: 'DWE3UW.08',          featureString: '98',    productCode: 'FR-ID-US', shortDescription: 'Worksurface support',                      qty: 1, listPrice:  21.66, finishOptions: ['98'],    editableFinish: true  },
      { articleCode: 'RY3UCCB.',           featureString: '',      productCode: 'FR-RA-US', shortDescription: 'Control Switch / basic',                   qty: 1, listPrice:  11.02                                                   },
      { articleCode: 'RY3UCP.U',           featureString: '',      productCode: 'FR-RA-US', shortDescription: 'Mains Cable',                              qty: 1, listPrice:   8.36                                                   },
    ],
  },

  'MEXXAW.0909S4MG': {
    productName: 'Civic Table Round / Work height 740mm',
    productLine: 'CIVIC',
    currency: 'GBP',
    children: [
      { articleCode: 'METAS.09S4M',  featureString: 'NN X1 X1', productCode: 'FR-CI-TP', shortDescription: 'Civic Round Worktop / single top',            qty: 1, listPrice: 109.82, finishOptions: ['NN X1 X1'], editableFinish: true },
      { articleCode: 'ME2HS.',       featureString: 'X1',        productCode: 'FR-CI-US', shortDescription: 'Civic Spider',                                qty: 1, listPrice:  40.28, finishOptions: ['X1'],       editableFinish: true },
      { articleCode: 'ME2HFDS.G',   featureString: 'X1',        productCode: 'FR-CI-US', shortDescription: 'Civic Feet - Double Foot / Small (x2)',       qty: 1, listPrice:  84.36, finishOptions: ['X1'],       editableFinish: true },
      { articleCode: 'ME2HCSW.G',   featureString: 'X1',        productCode: 'FR-CI-AS', shortDescription: 'Civic Understructure / Single column / 740', qty: 1, listPrice:  69.92, finishOptions: ['X1'],       editableFinish: true },
    ],
  },

  'PEP200.SEMNNUNMNN': {
    productName: 'Bay Work Pod - Pro',
    productLine: 'BAY_WORK_POD',
    currency: 'GBP',
    children: [
      { articleCode: 'RY3UCP.U',     featureString: '',      productCode: 'FR-RA-US', shortDescription: 'Mains Cable',                       qty: 1, listPrice:    8.36                                                    },
      { articleCode: 'PEP750.APMNN', featureString: '98 98', productCode: 'FR-TM-WS', shortDescription: 'Bay Basic Work Pod Work Surface',   qty: 1, listPrice:   24.70, finishOptions: ['98 98'], editableFinish: true  },
      { articleCode: 'PEP500.AP',    featureString: 'TR',    productCode: 'FR-TM-BC', shortDescription: 'Bay Work Pod - Door',                qty: 1, listPrice:  370.12, finishOptions: ['TR'],    editableFinish: true  },
      { articleCode: 'PEP740.NN',    featureString: '',      productCode: 'FR-TM-BC', shortDescription: 'Bay Work Pod Interior Lighting',    qty: 1, listPrice:  160.74                                                    },
      { articleCode: 'PEP720.AP',    featureString: '',      productCode: 'FR-TM-BC', shortDescription: 'Bay Work Pod Assembly Kit',         qty: 1, listPrice:  800.28                                                    },
      { articleCode: 'PEP700.APSE',  featureString: '1HS01', productCode: 'FR-TM-BC', shortDescription: 'Bay Work Pod Panels',               qty: 1, listPrice: 4042.06, finishOptions: ['1HS01'], editableFinish: true  },
      { articleCode: 'AZAE.3U',      featureString: '',      productCode: 'OT-AZ-BC', shortDescription: 'Elite+ Power Strip',                qty: 1, listPrice:   16.72                                                    },
      { articleCode: 'PEP600.AP',    featureString: 'TR',    productCode: 'FR-TM-BC', shortDescription: 'Bay Work Pod - Ceiling',            qty: 1, listPrice:  186.58, finishOptions: ['TR'],    editableFinish: true  },
      { articleCode: 'M1322.U',      featureString: '',      productCode: 'OT-PL',    shortDescription: 'Power Entry Cord',                  qty: 1, listPrice:    9.88                                                    },
    ],
  },
};

export function lookupSuper(articleCode: string) {
  const def = SUPER_BOM[articleCode];
  if (!def) return null;
  const children: SuperChild[] = def.children.map((c, i) => ({
    ...c,
    id: `c-${articleCode}-${i}-${Math.random().toString(36).slice(2, 7)}`,
    qtyShipped: 0,
    currency: def.currency,
  }));
  return {
    isSuper: true,
    productName: def.productName,
    productLine: def.productLine,
    currency: def.currency,
    children,
    listPrice: def.children.reduce((s, c) => s + (c.listPrice ?? 0) * (c.qty ?? 1), 0),
  };
}
