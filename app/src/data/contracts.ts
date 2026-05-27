/* ------------------------------------------------------------------ */
/*  Product Line Code (PLC) metadata                                   */
/*  Maps internal productLine key → PLC code and display name          */
/* ------------------------------------------------------------------ */
export interface PlcMeta {
  plc: string;
  name: string;
}

export const PRODUCT_LINE_PLCS: Record<string, PlcMeta> = {
  AERON:        { plc: 'SE-EF',    name: 'Aeron'        },
  CAPER:        { plc: 'WC',       name: 'Caper'        },
  COSM:         { plc: 'FC',       name: 'Cosm'         },
  EMBODY:       { plc: 'CN',       name: 'Embody'       },
  LINO:         { plc: 'MI',       name: 'Lino'         },
  SAYL:         { plc: 'JO',       name: 'Sayl'         },
  ZEPH:         { plc: 'BA',       name: 'Zeph'         },
  CIVIC_TABLES: { plc: 'FR-CI',   name: 'Civic Tables' },
  BEVEL:        { plc: 'AM',       name: 'Bevel'        },
  PERCY:        { plc: 'SE-NO-PR', name: 'Percy'        },
  PIPPIN:       { plc: 'SE-NO-PP', name: 'Pippin Chair' },
  RUBY:         { plc: 'SE-NO-RB', name: 'Ruby'         },
  TUN:          { plc: 'SE-NO-TU', name: 'Tun'          },
  SIDEBOARD:    { plc: 'SE-NO-SB', name: 'Sideboard'    },
  RHYME:        { plc: 'SE-NO-RH', name: 'Rhyme'        },
  ALWAYS:       { plc: 'SE-NO-AL', name: 'Always'       },
  ALI:          { plc: 'SE-NO-AT', name: 'Ali'          },
  EVER:         { plc: 'SE-NO-EV', name: 'Ever'         },
  FIN:          { plc: 'SE-NO-FN', name: 'Fin'          },
  FOLD:         { plc: 'SE-NO-FB', name: 'Fold'         },
  HUDSON:       { plc: 'SE-NO-HD', name: 'Hudson'       },
  MIMO:         { plc: 'SE-NO-MM', name: 'Mimo'         },
};

/* ------------------------------------------------------------------ */
/*  Contract types                                                      */
/* ------------------------------------------------------------------ */
export interface ContractLine {
  plc: string;
  productName: string;
  discount: number; // percentage, e.g. 52 = 52%
}

export interface Contract {
  id: string;
  name: string;
  lines: ContractLine[];
}

/* ------------------------------------------------------------------ */
/*  Contracts                                                           */
/* ------------------------------------------------------------------ */
export const CONTRACTS: Contract[] = [
  {
    id: 'standard-2025',
    name: 'Standard Dealer 2025',
    lines: [
      { plc: 'SE-EF',    productName: 'Aeron',        discount: 56 },
      { plc: 'WC',       productName: 'Caper',        discount: 51 },
      { plc: 'FC',       productName: 'Cosm',         discount: 58 },
      { plc: 'CN',       productName: 'Embody',       discount: 57 },
      { plc: 'MI',       productName: 'Lino',         discount: 53 },
      { plc: 'JO',       productName: 'Sayl',         discount: 55 },
      { plc: 'BA',       productName: 'Zeph',         discount: 54 },
      { plc: 'FR-CI',    productName: 'Civic Tables', discount: 49 },
      { plc: 'AM',       productName: 'Bevel',        discount: 46 },
      { plc: 'SE-NO-PR', productName: 'Percy',        discount: 52 },
      { plc: 'SE-NO-PP', productName: 'Pippin Chair', discount: 44 },
      { plc: 'SE-NO-RB', productName: 'Ruby',         discount: 48 },
      { plc: 'SE-NO-TU', productName: 'Tun',          discount: 43 },
      { plc: 'SE-NO-SB', productName: 'Sideboard',    discount: 50 },
      { plc: 'SE-NO-RH', productName: 'Rhyme',        discount: 47 },
      { plc: 'SE-NO-AL', productName: 'Always',       discount: 59 },
      { plc: 'SE-NO-AT', productName: 'Ali',          discount: 42 },
      { plc: 'SE-NO-EV', productName: 'Ever',         discount: 60 },
      { plc: 'SE-NO-FN', productName: 'Fin',          discount: 45 },
      { plc: 'SE-NO-FB', productName: 'Fold',         discount: 41 },
      { plc: 'SE-NO-HD', productName: 'Hudson',       discount: 40 },
      { plc: 'SE-NO-MM', productName: 'Mimo',         discount: 61 },
    ],
  },
  {
    id: 'preferred-2025',
    name: 'Preferred Partner 2025',
    lines: [
      { plc: 'SE-EF',    productName: 'Aeron',        discount: 66 },
      { plc: 'WC',       productName: 'Caper',        discount: 61 },
      { plc: 'FC',       productName: 'Cosm',         discount: 68 },
      { plc: 'CN',       productName: 'Embody',       discount: 67 },
      { plc: 'MI',       productName: 'Lino',         discount: 63 },
      { plc: 'JO',       productName: 'Sayl',         discount: 65 },
      { plc: 'BA',       productName: 'Zeph',         discount: 64 },
      { plc: 'FR-CI',    productName: 'Civic Tables', discount: 59 },
      { plc: 'AM',       productName: 'Bevel',        discount: 56 },
      { plc: 'SE-NO-PR', productName: 'Percy',        discount: 62 },
      { plc: 'SE-NO-PP', productName: 'Pippin Chair', discount: 54 },
      { plc: 'SE-NO-RB', productName: 'Ruby',         discount: 58 },
      { plc: 'SE-NO-TU', productName: 'Tun',          discount: 53 },
      { plc: 'SE-NO-SB', productName: 'Sideboard',    discount: 60 },
      { plc: 'SE-NO-RH', productName: 'Rhyme',        discount: 57 },
      { plc: 'SE-NO-AL', productName: 'Always',       discount: 69 },
      { plc: 'SE-NO-AT', productName: 'Ali',          discount: 52 },
      { plc: 'SE-NO-EV', productName: 'Ever',         discount: 70 },
      { plc: 'SE-NO-FN', productName: 'Fin',          discount: 55 },
      { plc: 'SE-NO-FB', productName: 'Fold',         discount: 51 },
      { plc: 'SE-NO-HD', productName: 'Hudson',       discount: 50 },
      { plc: 'SE-NO-MM', productName: 'Mimo',         discount: 71 },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Look up the discount for a given PLC within a contract. Returns null if not found. */
export function getContractDiscount(contract: Contract, plc: string): number | null {
  return contract.lines.find(l => l.plc === plc)?.discount ?? null;
}

/** Get a Contract by id. */
export function findContract(id: string): Contract | null {
  return CONTRACTS.find(c => c.id === id) ?? null;
}
