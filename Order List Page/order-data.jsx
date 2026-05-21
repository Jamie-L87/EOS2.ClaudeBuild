// Sample order data — 25 orders per tab, realistic-feeling for a contract
// furniture dealer using EOS Cloud. Currency = GBP.

const ORDER_TYPES = ["Normal", "Sample", "FOC", "Quick Ship", "Replacement"];
const STATUSES_ACTIVE = ["Confirmed", "In Progress", "Pending", "On Hold"];
const STATUSES_COMPLETED = ["Completed", "Delivered", "Invoiced"];
const STATUSES_ARCHIVED = ["Archived", "Cancelled"];

const CUSTOMERS = [
  "SMC Pneumatics", "Spacecraft Interiors", "Janet Breller", "Tsunami Axis",
  "Northbank Studios", "Ridgeway Partners", "Halcyon Group", "Aria Workspaces",
  "Meridian Health", "Foxglove & Co.", "Beacon Architects", "Levant Holdings",
  "Quayside Bank", "Orbital Labs", "Highline Realty", "Sample",
  "Crestwood Schools", "Pivot Coworking", "Vesper Hotels", "Marlow Legal",
];

const REFERENCES = [
  "SMC Middle Right", "SMC Middle Left", "SMC Lower G", "SMC Upper Floor",
  "Baird Phase 2", "Baird Phase 3", "Company Co. 123", "Northbank HQ Refit",
  "Ridgeway Reception", "Halcyon Boardroom", "Aria Floor 4", "Meridian Lounge",
  "Foxglove Studio", "Beacon Library", "Levant Atrium", "Quayside Pod 3",
  "Orbital Lab Fit-out", "Highline Marketing Suite", "Crestwood Common",
  "Pivot Bermondsey", "Vesper Suite 12", "Marlow Mezzanine", "Tsunami Axis HQ",
  "SMC Sample Set", "Sample — Aeron",
];

const DESCRIPTIONS = [
  "For showroom use only", "Full floor 2 fit-out", "Replacement chairs",
  "Marketing suite refresh", "Standard order — phase 1", "Phase 2 install",
  "Sample chairs for review", "Boardroom + breakouts", "Reception only",
  "Quick ship — urgent", "Replacement units", "Atrium pieces",
  "Bench desks + storage", "Open plan refresh", "Quiet pods",
  "Library reading area", "Mezzanine workstations", "Lounge furniture",
  "Cafe + dining", "Phase 1 — desks", "Phase 2 — chairs",
  "Phase 3 — storage", "Showroom replacement", "Sample evaluation", "—",
];

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pad(n, width) { return String(n).padStart(width, "0"); }

function buildOrders(seed, statusPool) {
  const r = rng(seed);
  const orders = [];
  for (let i = 0; i < 25; i++) {
    const value = Math.round((50 + r() * 400000) / 50) * 50;
    const ref = REFERENCES[Math.floor(r() * REFERENCES.length)];
    const cust = CUSTOMERS[Math.floor(r() * CUSTOMERS.length)];
    const desc = DESCRIPTIONS[Math.floor(r() * DESCRIPTIONS.length)];
    const type = ORDER_TYPES[Math.floor(r() * ORDER_TYPES.length)];
    const status = statusPool[Math.floor(r() * statusPool.length)];
    const day = 1 + Math.floor(r() * 28);
    const month = 1 + Math.floor(r() * 12);
    const year = 2024 + Math.floor(r() * 2);
    const shared = r() > 0.65;
    const me = r() > 0.6;
    const orderNo = "234" + pad(Math.floor(r() * 9999999), 7);
    const poPrefix = r() > 0.5 ? "PO" : "CD";
    const poNo = poPrefix + pad(Math.floor(r() * 99999999), 8) + (r() > 0.5 ? "AC" : "");
    const csNo = "CS" + pad(Math.floor(r() * 99999999), 8);
    orders.push({
      id: `${seed}-${i}`,
      reference: ref,
      description: desc,
      orderNo,
      purchaseOrder: poNo,
      orderValue: value,
      customer: cust,
      orderPlaced: `${pad(day, 2)}/${pad(month, 2)}/${year}`,
      orderPlacedSort: year * 10000 + month * 100 + day,
      status,
      type,
      shared,
      sharedWith: shared ? "3 people" : null,
      mine: me,
      csNo,
    });
  }
  return orders;
}

const ORDERS = {
  active: buildOrders(7, STATUSES_ACTIVE),
  completed: buildOrders(13, STATUSES_COMPLETED),
  archived: buildOrders(21, STATUSES_ARCHIVED),
};

const STATUS_COLOR = {
  "Confirmed":   { fg: "#00816C", bg: "#E7EDEE", dot: "#00816C" },
  "In Progress": { fg: "#28628E", bg: "#DCE7EF", dot: "#28628E" },
  "Pending":    { fg: "#8A6D1E", bg: "#FAF1DA", dot: "#CA9D3D" },
  "On Hold":    { fg: "#A11616", bg: "#FCEAEA", dot: "#DF1F1F" },
  "Completed":  { fg: "#00816C", bg: "#E7EDEE", dot: "#00816C" },
  "Delivered":  { fg: "#00816C", bg: "#E7EDEE", dot: "#00816C" },
  "Invoiced":   { fg: "#28628E", bg: "#DCE7EF", dot: "#28628E" },
  "Archived":   { fg: "#616161", bg: "#EEEEEE", dot: "#9A9A9A" },
  "Cancelled":  { fg: "#A11616", bg: "#FCEAEA", dot: "#DF1F1F" },
};

const CURRENCY = "£";

function formatMoney(n) {
  return CURRENCY + n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

Object.assign(window, { ORDERS, STATUS_COLOR, CURRENCY, formatMoney });
